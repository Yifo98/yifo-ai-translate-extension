import type {
  DisplayMode,
  ExtensionSettings,
  PageTranslationState,
  ProviderConfig,
} from '../shared/types'

export function resolvePopupProviderId({
  settings,
  currentSelection,
  pageState,
}: {
  settings: ExtensionSettings
  currentSelection: string | null | undefined
  pageState: PageTranslationState | null
}) {
  const providerIds = new Set(settings.providers.map((provider) => provider.id))

  if (
    pageState?.translated
    && pageState.providerId
    && providerIds.has(pageState.providerId)
  ) {
    return pageState.providerId
  }

  if (currentSelection && providerIds.has(currentSelection)) {
    return currentSelection
  }

  if (providerIds.has(settings.defaultProviderId)) {
    return settings.defaultProviderId
  }

  return settings.providers[0]?.id ?? ''
}

export function resolveActiveProviderDraft({
  providerDraft,
  selectedProviderId,
  settings,
}: {
  providerDraft: ProviderConfig | null
  selectedProviderId: string
  settings: ExtensionSettings
}) {
  if (providerDraft?.id === selectedProviderId) {
    return providerDraft
  }

  return settings.providers.find((provider) => provider.id === selectedProviderId) ?? null
}

export function applyDefaultTranslationPreferences({
  settings,
  providerId,
  sourceLang,
  targetLang,
  displayMode,
}: {
  settings: ExtensionSettings
  providerId: string
  sourceLang: string
  targetLang: string
  displayMode: DisplayMode
}) {
  return {
    ...settings,
    defaultProviderId: providerId,
    defaultSourceLang: sourceLang,
    defaultTargetLang: targetLang,
    defaultDisplayMode: displayMode,
    onboardingComplete: true,
  }
}
