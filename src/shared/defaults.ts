import { SETTINGS_VERSION } from './constants'
import type { ExtensionSettings, ProviderConfig } from './types'

function buildIdleStatus(message = '尚未测试') {
  return {
    state: 'idle' as const,
    message,
  }
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'glm',
    label: 'GLM Coding Plan',
    presetType: 'glm',
    baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    apiKey: '',
    selectedModel: 'glm-4.5-air',
    models: ['glm-4.5-air', 'glm-4.5', 'glm-4.5-flash'],
    fallbackModels: ['glm-4.5-air', 'glm-4.5', 'glm-4.5-flash'],
    lastTestStatus: buildIdleStatus(),
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    presetType: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    selectedModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    fallbackModels: ['deepseek-chat', 'deepseek-reasoner'],
    lastTestStatus: buildIdleStatus(),
  },
  {
    id: 'custom-openai',
    label: 'OpenAI Compatible',
    presetType: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    selectedModel: '',
    models: [],
    fallbackModels: [],
    lastTestStatus: buildIdleStatus('请填写 Base URL 与 API Key'),
  },
]

export const DEFAULT_SETTINGS: ExtensionSettings = {
  version: SETTINGS_VERSION,
  defaultProviderId: 'deepseek',
  defaultSourceLang: 'auto',
  defaultTargetLang: 'zh-CN',
  defaultDisplayMode: 'bilingual',
  floatingWidgetMode: 'launcher',
  floatingLauncherPosition: {
    side: 'right',
    top: 156,
    collapsed: false,
  },
  widgetSitePatterns: [],
  translationCardStyle: 'edge',
  onboardingComplete: false,
  providers: DEFAULT_PROVIDERS,
  siteRules: [],
}

export function cloneDefaultSettings(): ExtensionSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as ExtensionSettings
}
