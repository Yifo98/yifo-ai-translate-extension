import { describe, expect, it } from 'vitest'
import { mergeSettingsWithDefaults } from '../src/shared/storage'

describe('storage settings merge', () => {
  it('preserves stored provider secrets and refreshed models', () => {
    const settings = mergeSettingsWithDefaults({
      providers: [
        {
          id: 'deepseek',
          label: 'DeepSeek',
          presetType: 'deepseek',
          baseUrl: 'https://api.deepseek.com',
          apiKey: 'sk-test',
          selectedModel: 'deepseek-reasoner',
          models: ['deepseek-chat', 'deepseek-reasoner'],
          fallbackModels: ['deepseek-chat', 'deepseek-reasoner'],
          lastTestStatus: {
            state: 'success',
            message: '已刷新 2 个模型',
          },
          lastModelSyncAt: 123456,
        },
      ],
    })

    const deepseek = settings.providers.find((provider) => provider.id === 'deepseek')

    expect(deepseek).toBeDefined()
    expect(deepseek?.apiKey).toBe('sk-test')
    expect(deepseek?.selectedModel).toBe('deepseek-reasoner')
    expect(deepseek?.models).toEqual(['deepseek-chat', 'deepseek-reasoner'])
    expect(deepseek?.lastModelSyncAt).toBe(123456)
  })

  it('fills in default ui preferences for older settings payloads', () => {
    const settings = mergeSettingsWithDefaults({
      defaultProviderId: 'glm',
      defaultTargetLang: 'en',
    })

    expect(settings.defaultProviderId).toBe('glm')
    expect(settings.defaultTargetLang).toBe('en')
    expect(settings.floatingWidgetMode).toBe('launcher')
    expect(settings.floatingLauncherPosition).toEqual({
      side: 'right',
      top: 156,
      collapsed: false,
    })
    expect(settings.widgetSitePatterns).toEqual([])
    expect(settings.translationCardStyle).toBe('edge')
  })

  it('preserves site-level widget access patterns', () => {
    const settings = mergeSettingsWithDefaults({
      widgetSitePatterns: ['https://suno.com/*'],
    })

    expect(settings.widgetSitePatterns).toEqual(['https://suno.com/*'])
  })
})
