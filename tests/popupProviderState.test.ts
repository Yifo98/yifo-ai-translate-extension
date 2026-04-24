import { describe, expect, it } from 'vitest'
import { cloneDefaultSettings } from '../src/shared/defaults'
import type { PageTranslationState } from '../src/shared/types'
import {
  applyDefaultTranslationPreferences,
  resolveActiveProviderDraft,
  resolvePopupProviderId,
} from '../src/popup/providerState'

describe('popup provider state', () => {
  it('prefers the saved default provider on first load over the hardcoded initial state', () => {
    const settings = {
      ...cloneDefaultSettings(),
      defaultProviderId: 'glm',
    }

    expect(resolvePopupProviderId({
      settings,
      currentSelection: '',
      pageState: null,
    })).toBe('glm')
  })

  it('prefers the translated page provider when the current tab is already translated', () => {
    const settings = {
      ...cloneDefaultSettings(),
      defaultProviderId: 'deepseek',
    }
    const pageState: PageTranslationState = {
      translated: true,
      displayMode: 'bilingual',
      blockCount: 12,
      currentUrl: 'https://example.com',
      providerId: 'glm',
      sourceLang: 'auto',
      targetLang: 'zh-CN',
    }

    expect(resolvePopupProviderId({
      settings,
      currentSelection: 'deepseek',
      pageState,
    })).toBe('glm')
  })

  it('uses the selected provider draft when translating with unsaved edits', () => {
    const settings = cloneDefaultSettings()
    const glm = settings.providers.find((provider) => provider.id === 'glm')

    expect(resolveActiveProviderDraft({
      providerDraft: glm ? { ...glm, apiKey: 'test-key' } : null,
      selectedProviderId: 'glm',
      settings,
    })?.apiKey).toBe('test-key')
  })

  it('keeps the freshly saved provider snapshot when saving defaults', () => {
    const settings = cloneDefaultSettings()
    const glmWithKey = {
      ...settings.providers[0],
      apiKey: 'fresh-glm-key',
      selectedModel: 'glm-4.5-air',
    }
    const settingsWithFreshProvider = {
      ...settings,
      providers: [glmWithKey, ...settings.providers.slice(1)],
    }

    const nextSettings = applyDefaultTranslationPreferences({
      settings: settingsWithFreshProvider,
      providerId: 'glm',
      sourceLang: 'auto',
      targetLang: 'zh-CN',
      displayMode: 'translated-only',
    })

    expect(nextSettings.defaultProviderId).toBe('glm')
    expect(nextSettings.defaultDisplayMode).toBe('translated-only')
    expect(nextSettings.providers.find((provider) => provider.id === 'glm')).toMatchObject({
      apiKey: 'fresh-glm-key',
      selectedModel: 'glm-4.5-air',
    })
  })
})
