import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_LANGUAGE_SHORTCUTS, LANGUAGES } from '../shared/constants'
import { queryActiveTab, runtimeSendMessage } from '../shared/chrome'
import type { RuntimeMessage } from '../shared/messages'
import type {
  DisplayMode,
  ExtensionSettings,
  PageTranslationState,
  ProviderConfig,
  SiteRule,
  TabContext,
} from '../shared/types'
import {
  applyDefaultTranslationPreferences,
  resolveActiveProviderDraft,
  resolvePopupProviderId,
} from './providerState'
import {
  normalizeQuickWidgetMode,
  resolvePagePhase,
} from './uiState'

type BusyAction =
  | 'translate'
  | 'restore'
  | 'rule-always'
  | 'rule-never'
  | 'save-provider'
  | 'refresh-models'
  | 'test-provider'
  | 'save-defaults'
  | 'widget'
  | 'open-settings'
  | null

type PopupCard = 'page' | 'translate' | 'provider'

function isErrorResponse(
  response: { ok: boolean; error?: string },
): response is { ok: false; error: string } {
  return response.ok === false
}

function badgeText(rule: SiteRule | null) {
  if (!rule) {
    return '当前站点未记住规则'
  }

  if (rule.mode === 'always') {
    return '此站点将自动翻译'
  }

  if (rule.mode === 'manual') {
    return '此站点仅手动触发'
  }

  return '此站点已设为不自动翻译'
}

function getModelChoices(provider: ProviderConfig | null) {
  if (!provider) {
    return []
  }

  return Array.from(
    new Set([provider.selectedModel, ...provider.models, ...provider.fallbackModels].filter(Boolean)),
  )
}

function renderBusyContent(isBusy: boolean, idleLabel: string, busyLabel: string) {
  return (
    <span className="button-inner">
      {isBusy ? <span className="button-spinner" aria-hidden="true" /> : null}
      <span>{isBusy ? busyLabel : idleLabel}</span>
    </span>
  )
}

