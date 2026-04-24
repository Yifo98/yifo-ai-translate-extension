import type { LanguageOption } from './types'

export const SETTINGS_STORAGE_KEY = 'browserTranslatorSettings'
export const PENDING_AUTO_RULE_STORAGE_KEY = 'browserTranslatorPendingAutoRule'
export const PENDING_WIDGET_SITE_ACCESS_STORAGE_KEY = 'browserTranslatorPendingWidgetSiteAccess'
export const SETTINGS_VERSION = 1

export const TOOLBAR_ROOT_ID = 'browser-translator-toolbar'
export const STYLE_ELEMENT_ID = 'browser-translator-style'
export const TRANSLATION_NODE_CLASS = 'browser-translator-target'
export const SOURCE_HIDDEN_CLASS = 'browser-translator-source-hidden'
export const SOURCE_TRACKED_ATTR = 'data-browser-translator-source'
export const SOURCE_HASH_ATTR = 'data-browser-translator-hash'
export const RULE_ID_PREFIX = 'rule'

export const CONTEXT_MENU_IDS = {
  translate: 'browser-translator.translate-page',
  restore: 'browser-translator.restore-page',
  alwaysTranslate: 'browser-translator.always-translate-site',
  neverTranslate: 'browser-translator.never-translate-site',
  openSettings: 'browser-translator.open-settings',
} as const

export const LANGUAGES: LanguageOption[] = [
  { value: 'auto', label: '自动识别' },
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'ru', label: 'Русский' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
]

export const DEFAULT_LANGUAGE_SHORTCUTS = [
  { label: '自动 -> 中文', source: 'auto', target: 'zh-CN' },
  { label: '自动 -> 英文', source: 'auto', target: 'en' },
  { label: '中文 -> 英文', source: 'zh-CN', target: 'en' },
  { label: '英文 -> 中文', source: 'en', target: 'zh-CN' },
] as const

export const TRANSLATION_BATCH_LIMIT = {
  maxSegments: 12,
  maxCharacters: 4200,
}
