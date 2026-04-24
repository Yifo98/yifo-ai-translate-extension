import { buildExportPayload, mergeImportedSettings } from '../shared/exportImport'
import {
  CONTEXT_MENU_IDS,
  SETTINGS_VERSION,
} from '../shared/constants'
import {
  canFinalizePendingAutoRule,
  canFinalizePendingWidgetSiteAccess,
  isPendingAutoRuleFresh,
  isPendingWidgetSiteAccessFresh,
} from '../shared/pendingAutoRule'
import { providerOriginPattern, fetchProviderModels, testProvider, translateSegments } from '../shared/providerApi'
import {
  createOriginPattern,
  findMatchingRule,
  buildRuleId,
} from '../shared/matchPatterns'
import type { RuntimeMessage, RuntimeResponse } from '../shared/messages'
import type {
  ExtensionSettings,
  PageTranslationConfig,
  PageTranslationState,
  ProviderConfig,
  SiteRule,
  TabContext,
} from '../shared/types'
import {
  clearPendingAutoRule,
  clearPendingWidgetSiteAccess,
  deleteSiteRule,
  getPendingAutoRule,
  getPendingWidgetSiteAccess,
  getSettings,
  savePendingAutoRule,
  savePendingWidgetSiteAccess,
  saveSettings,
  updateSettings,
  updateProvider,
  upsertSiteRule,
} from '../shared/storage'

const tabTranslationSessions = new Map<number, PageTranslationConfig>()

function respond(sendResponse: (response: RuntimeResponse) => void, response: RuntimeResponse) {
  sendResponse(response)
}

async function ensureContentScript(tabId: number) {
  const isReady = await sendMessageToTab<{ ok?: boolean }>(tabId, {
    type: 'CONTENT_PING',
  }).then((response) => response?.ok === true).catch(() => false)

  if (isReady) {
    return
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js'],
  })

  const didBoot = await sendMessageToTab<{ ok?: boolean }>(tabId, {
    type: 'CONTENT_PING',
  }).then((response) => response?.ok === true).catch(() => false)

  if (!didBoot) {
    throw new Error('页面脚本未就绪，请刷新当前页面后再试')
  }
}

async function sendMessageToTab<T>(tabId: number, message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(response as T)
    })
  })
}

function assertTabActionOk(response: { ok?: boolean; error?: string } | undefined) {
  if (response && response.ok === false) {
    throw new Error(response.error || '页面脚本执行失败')
  }
}

async function getPageState(tabId: number): Promise<PageTranslationState> {
  try {
    const settings = await getSettings()
    await ensureContentScript(tabId)
    await syncContentSettings(tabId, settings).catch(() => undefined)
    return await sendMessageToTab<PageTranslationState>(tabId, {
      type: 'CONTENT_GET_PAGE_STATE',
    })
  } catch {
    return {
      translated: false,
      displayMode: 'original',
      blockCount: 0,
      currentUrl: '',
      providerId: null,
      sourceLang: null,
      targetLang: null,
    }
  }
}

async function syncContentSettings(
  tabId: number,
  settings: Pick<
    ExtensionSettings,
    'floatingWidgetMode' | 'floatingLauncherPosition' | 'translationCardStyle'
  >,
) {
  await sendMessageToTab(tabId, {
    type: 'CONTENT_SYNC_SETTINGS',
    settings: {
      floatingWidgetMode: settings.floatingWidgetMode,
      floatingLauncherPosition: settings.floatingLauncherPosition,
      translationCardStyle: settings.translationCardStyle,
    },
  })
}

async function broadcastSettingsSync(
  settings: Pick<
    ExtensionSettings,
    'floatingWidgetMode' | 'floatingLauncherPosition' | 'translationCardStyle'
  >,
) {
  const tabs = await chrome.tabs.query({})

  await Promise.allSettled(
    tabs.map(async (tab) => {
      if (!tab.id) {
        return
      }

      try {
        await syncContentSettings(tab.id, settings)
      } catch {
        // Ignore tabs without our content script.
      }
    }),
  )
}

async function hasOriginPermission(originPattern: string | null) {
  if (!originPattern) {
    return false
  }

  return chrome.permissions.contains({
    origins: [originPattern],
  })
}

async function requestOriginPermission(originPattern: string | null) {
  if (!originPattern) {
    return false
  }

  const granted = await hasOriginPermission(originPattern)

  if (granted) {
    return true
  }

  return chrome.permissions.request({
    origins: [originPattern],
  })
}

function toUserMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '未知错误'

  if (message.includes('This function must be called during a user gesture')) {
    return '当前场景下不能直接弹站点授权。请点扩展弹窗里的“以后总是翻译”，或先在地址栏给 Yifo AI Translate 开启此网站权限。'
  }

  return message
}

function getProvider(settings: Awaited<ReturnType<typeof getSettings>>, providerId: string) {
  const provider = settings.providers.find((item) => item.id === providerId)

  if (!provider) {
    throw new Error('未找到对应的 Provider 配置')
  }

  return provider
}

function requireProviderReady(provider: ProviderConfig) {
  if (!provider.apiKey.trim()) {
    throw new Error(`请先填写 ${provider.label} 的 API Key`)
  }

  if (!(provider.selectedModel || provider.fallbackModels[0])) {
    throw new Error(`请先为 ${provider.label} 选择模型`)
  }
}

function requireProviderApiKey(provider: ProviderConfig) {
  if (!provider.apiKey.trim()) {
    throw new Error(`请先填写 ${provider.label} 的 API Key`)
  }
}

async function ensureProviderPermission(provider: ProviderConfig, shouldRequest: boolean) {
  if (provider.presetType === 'glm' || provider.presetType === 'deepseek') {
    return true
  }

  const originPattern = providerOriginPattern(provider.baseUrl)
  const granted = await hasOriginPermission(originPattern)

  if (granted) {
    return true
  }

  if (!shouldRequest) {
    return false
  }

  return requestOriginPermission(originPattern)
}

async function getTabContext(url: string): Promise<TabContext> {
  const settings = await getSettings()
  const originPattern = createOriginPattern(url)

  return {
    url,
    originPattern,
    matchingRule: findMatchingRule(url, settings.siteRules),
    hasPermission: await hasOriginPermission(originPattern),
    hasWidgetSiteAccess: settings.floatingWidgetMode !== 'off' && Boolean(originPattern),
  }
}

async function startTranslation(tabId: number, config: PageTranslationConfig) {
  const settings = await getSettings()
  await ensureContentScript(tabId)
  await syncContentSettings(tabId, settings)
  const response = await sendMessageToTab<{
    ok: boolean
    error?: string
    translated?: boolean
  }>(tabId, {
    type: 'CONTENT_TRANSLATE_PAGE',
    config,
  })
  assertTabActionOk(response)

  if (response.translated === false) {
    tabTranslationSessions.delete(tabId)
    return
  }

  tabTranslationSessions.set(tabId, config)
}

async function restorePage(tabId: number) {
  await ensureContentScript(tabId)
  const response = await sendMessageToTab<{ ok: boolean; error?: string }>(tabId, {
    type: 'CONTENT_RESTORE_PAGE',
  })
  assertTabActionOk(response)
  tabTranslationSessions.delete(tabId)
}

async function setDisplayMode(tabId: number, displayMode: PageTranslationConfig['displayMode']) {
  const settings = await getSettings()
  await ensureContentScript(tabId)
  await syncContentSettings(tabId, settings)
  const response = await sendMessageToTab<{ ok: boolean; error?: string }>(tabId, {
    type: 'CONTENT_SET_DISPLAY_MODE',
    displayMode,
  })
  assertTabActionOk(response)
  const sessionConfig = tabTranslationSessions.get(tabId)

  if (sessionConfig) {
    tabTranslationSessions.set(tabId, {
      ...sessionConfig,
      displayMode,
    })
  }
}

async function createSiteRuleFromPage(
  url: string,
  mode: 'always' | 'never',
  config: PageTranslationConfig,
): Promise<SiteRule> {
  const now = Date.now()
  const settings = await getSettings()
  const pattern = createOriginPattern(url)

  if (!pattern) {
    throw new Error('当前页面不支持自动规则')
  }

  const existingRule = settings.siteRules.find((rule) => rule.pattern === pattern)

  return {
    id: existingRule?.id ?? buildRuleId(),
    pattern,
    enabled: true,
    mode,
    providerId: config.providerId,
    sourceLang: config.sourceLang,
    targetLang: config.targetLang,
    displayMode: config.displayMode,
    createdAt: existingRule?.createdAt ?? now,
    updatedAt: now,
  }
}

async function queueAutoRuleFromPage(
  tabId: number,
  url: string,
  config: PageTranslationConfig,
) {
  const rule = await createSiteRuleFromPage(url, 'always', config)
  await savePendingAutoRule({
    tabId,
    rule,
    requestedAt: Date.now(),
  })
  return rule
}

