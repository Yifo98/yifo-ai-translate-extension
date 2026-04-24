import {
  PENDING_AUTO_RULE_STORAGE_KEY,
  PENDING_WIDGET_SITE_ACCESS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
} from './constants'
import { cloneDefaultSettings } from './defaults'
import { storageGet, storageRemove, storageSet } from './chrome'
import type {
  ExtensionSettings,
  PendingAutoRule,
  PendingWidgetSiteAccess,
  ProviderConfig,
  SiteRule,
} from './types'

function mergeProvider(existing: ProviderConfig | undefined, incoming: ProviderConfig) {
  return {
    ...incoming,
    ...existing,
    models: existing?.models?.length ? existing.models : incoming.models,
    fallbackModels: existing?.fallbackModels?.length
      ? existing.fallbackModels
      : incoming.fallbackModels,
  }
}

export function mergeSettingsWithDefaults(
  storedSettings: Partial<ExtensionSettings> | undefined,
): ExtensionSettings {
  const defaults = cloneDefaultSettings()

  if (!storedSettings) {
    return defaults
  }

  const providers = defaults.providers.map((provider) =>
    mergeProvider(
      storedSettings.providers?.find((item) => item.id === provider.id),
      provider,
    ),
  )

  const customProviders = storedSettings.providers?.filter(
    (provider) => !providers.some((item) => item.id === provider.id),
  ) ?? []

  return {
    ...defaults,
    ...storedSettings,
    providers: [...providers, ...customProviders],
    floatingLauncherPosition:
      storedSettings.floatingLauncherPosition ?? defaults.floatingLauncherPosition,
    widgetSitePatterns: storedSettings.widgetSitePatterns ?? defaults.widgetSitePatterns,
    siteRules: storedSettings.siteRules ?? defaults.siteRules,
  }
}

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await storageGet<ExtensionSettings>(SETTINGS_STORAGE_KEY)
  const settings = mergeSettingsWithDefaults(stored)

  if (!stored) {
    await saveSettings(settings)
  }

  return settings
}

export async function saveSettings(settings: ExtensionSettings) {
  await storageSet({
    [SETTINGS_STORAGE_KEY]: settings,
  })
}

export async function updateSettings(
  updater: (settings: ExtensionSettings) => ExtensionSettings,
) {
  const current = await getSettings()
  const next = updater(current)
  await saveSettings(next)
  return next
}

export async function updateProvider(
  providerId: string,
  updater: (provider: ProviderConfig) => ProviderConfig,
) {
  return updateSettings((settings) => ({
    ...settings,
    providers: settings.providers.map((provider) =>
      provider.id === providerId ? updater(provider) : provider,
    ),
  }))
}

export async function upsertSiteRule(nextRule: SiteRule) {
  return updateSettings((settings) => {
    const existingIndex = settings.siteRules.findIndex(
      (rule) => rule.id === nextRule.id,
    )
    const siteRules = [...settings.siteRules]

    if (existingIndex >= 0) {
      siteRules[existingIndex] = nextRule
    } else {
      siteRules.push(nextRule)
    }

    return {
      ...settings,
      siteRules,
    }
  })
}

export async function deleteSiteRule(ruleId: string) {
  return updateSettings((settings) => ({
    ...settings,
    siteRules: settings.siteRules.filter((rule) => rule.id !== ruleId),
  }))
}

export async function getPendingAutoRule() {
  return storageGet<PendingAutoRule>(PENDING_AUTO_RULE_STORAGE_KEY)
}

export async function savePendingAutoRule(pendingRule: PendingAutoRule) {
  await storageSet({
    [PENDING_AUTO_RULE_STORAGE_KEY]: pendingRule,
  })
}

export async function clearPendingAutoRule() {
  await storageRemove(PENDING_AUTO_RULE_STORAGE_KEY)
}

export async function getPendingWidgetSiteAccess() {
  return storageGet<PendingWidgetSiteAccess>(PENDING_WIDGET_SITE_ACCESS_STORAGE_KEY)
}

export async function savePendingWidgetSiteAccess(pendingAccess: PendingWidgetSiteAccess) {
  await storageSet({
    [PENDING_WIDGET_SITE_ACCESS_STORAGE_KEY]: pendingAccess,
  })
}

export async function clearPendingWidgetSiteAccess() {
  await storageRemove(PENDING_WIDGET_SITE_ACCESS_STORAGE_KEY)
}
