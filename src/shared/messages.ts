import type {
  DisplayMode,
  ExportPayload,
  ExtensionSettings,
  FloatingLauncherPosition,
  PageTranslationConfig,
  PageTranslationState,
  ProviderConfig,
  ProviderTestResult,
  SiteRule,
  TabContext,
} from './types'

export type RuntimeMessage =
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: ExtensionSettings }
  | { type: 'GET_TAB_CONTEXT'; tabId: number; url: string }
  | { type: 'GET_PAGE_STATE'; tabId: number }
  | { type: 'SAVE_PROVIDER'; provider: ProviderConfig }
  | { type: 'REFRESH_PROVIDER_MODELS'; providerId: string }
  | { type: 'TEST_PROVIDER'; providerId: string }
  | { type: 'TRANSLATE_PAGE'; tabId: number; config: PageTranslationConfig }
  | { type: 'RESTORE_PAGE'; tabId: number }
  | { type: 'SET_PAGE_DISPLAY_MODE'; tabId: number; displayMode: DisplayMode }
  | { type: 'REGISTER_TRANSLATION_SESSION'; config: PageTranslationConfig }
  | { type: 'CLEAR_TRANSLATION_SESSION' }
  | {
      type: 'CONTENT_SYNC_SETTINGS'
      settings: Pick<
        ExtensionSettings,
        'floatingWidgetMode' | 'floatingLauncherPosition' | 'translationCardStyle'
      >
    }
  | { type: 'SAVE_FLOATING_LAUNCHER_POSITION'; position: FloatingLauncherPosition }
  | {
      type: 'UPSERT_RULE_FROM_PAGE'
      tabId: number
      url: string
      mode: 'always' | 'never'
      config: PageTranslationConfig
    }
  | {
      type: 'QUEUE_AUTO_RULE_FROM_PAGE'
      tabId: number
      url: string
      config: PageTranslationConfig
    }
  | { type: 'CLEAR_PENDING_AUTO_RULE' }
  | { type: 'QUEUE_WIDGET_SITE_ACCESS'; pattern: string }
  | { type: 'CLEAR_PENDING_WIDGET_SITE_ACCESS' }
  | { type: 'DELETE_RULE'; ruleId: string }
  | { type: 'UPSERT_RULE'; rule: SiteRule }
  | { type: 'OPEN_OPTIONS_PAGE' }
  | { type: 'EXPORT_SETTINGS'; includeSecrets: boolean }
  | { type: 'IMPORT_SETTINGS'; payload: ExportPayload }
  | {
      type: 'TRANSLATE_SEGMENTS'
      providerId: string
      sourceLang: string
      targetLang: string
      segments: string[]
    }

export type RuntimeResponse =
  | { ok: true; settings: unknown }
  | { ok: true; result: ProviderTestResult }
  | { ok: true; models: string[] }
  | { ok: true; pageState: PageTranslationState }
  | { ok: true; tabContext: TabContext }
  | { ok: true; translations: string[] }
  | { ok: true; payload: ExportPayload }
  | { ok: true }
  | { ok: false; error: string }