async function finalizePendingAutoRule(grantedOrigins: string[]) {
  const pendingRule = await getPendingAutoRule()

  if (!pendingRule) {
    return
  }

  if (!isPendingAutoRuleFresh(pendingRule)) {
    await clearPendingAutoRule()
    return
  }

  if (!canFinalizePendingAutoRule(pendingRule, grantedOrigins)) {
    return
  }

  await upsertSiteRule(pendingRule.rule)
  await clearPendingAutoRule()

  try {
    const tab = await chrome.tabs.get(pendingRule.tabId)

    if (tab.id && tab.url) {
      await maybeAutoTranslateTab(tab.id, tab.url)
    }
  } catch (error) {
    console.error(error)
  }
}

async function finalizePendingWidgetSiteAccess(grantedOrigins: string[]) {
  const pendingAccess = await getPendingWidgetSiteAccess()

  if (!pendingAccess) {
    return
  }

  if (!isPendingWidgetSiteAccessFresh(pendingAccess)) {
    await clearPendingWidgetSiteAccess()
    return
  }

  if (!canFinalizePendingWidgetSiteAccess(pendingAccess, grantedOrigins)) {
    return
  }

  const settings = await getSettings()
  await saveSettings({
    ...settings,
    widgetSitePatterns: Array.from(
      new Set([...settings.widgetSitePatterns, pendingAccess.pattern]),
    ),
  })
  await clearPendingWidgetSiteAccess()
}

async function maybeAutoTranslateTab(tabId: number, tabUrl?: string) {
  if (!tabUrl || !/^https?:/.test(tabUrl)) {
    tabTranslationSessions.delete(tabId)
    return
  }

  const settings = await getSettings()
  const originPattern = createOriginPattern(tabUrl)
  const matchingRule = findMatchingRule(tabUrl, settings.siteRules)

  if (
    settings.floatingWidgetMode !== 'off'
    && await hasOriginPermission(originPattern)
  ) {
    await ensureContentScript(tabId)
    await syncContentSettings(tabId, settings)
  }

  const sessionConfig = tabTranslationSessions.get(tabId)

  if (sessionConfig && matchingRule?.mode !== 'never') {
    try {
      const provider = getProvider(settings, sessionConfig.providerId)

      if (provider.apiKey.trim() && (provider.selectedModel || provider.fallbackModels[0])) {
        await startTranslation(tabId, sessionConfig)
        return
      }
    } catch {
      tabTranslationSessions.delete(tabId)
    }
  }

  if (!matchingRule || matchingRule.mode !== 'always') {
    return
  }

  const permissionGranted = await hasOriginPermission(matchingRule.pattern)

  if (!permissionGranted) {
    return
  }

  const provider = getProvider(settings, matchingRule.providerId)

  if (!provider.apiKey.trim() || !(provider.selectedModel || provider.fallbackModels[0])) {
    return
  }

  await startTranslation(tabId, {
    providerId: matchingRule.providerId,
    sourceLang: matchingRule.sourceLang,
    targetLang: matchingRule.targetLang,
    displayMode: matchingRule.displayMode,
  })
}

async function createContextMenus() {
  await chrome.contextMenus.removeAll()

  chrome.contextMenus.create({
    id: CONTEXT_MENU_IDS.translate,
    title: '翻译当前页面',
    contexts: ['page'],
  })
  chrome.contextMenus.create({
    id: CONTEXT_MENU_IDS.restore,
    title: '恢复原文',
    contexts: ['page'],
  })
  chrome.contextMenus.create({
    id: CONTEXT_MENU_IDS.alwaysTranslate,
    title: '以后总是翻译此站点',
    contexts: ['page'],
  })
  chrome.contextMenus.create({
    id: CONTEXT_MENU_IDS.neverTranslate,
    title: '以后不翻译此站点',
    contexts: ['page'],
  })
  chrome.contextMenus.create({
    id: CONTEXT_MENU_IDS.openSettings,
    title: '打开翻译设置',
    contexts: ['action'],
  })
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const settings = await getSettings()

  if (settings.version !== SETTINGS_VERSION) {
    await saveSettings({
      ...settings,
      version: SETTINGS_VERSION,
    })
  }

  await createContextMenus()

  if (reason === 'install') {
    chrome.runtime.openOptionsPage()
  }
})

chrome.runtime.onStartup.addListener(async () => {
  await createContextMenus()
})

chrome.permissions.onAdded.addListener((permissions) => {
  const origins = permissions.origins ?? []
  void finalizePendingAutoRule(origins)
  void finalizePendingWidgetSiteAccess(origins)
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') {
    return
  }

  await maybeAutoTranslateTab(tabId, tab.url)
})