function pageFallbackStatus(pageState: PageTranslationState | null) {
  if (pageState?.statusMessage) {
    return pageState.statusMessage
  }

  if (pageState?.translated) {
    return `翻译完成，共处理 ${pageState.blockCount} 段。`
  }

  if (pageState?.isTranslating) {
    return '正在翻译当前页面…'
  }

  return '点一下“翻译此页”，右侧小按钮也能直接翻。'
}

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null)
  const [providerDraft, setProviderDraft] = useState<ProviderConfig | null>(null)
  const [activeTabId, setActiveTabId] = useState<number | null>(null)
  const [activeUrl, setActiveUrl] = useState('')
  const [tabContext, setTabContext] = useState<TabContext | null>(null)
  const [pageState, setPageState] = useState<PageTranslationState | null>(null)
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('zh-CN')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('bilingual')
  const [status, setStatus] = useState('先填写 Key，然后测试连通。')
  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [activeCard, setActiveCard] = useState<PopupCard>('page')
  const selectedProviderIdRef = useRef<string | null>(null)

  const activeProvider = useMemo(
    () => settings?.providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [selectedProviderId, settings],
  )
  const modelChoices = useMemo(() => getModelChoices(providerDraft ?? activeProvider), [
    activeProvider,
    providerDraft,
  ])
  const pagePhase = useMemo(
    () => resolvePagePhase(pageState, busyAction === 'translate'),
    [busyAction, pageState],
  )
  const widgetMode = useMemo(
    () => normalizeQuickWidgetMode(pageState?.floatingWidgetMode ?? settings?.floatingWidgetMode),
    [pageState?.floatingWidgetMode, settings?.floatingWidgetMode],
  )
  const currentRule = tabContext?.matchingRule ?? null
  const isTranslationInFlight = busyAction === 'translate' || Boolean(pageState?.isTranslating)
  const isBlockingBusy = busyAction !== null && busyAction !== 'translate'
  const pageBusy = busyAction === 'translate'
  const widgetEnabled = widgetMode !== 'off'

  useEffect(() => {
    selectedProviderIdRef.current = selectedProviderId
  }, [selectedProviderId])

  const loadState = useCallback(async (options?: { preserveStatus?: boolean }) => {
    const settingsResponse = await runtimeSendMessage<
      { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
    >({
      type: 'GET_SETTINGS',
    })

    if (isErrorResponse(settingsResponse)) {
      setStatus(settingsResponse.error)
      return
    }

    const nextSettings = settingsResponse.settings
    const tab = await queryActiveTab()

    setSettings(nextSettings)

    if (!tab?.id || !tab.url) {
      setStatus('当前标签页不可用，请切到普通网页再试。')
      return
    }

    setActiveTabId(tab.id)
    setActiveUrl(tab.url)

    const [contextResponse, pageResponse] = await Promise.all([
      runtimeSendMessage<
        { ok: true; tabContext: TabContext } | { ok: false; error: string }
      >({
        type: 'GET_TAB_CONTEXT',
        tabId: tab.id,
        url: tab.url,
      }),
      runtimeSendMessage<
        { ok: true; pageState: PageTranslationState } | { ok: false; error: string }
      >({
        type: 'GET_PAGE_STATE',
        tabId: tab.id,
      }),
    ])

    if (!isErrorResponse(contextResponse)) {
      setTabContext(contextResponse.tabContext)
    }

    if (!isErrorResponse(pageResponse)) {
      const nextPageState = pageResponse.pageState
      const nextProviderId = resolvePopupProviderId({
        settings: nextSettings,
        currentSelection: selectedProviderIdRef.current,
        pageState: nextPageState,
      })

      setPageState(nextPageState)
      setSelectedProviderId(nextProviderId)
      setProviderDraft(
        nextSettings.providers.find(
          (provider) => provider.id === nextProviderId,
        ) ?? nextSettings.providers[0],
      )
      setSourceLang(
        nextPageState.translated && nextPageState.sourceLang
          ? nextPageState.sourceLang
          : nextSettings.defaultSourceLang,
      )
      setTargetLang(
        nextPageState.translated && nextPageState.targetLang
          ? nextPageState.targetLang
          : nextSettings.defaultTargetLang,
      )
      setDisplayMode(
        nextPageState.translated
        && nextPageState.displayMode !== 'original'
          ? nextPageState.displayMode
          : nextSettings.defaultDisplayMode,
      )

      if (!options?.preserveStatus) {
        setStatus(pageFallbackStatus(nextPageState))
      }
      return
    }

    const nextProviderId = resolvePopupProviderId({
      settings: nextSettings,
      currentSelection: selectedProviderIdRef.current,
      pageState: null,
    })

    setPageState(null)
    setSelectedProviderId(nextProviderId)
    setProviderDraft(
      nextSettings.providers.find(
        (provider) => provider.id === nextProviderId,
      ) ?? nextSettings.providers[0],
    )
    setSourceLang(nextSettings.defaultSourceLang)
    setTargetLang(nextSettings.defaultTargetLang)
    setDisplayMode(nextSettings.defaultDisplayMode)

    if (!options?.preserveStatus) {
      setStatus('点一下“翻译此页”，右侧小按钮也能直接翻。')
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadState()
  }, [loadState])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function saveSettings(nextSettings: ExtensionSettings) {
    const response = await runtimeSendMessage<
      { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
    >({
      type: 'SAVE_SETTINGS',
      settings: nextSettings,
    } satisfies RuntimeMessage)

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setSettings(response.settings)
    return response.settings
  }

  async function saveProviderDraft(nextProvider = providerDraft) {
    if (!nextProvider) {
      throw new Error('当前没有可保存的 Provider')
    }

    const response = await runtimeSendMessage<
      { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
    >({
      type: 'SAVE_PROVIDER',
      provider: nextProvider,
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setSettings(response.settings)
    return response.settings
  }

  async function runBusyAction<T>(
    action: Exclude<BusyAction, null>,
    pendingMessage: string,
    work: () => Promise<T>,
  ) {
    setBusyAction(action)
    setStatus(pendingMessage)

    try {
      return await work()
    } finally {
      setBusyAction((current) => (current === action ? null : current))
    }
  }

  async function stopPageTranslationIfNeeded(message = '已停止当前翻译。') {
    if (!activeTabId || !isTranslationInFlight) {
      return false
    }

    const response = await runtimeSendMessage<
      { ok: true } | { ok: false; error: string }
    >({
      type: 'RESTORE_PAGE',
      tabId: activeTabId,
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setPageState((current) => (
      current
        ? {
            ...current,
            translated: false,
            displayMode: 'original',
            blockCount: 0,
            isTranslating: false,
            statusMessage: message,
          }
        : current
    ))
    setStatus(message)
    return true
  }

  async function handleTranslate() {
    if (!activeTabId || !settings) {
      return
    }

    if (isTranslationInFlight) {
      try {
        await runBusyAction('restore', '正在停止翻译…', async () => {
          await stopPageTranslationIfNeeded('已停止翻译并恢复原文。')
          await loadState({ preserveStatus: true })
        })
      } catch (error) {
        setStatus(error instanceof Error ? error.message : '停止翻译失败')
      }
      return
    }

    try {
      await runBusyAction('translate', '正在翻译当前页面…', async () => {
        const activeDraft = resolveActiveProviderDraft({
          providerDraft,
          selectedProviderId,
          settings,
        })

        if (!activeDraft) {
          throw new Error('当前 Provider 不存在，请重新选择后再试')
        }

        const settingsWithProvider = await saveProviderDraft(activeDraft)
        await saveSettings(applyDefaultTranslationPreferences({
          settings: settingsWithProvider,
          providerId: selectedProviderId,
          sourceLang,
          targetLang,
          displayMode,
        }))

        const translateResponse = await runtimeSendMessage<
          { ok: true } | { ok: false; error: string }
        >({
          type: 'TRANSLATE_PAGE',
          tabId: activeTabId,
          config: {
            providerId: selectedProviderId,
            sourceLang,
            targetLang,
            displayMode,
          },
        })

        if (isErrorResponse(translateResponse)) {
          throw new Error(translateResponse.error)
        }

        await loadState()
      })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '翻译失败')
    }
  }

  async function handleRestore() {
    if (!activeTabId) {
      return
    }

    try {
      await runBusyAction('restore', '正在恢复原文…', async () => {
        const response = await runtimeSendMessage<
          { ok: true } | { ok: false; error: string }
        >({
          type: 'RESTORE_PAGE',
          tabId: activeTabId,
        })

        if (isErrorResponse(response)) {
          throw new Error(response.error)
        }

        await loadState()
      })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '恢复失败')
    }
  }

  async function handleDisplayModeChange(nextDisplayMode: DisplayMode) {
    setDisplayMode(nextDisplayMode)

    if (!activeTabId) {
      return
    }

    const stoppedTranslation = await stopPageTranslationIfNeeded(
      '已停止当前翻译，下一次会按这个模式显示。',
    )

    if (!pageState?.translated || stoppedTranslation) {
      setStatus('当前页面还没翻译，下一次翻译会按这个模式走。')
      return
    }

    const response = await runtimeSendMessage<
      { ok: true } | { ok: false; error: string }
    >({
      type: 'SET_PAGE_DISPLAY_MODE',
      tabId: activeTabId,
      displayMode: nextDisplayMode,
    })

    if (isErrorResponse(response)) {
      setStatus(response.error)
      return
    }

    setPageState((current) => (
      current
        ? {
            ...current,
            displayMode: nextDisplayMode,
            statusMessage:
              nextDisplayMode === 'translated-only'
                ? '当前页面已切到仅看译文。'
                : '当前页面已切到双语对照。',
          }
        : current
    ))
    setStatus(
      nextDisplayMode === 'translated-only'
        ? '当前页面已切到仅看译文。'
        : '当前页面已切到双语对照。',
    )
  }

  async function handleRefreshModels() {
    if (!providerDraft) {
      return
    }

    try {
      await runBusyAction('refresh-models', '正在拉取模型列表…', async () => {
        await stopPageTranslationIfNeeded('已停止当前翻译，继续刷新模型。')
        await saveProviderDraft()
        const response = await runtimeSendMessage<
          { ok: true; models: string[] } | { ok: false; error: string }
        >({
          type: 'REFRESH_PROVIDER_MODELS',
          providerId: providerDraft.id,
        })

        if (isErrorResponse(response)) {
          throw new Error(response.error)
        }

        setStatus(`模型列表已刷新，共 ${response.models.length} 个。`)
        await loadState({ preserveStatus: true })
      })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '刷新模型失败')
    }
  }

  async function handleTestProvider() {
    if (!providerDraft) {
      return
    }

    try {
      await runBusyAction('test-provider', '正在测试接口连通…', async () => {
        await stopPageTranslationIfNeeded('已停止当前翻译，继续测试接口。')
        await saveProviderDraft()
        const response = await runtimeSendMessage<
          { ok: true; result: { message: string } } | { ok: false; error: string }
        >({
          type: 'TEST_PROVIDER',
          providerId: providerDraft.id,
        })

        if (isErrorResponse(response)) {
          throw new Error(response.error)
        }

        setStatus(response.result.message)
        await loadState({ preserveStatus: true })
      })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '连通测试失败')
    }
  }

  async function handleSaveDefaults() {
    if (!settings) {
      return
    }

    try {
      await runBusyAction('save-defaults', '正在保存默认偏好…', async () => {
        await stopPageTranslationIfNeeded('已停止当前翻译，继续保存默认偏好。')
        const activeDraft = resolveActiveProviderDraft({
          providerDraft,
          selectedProviderId,
          settings,
        })

        if (!activeDraft) {
          throw new Error('当前 Provider 不存在，请重新选择后再试')
        }

        const settingsWithProvider = await saveProviderDraft(activeDraft)
        await saveSettings(applyDefaultTranslationPreferences({
          settings: settingsWithProvider,
          providerId: selectedProviderId,
          sourceLang,
          targetLang,
          displayMode,
        }))
        setStatus('默认翻译偏好已保存。')
      })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '保存失败')
    }
  }

  async function handleRule(mode: 'always' | 'never') {
    if (!activeTabId || !activeUrl) {
      return
    }

    try {
      await runBusyAction(
        mode === 'always' ? 'rule-always' : 'rule-never',
        mode === 'always' ? '正在保存自动翻译规则…' : '正在保存不翻译规则…',
        async () => {
          await stopPageTranslationIfNeeded('已停止当前翻译，继续保存站点规则。')
          if (mode === 'always' && tabContext?.originPattern && !tabContext.hasPermission) {
            const queueResponse = await runtimeSendMessage<
              { ok: true } | { ok: false; error: string }
            >({
              type: 'QUEUE_AUTO_RULE_FROM_PAGE',
              tabId: activeTabId,
              url: activeUrl,
              config: {
                providerId: selectedProviderId,
                sourceLang,
                targetLang,
                displayMode,
              },
            })

            if (isErrorResponse(queueResponse)) {
              throw new Error(queueResponse.error)
            }

            const granted = await chrome.permissions.request({
              origins: [tabContext.originPattern],
            })

            if (!granted) {
              await runtimeSendMessage<{ ok: true } | { ok: false; error: string }>({
                type: 'CLEAR_PENDING_AUTO_RULE',
              })
              throw new Error('未获得当前站点的自动翻译权限')
            }

            setStatus('站点权限已授权，自动翻译规则会立即生效。')
            await loadState({ preserveStatus: true })
            return
          }

          const response = await runtimeSendMessage<
            { ok: true } | { ok: false; error: string }
          >({
            type: 'UPSERT_RULE_FROM_PAGE',
            tabId: activeTabId,
            url: activeUrl,
            mode,
            config: {
              providerId: selectedProviderId,
              sourceLang,
              targetLang,
              displayMode,
            },
          })

          if (isErrorResponse(response)) {
            throw new Error(response.error)
          }

          setStatus(mode === 'always' ? '此站点已记为自动翻译。' : '此站点已记为不自动翻译。')
          await loadState({ preserveStatus: true })
        },
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '保存规则失败')
    }
  }

  async function handleWidgetModeChange(nextEnabled: boolean) {
    if (!settings) {
      return
    }

    try {
      await runBusyAction(
        'widget',
        nextEnabled ? '正在开启全站常驻一键按钮…' : '正在关闭页面内一键按钮…',
        async () => {
          await stopPageTranslationIfNeeded('已停止当前翻译，继续更新侧边按钮。')
          await saveSettings({
            ...settings,
            floatingWidgetMode: nextEnabled ? 'launcher' : 'off',
          })
          await loadState({ preserveStatus: true })
          setStatus(
            nextEnabled
              ? '页面内一键翻译按钮已开启，打开其他网站也会常驻。'
              : '页面内一键翻译按钮已关闭。',
          )
        },
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '更新页面内按钮失败')
    }
  }

  async function openSettings() {
    try {
      await runBusyAction('open-settings', '正在打开完整设置…', async () => {
        await stopPageTranslationIfNeeded('已停止当前翻译，继续打开设置。')
        await runtimeSendMessage<{ ok: true } | { ok: false; error: string }>({
          type: 'OPEN_OPTIONS_PAGE',
        })
      })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '打开设置失败')
    }
  }

  const pageSummary = pageState?.translated
    ? `已处理 ${pageState.blockCount} 段，当前模式：${
      pageState.displayMode === 'translated-only' ? '仅看译文' : '双语对照'
    }`
    : widgetEnabled
      ? '页面右侧会保留一个一键翻译按钮，点一下就直接翻。'
      : '页面内按钮已关闭，只保留扩展弹窗这一个控制台。'

  const popupTabs: Array<{ id: PopupCard; label: string; hint: string }> = [
    { id: 'page', label: '页面', hint: pageState?.translated ? `${pageState.blockCount} 段` : '一键翻译' },
    { id: 'translate', label: '偏好', hint: displayMode === 'translated-only' ? '仅译文' : '双语' },
    { id: 'provider', label: '接口', hint: activeProvider?.label ?? 'Provider' },
  ]

  return (
    <div className="popup-shell">
      <section className="hero-card brand-card">
        <div className="brand-lockup">
          <img src={chrome.runtime.getURL('icons/icon-128.png')} alt="" aria-hidden="true" />
          <div className="hero-copy">
            <h1>Yifo</h1>
            <p className="hero-summary">AI Translate</p>
          </div>
        </div>
        <div className="hero-side">
          <span className={`hero-badge hero-badge-${pagePhase.badgeTone}`}>{pagePhase.badgeLabel}</span>
          <span className="hero-chip">{(activeProvider?.label ?? selectedProviderId) || 'Provider'}</span>
        </div>
      </section>

      <nav className="card-tabs" aria-label="扩展弹窗分区">
        {popupTabs.map((tab) => (
          <button
            key={tab.id}
            className={activeCard === tab.id ? 'tab-active' : ''}
            type="button"
            onClick={() => setActiveCard(tab.id)}
          >
            <strong>{tab.label}</strong>
            <span>{tab.hint}</span>
          </button>
        ))}
      </nav>

      {activeCard === 'page' ? (
        <section className="panel panel-main card-panel">
          <div className="panel-header">
            <div className="section-title">
              <h2>当前页面</h2>
              <p>{pageFallbackStatus(pageState)}</p>
            </div>
            <span className={`pill ${tabContext?.hasPermission ? 'pill-good' : 'pill-muted'}`}>
              {tabContext?.hasPermission ? '已授权此站点' : '仅当前标签页权限'}
            </span>
          </div>

          <p className="subtle-line subtle-url">{activeUrl || '请切到普通网页标签页'}</p>

          <div className="action-grid action-grid-main">
            <button
              className="primary-button button-span-2"
              onClick={() => void handleTranslate()}
              disabled={!activeTabId || !settings || isBlockingBusy}
              data-busy={pageBusy}
            >
              {renderBusyContent(pageBusy, pagePhase.actionLabel, '停止翻译')}
            </button>
            <button
              className="secondary-button"
              onClick={() => void handleRestore()}
              disabled={!activeTabId || isBlockingBusy}
              data-busy={busyAction === 'restore'}
            >
              {renderBusyContent(busyAction === 'restore', '恢复原文', '恢复中…')}
            </button>
            <button
              className="ghost-button"
              onClick={() => void openSettings()}
              disabled={isBlockingBusy}
              data-busy={busyAction === 'open-settings'}
            >
              {renderBusyContent(busyAction === 'open-settings', '完整设置', '打开中…')}
            </button>
            <button
              className="secondary-button"
              onClick={() => void handleRule('always')}
              disabled={!activeTabId || isBlockingBusy}
              data-busy={busyAction === 'rule-always'}
            >
              {renderBusyContent(busyAction === 'rule-always', '以后总是翻译', '保存中…')}
            </button>
            <button
              className="ghost-button"
              onClick={() => void handleRule('never')}
              disabled={!activeTabId || isBlockingBusy}
              data-busy={busyAction === 'rule-never'}
            >
              {renderBusyContent(busyAction === 'rule-never', '以后不翻译', '保存中…')}
            </button>
          </div>

          <div className="widget-card">
            <div className="widget-copy">
              <strong>侧边一键按钮</strong>
              <span>
                {widgetEnabled
                  ? '常驻开启；小按钮可拖拽、贴边隐藏，点一下直接翻译或恢复。'
                  : '页面内不显示悬浮按钮。'}
              </span>
            </div>
            <div className="widget-switch">
              <button
                className={widgetEnabled ? 'mode-active' : ''}
                onClick={() => void handleWidgetModeChange(true)}
                disabled={isBlockingBusy}
              >
                开启
              </button>
              <button
                className={!widgetEnabled ? 'mode-active' : ''}
                onClick={() => void handleWidgetModeChange(false)}
                disabled={isBlockingBusy}
              >
                关闭
              </button>
            </div>
          </div>

          <div className="status-card">
            <strong>{badgeText(currentRule)}</strong>
            <span>{pageSummary}</span>
          </div>
        </section>
      ) : null}

      {activeCard === 'translate' ? (
        <section className="panel panel-main card-panel">
          <div className="panel-header">
            <div className="section-title">
              <h2>翻译偏好</h2>
              <p>语言、展示模式和快捷方向都放在这里，别拆得满屏都是。</p>
            </div>
            <button
              className="link-button"
              onClick={() => void handleSaveDefaults()}
              disabled={!settings || isBlockingBusy}
              data-busy={busyAction === 'save-defaults'}
            >
              {renderBusyContent(busyAction === 'save-defaults', '保存默认', '保存中…')}
            </button>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>源语言</span>
              <select value={sourceLang} onChange={(event) => setSourceLang(event.target.value)}>
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>目标语言</span>
              <select value={targetLang} onChange={(event) => setTargetLang(event.target.value)}>
                {LANGUAGES.filter((language) => language.value !== 'auto').map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mode-switch">
            <button
              className={displayMode === 'bilingual' ? 'mode-active' : ''}
              onClick={() => void handleDisplayModeChange('bilingual')}
              disabled={isBlockingBusy}
            >
              双语对照
            </button>
            <button
              className={displayMode === 'translated-only' ? 'mode-active' : ''}
              onClick={() => void handleDisplayModeChange('translated-only')}
              disabled={isBlockingBusy}
            >
              仅看译文
            </button>
          </div>

          <div className="shortcut-list">
            {DEFAULT_LANGUAGE_SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut.label}
                className="ghost-button"
                disabled={isBlockingBusy}
                onClick={() => {
                  setSourceLang(shortcut.source)
                  setTargetLang(shortcut.target)
                }}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {activeCard === 'provider' ? (
        <section className="panel panel-provider card-panel">
          <div className="panel-header">
            <div className="section-title">
              <h2>Provider</h2>
              <p>{providerDraft?.lastTestStatus.message ?? '接口、模型和连通测试都在这里。'}</p>
            </div>
            <button
              className="link-button"
              onClick={() => void handleSaveDefaults()}
              disabled={!settings || isBlockingBusy}
              data-busy={busyAction === 'save-defaults'}
            >
              {renderBusyContent(busyAction === 'save-defaults', '保存默认', '保存中…')}
            </button>
          </div>

          <div className="provider-grid">
            <label className="field field-span-2">
              <span>当前 Provider</span>
              <select
                value={selectedProviderId}
                onChange={(event) => {
                  const nextId = event.target.value
                  setSelectedProviderId(nextId)
                  setProviderDraft(
                    settings?.providers.find((provider) => provider.id === nextId) ?? null,
                  )
                }}
              >
                {settings?.providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-span-2">
              <span>Base URL</span>
              <input
                value={providerDraft?.baseUrl ?? ''}
                onChange={(event) =>
                  setProviderDraft((current) =>
                    current
                      ? {
                          ...current,
                          baseUrl: event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>

            <label className="field field-span-2">
              <span>API Key</span>
              <input
                type="password"
                placeholder="sk-..."
                value={providerDraft?.apiKey ?? ''}
                onChange={(event) =>
                  setProviderDraft((current) =>
                    current
                      ? {
                          ...current,
                          apiKey: event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>

            <label className="field field-span-2">
              <span>模型</span>
              <div className="model-stack">
                <select
                  value={providerDraft?.selectedModel ?? ''}
                  onChange={(event) =>
                    setProviderDraft((current) =>
                      current
                        ? {
                            ...current,
                            selectedModel: event.target.value,
                          }
                        : current,
                    )
                  }
                >
                  <option value="">从已同步模型中选择</option>
                  {modelChoices.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="也可以手动输入模型 ID"
                  value={providerDraft?.selectedModel ?? ''}
                  onChange={(event) =>
                    setProviderDraft((current) =>
                      current
                        ? {
                            ...current,
                            selectedModel: event.target.value,
                          }
                        : current,
                    )
                  }
                />
              </div>
              <span>已同步 {modelChoices.length} 个模型，可下拉选择，也可手填。</span>
            </label>
          </div>

          <div className="action-grid compact-grid provider-actions">
            <button
              className="secondary-button"
              onClick={() =>
                void runBusyAction('save-provider', '正在保存 Provider 配置…', async () => {
                  await saveProviderDraft()
                  setStatus(`${providerDraft?.label ?? '当前 Provider'} 配置已保存。`)
                }).catch((error) => {
                  setStatus(error instanceof Error ? error.message : '保存失败')
                })
              }
              disabled={!providerDraft || isBlockingBusy}
              data-busy={busyAction === 'save-provider'}
            >
              {renderBusyContent(busyAction === 'save-provider', '保存配置', '保存中…')}
            </button>
            <button
              className="secondary-button"
              onClick={() => void handleRefreshModels()}
              disabled={!providerDraft || isBlockingBusy}
              data-busy={busyAction === 'refresh-models'}
            >
              {renderBusyContent(busyAction === 'refresh-models', '拉取模型', '拉取中…')}
            </button>
            <button
              className="primary-button"
              onClick={() => void handleTestProvider()}
              disabled={!providerDraft || isBlockingBusy}
              data-busy={busyAction === 'test-provider'}
            >
              {renderBusyContent(busyAction === 'test-provider', '连通测试', '测试中…')}
            </button>
          </div>
        </section>
      ) : null}

      <footer className={`status-footer ${pageBusy ? 'status-footer-busy' : ''}`}>
        <span className="status-dot" aria-hidden="true" />
        <span>{status}</span>
      </footer>
    </div>
  )
}
