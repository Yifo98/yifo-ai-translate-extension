import { describe, expect, it } from 'vitest'
import { cloneDefaultSettings } from '../src/shared/defaults'
import type { PageTranslationState } from '../src/shared/types'
import {
  resolveActiveProviderDraft,
  resolvePopupProviderId,
} from '../src/popup/providerState'

function buildPageState(overrides: Partial<PageTranslationState> = {}): PageTranslationState {
  return {
    translated: false,
    displayMode: 'original',
    blockCount: 0,
    currentUrl: 'https://example.com',
    providerId: null,
    sourceLang: null,
    targetLang: null,
    ...overrides,
  }
}

describe('resolvePopupProviderId', () => {
  it('prefers the translated page provider over stale popup state', () => {
    const settings = cloneDefaultSettings()

    settings.defaultProviderId = 'glm'

    expect(
      resolvePopupProviderId({
        settings,
        currentSelection: 'deepseek',
        pageState: buildPageState({
          translated: true,
          providerId: 'glm',
        }),
      }),
    ).toBe('glm')
  })

  it('falls back to the saved default provider when popup selection is empty', () => {
    const settings = cloneDefaultSettings()

    settings.defaultProviderId = 'glm'

    expect(
      resolvePopupProviderId({
        settings,
        currentSelection: '',
        pageState: buildPageState(),
      }),
    ).toBe('glm')
  })
})

describe('resolveActiveProviderDraft', () => {
  it('uses the in-memory draft when it matches the selected provider', () => {
    const settings = cloneDefaultSettings()
    const draft = {
      ...settings.providers[0],
      selectedModel: 'glm-4.5',
    }

    expect(
      resolveActiveProviderDraft({
        providerDraft: draft,
        selectedProviderId: 'glm',
        settings,
      }),
    ).toEqual(draft)
  })
})