chrome.tabs.onRemoved.addListener((tabId) => {
  tabTranslationSessions.delete(tabId)
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !tab.url) {
    return
  }

  try {
    const settings = await getSettings()
    const defaultConfig: PageTranslationConfig = {
      providerId: settings.defaultProviderId,
      sourceLang: settings.defaultSourceLang,
      targetLang: settings.defaultTargetLang,
      displayMode: settings.defaultDisplayMode,
    }

    if (info.menuItemId === CONTEXT_MENU_IDS.translate) {
      await startTranslation(tab.id, defaultConfig)
    }

    if (info.menuItemId === CONTEXT_MENU_IDS.restore) {
      await restorePage(tab.id)
    }

    if (info.menuItemId === CONTEXT_MENU_IDS.alwaysTranslate) {
      const rule = await createSiteRuleFromPage(tab.url, 'always', defaultConfig)
      const granted = await requestOriginPermission(rule.pattern)

      if (granted) {
        await upsertSiteRule(rule)
      }
    }

    if (info.menuItemId === CONTEXT_MENU_IDS.neverTranslate) {
      const rule = await createSiteRuleFromPage(tab.url, 'never', defaultConfig)
      await upsertSiteRule(rule)
    }

    if (info.menuItemId === CONTEXT_MENU_IDS.openSettings) {
      chrome.runtime.openOptionsPage()
    }
  } catch (error) {
    console.error(error)
  }
})

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === 'GET_SETTINGS') {
        respond(sendResponse, { ok: true, settings: await getSettings() })
        return
      }

      if (message.type === 'SAVE_SETTINGS') {
        await saveSettings(message.settings)
        await broadcastSettingsSync({
          floatingWidgetMode: message.settings.floatingWidgetMode,
          floatingLauncherPosition: message.settings.floatingLauncherPosition,
          translationCardStyle: message.settings.translationCardStyle,
        })
        respond(sendResponse, { ok: true, settings: message.settings })
        return
      }

      if (message.type === 'SAVE_FLOATING_LAUNCHER_POSITION') {
        const settings = await updateSettings((current) => ({
          ...current,
          floatingLauncherPosition: message.position,
        }))
        await broadcastSettingsSync({
          floatingWidgetMode: settings.floatingWidgetMode,
          floatingLauncherPosition: settings.floatingLauncherPosition,
          translationCardStyle: settings.translationCardStyle,
        })
        respond(sendResponse, { ok: true, settings })
        return
      }

      if (message.type === 'GET_TAB_CONTEXT') {
        respond(sendResponse, {
          ok: true,
          tabContext: await getTabContext(message.url),
        })
        return
      }

      if (message.type === 'GET_PAGE_STATE') {
        respond(sendResponse, {
          ok: true,
          pageState: await getPageState(message.tabId),
        })
        return
      }

      if (message.type === 'SAVE_PROVIDER') {
        const updatedSettings = await updateProvider(message.provider.id, () => ({
          ...message.provider,
        }))
        respond(sendResponse, { ok: true, settings: updatedSettings })
        return
      }

      if (message.type === 'REFRESH_PROVIDER_MODELS') {
        const settings = await getSettings()
        const provider = getProvider(settings, message.providerId)
        requireProviderApiKey(provider)

        const granted = await ensureProviderPermission(provider, true)

        if (!granted) {
          throw new Error('未获得接口域名访问权限')
        }

        const models = await fetchProviderModels(provider)
        const nextSettings = await updateProvider(message.providerId, (current) => ({
          ...current,
          models,
          selectedModel: current.selectedModel || models[0] || current.selectedModel,
          lastModelSyncAt: Date.now(),
          lastTestStatus: {
            state: 'success',
            message: `已刷新 ${models.length} 个模型`,
            checkedAt: Date.now(),
          },
        }))
        respond(sendResponse, { ok: true, models, settings: nextSettings })
        return
      }

      if (message.type === 'TEST_PROVIDER') {
        const settings = await getSettings()
        const provider = getProvider(settings, message.providerId)
        requireProviderApiKey(provider)
        const granted = await ensureProviderPermission(provider, true)

        if (!granted) {
          throw new Error('未获得接口域名访问权限')
        }

        const result = await testProvider(provider)
        await updateProvider(message.providerId, (current) => ({
          ...current,
          models: result.models.length ? result.models : current.models,
          selectedModel:
            current.selectedModel || result.models[0] || current.selectedModel,
          lastModelSyncAt: result.models.length ? Date.now() : current.lastModelSyncAt,
          lastTestStatus: {
            state: result.ok ? 'success' : 'error',
            message: result.message,
            checkedAt: Date.now(),
          },
        }))
        respond(sendResponse, { ok: true, result })
        return
      }

      if (message.type === 'TRANSLATE_PAGE') {
        await startTranslation(message.tabId, message.config)
        respond(sendResponse, { ok: true })
        return
      }

      if (message.type === 'RESTORE_PAGE') {
        await restorePage(message.tabId)
        respond(sendResponse, { ok: true })
        return
      }

      if (message.type === 'SET_PAGE_DISPLAY_MODE') {
        await setDisplayMode(message.tabId, message.displayMode)
        respond(sendResponse, { ok: true })
        return
      }

      if (message.type === 'REGISTER_TRANSLATION_SESSION') {
        const tabId = sender.tab?.id

        if (tabId) {
          tabTranslationSessions.set(tabId, message.config)
        }

        respond(sendResponse, { ok: true })
        return
      }

      if (message.type === 'CLEAR_TRANSLATION_SESSION') {
        const tabId = sender.tab?.id

        if (tabId) {
          tabTranslationSessions.delete(tabId)
        }

        respond(sendResponse, { ok: true })
        return
      }

      if (message.type === 'UPSERT_RULE_FROM_PAGE') {
        const rule = await createSiteRuleFromPage(
          message.url,
          message.mode,
          message.config,
        )

        if (message.mode === 'always') {
          const granted = await hasOriginPermission(rule.pattern)

          if (!granted) {
            throw new Error('请先在扩展弹窗里授权当前站点，再保存自动翻译规则')
          }
        }

        const settings = await upsertSiteRule(rule)
        respond(sendResponse, { ok: true, settings })
        return
      }

      if (message.type === 'QUEUE_AUTO_RULE_FROM_PAGE') {
        const rule = await queueAutoRuleFromPage(message.tabId, message.url, message.config)
        respond(sendResponse, { ok: true, settings: rule })
        return
      }

      if (message.type === 'CLEAR_PENDING_AUTO_RULE') {
        await clearPendingAutoRule()
        respond(sendResponse, { ok: true })
        return
      }

      if (message.type === 'QUEUE_WIDGET_SITE_ACCESS') {
        await savePendingWidgetSiteAccess({
          pattern: message.pattern,
          requestedAt: Date.now(),
        })
        respond(sendResponse, { ok: true })
        return
      }

      if (message.type === 'CLEAR_PENDING_WIDGET_SITE_ACCESS') {
        await clearPendingWidgetSiteAccess()
        respond(sendResponse, { ok: true })
        return
      }

      if (message.type === 'DELETE_RULE') {
        const settings = await deleteSiteRule(message.ruleId)
        respond(sendResponse, { ok: true, settings })
        return
      }

      if (message.type === 'UPSERT_RULE') {
        const settings = await upsertSiteRule(message.rule)
        respond(sendResponse, { ok: true, settings })
        return
      }

      if (message.type === 'OPEN_OPTIONS_PAGE') {
        chrome.runtime.openOptionsPage()
        respond(sendResponse, { ok: true })
        return
      }

      if (message.type === 'EXPORT_SETTINGS') {
        const settings = await getSettings()
        respond(sendResponse, {
          ok: true,
          payload: buildExportPayload(settings, message.includeSecrets),
        })
        return
      }

      if (message.type === 'IMPORT_SETTINGS') {
        const settings = await getSettings()
        const merged = mergeImportedSettings(settings, message.payload)
        await saveSettings(merged)
        await broadcastSettingsSync({
          floatingWidgetMode: merged.floatingWidgetMode,
          floatingLauncherPosition: merged.floatingLauncherPosition,
          translationCardStyle: merged.translationCardStyle,
        })
        respond(sendResponse, { ok: true, settings: merged })
        return
      }

      if (message.type === 'TRANSLATE_SEGMENTS') {
        const settings = await getSettings()
        const provider = getProvider(settings, message.providerId)
        requireProviderReady(provider)

        const granted = await ensureProviderPermission(provider, false)

        if (!granted) {
          throw new Error('当前 Provider 缺少接口域名访问权限，请在弹窗里先执行一次测试')
        }

        const translations = await translateSegments(provider, {
          providerId: message.providerId,
          sourceLang: message.sourceLang,
          targetLang: message.targetLang,
          segments: message.segments,
        })
        respond(sendResponse, { ok: true, translations })
        return
      }

      throw new Error('未处理的消息类型')
    } catch (error) {
      respond(sendResponse, {
        ok: false,
        error: toUserMessage(error),
      })
    }
  })()

  return true
})
