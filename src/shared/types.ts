export type ProviderPresetType = 'glm' | 'deepseek' | 'openai-compatible'

export type DisplayMode = 'bilingual' | 'translated-only'

export type SiteRuleMode = 'always' | 'never' | 'manual'

export type ConnectivityState = 'idle' | 'success' | 'error'

export type FloatingWidgetMode = 'panel' | 'launcher' | 'off'

export type TranslationCardStyle = 'edge' | 'glass'

export type FloatingLauncherSide = 'left' | 'right'

export interface FloatingLauncherPosition {
  side: FloatingLauncherSide
  top: number
  collapsed: boolean
}

export interface ProviderStatus {
  state: ConnectivityState
  message: string
  checkedAt?: number
}

export interface ProviderConfig {
  id: string
  label: string
  presetType: ProviderPresetType
  baseUrl: string
  apiKey: string
  selectedModel: string
  models: string[]
  fallbackModels: string[]
  lastTestStatus: ProviderStatus
  lastModelSyncAt?: number
}

export interface SiteRule {
  id: string
  pattern: string
  enabled: boolean
  mode: SiteRuleMode
  providerId: string
  sourceLang: string
  targetLang: string
  displayMode: DisplayMode
  createdAt: number
  updatedAt: number
}

export interface ExtensionSettings {
  version: number
  defaultProviderId: string
  defaultSourceLang: string
  defaultTargetLang: string
  defaultDisplayMode: DisplayMode
  floatingWidgetMode: FloatingWidgetMode
  floatingLauncherPosition: FloatingLauncherPosition
  widgetSitePatterns: string[]
  translationCardStyle: TranslationCardStyle
  onboardingComplete: boolean
  providers: ProviderConfig[]
  siteRules: SiteRule[]
}

export interface LanguageOption {
  value: string
  label: string
}

export interface TranslationRequestPayload {
  providerId: string
  sourceLang: string
  targetLang: string
  segments: string[]
}

export interface ProviderTestResult {
  ok: boolean
  message: string
  models: string[]
}

export interface PageTranslationConfig {
  providerId: string
  sourceLang: string
  targetLang: string
  displayMode: DisplayMode
}

export interface PageTranslationState {
  translated: boolean
  displayMode: DisplayMode | 'original'
  blockCount: number
  currentUrl: string
  isTranslating?: boolean
  statusMessage?: string | null
  toolbarMode?: FloatingWidgetMode
  floatingWidgetMode?: FloatingWidgetMode
  providerId?: string | null
  sourceLang?: string | null
  targetLang?: string | null
}

export interface TabContext {
  url: string
  originPattern: string | null
  matchingRule: SiteRule | null
  hasPermission: boolean
  hasWidgetSiteAccess: boolean
}

export interface PendingAutoRule {
  tabId: number
  rule: SiteRule
  requestedAt: number
}

export interface PendingWidgetSiteAccess {
  pattern: string
  requestedAt: number
}

export interface ExportPayload {
  exportedAt: number
  includeSecrets: boolean
  settings: ExtensionSettings
}
