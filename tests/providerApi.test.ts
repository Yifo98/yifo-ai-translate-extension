import { describe, expect, it } from 'vitest'
import { cloneDefaultSettings } from '../src/shared/defaults'
import {
  applyUiTranslationFallbacks,
  estimateTranslationMaxTokens,
  extractTranslationsFromContent,
  isRetryableTranslationStatus,
  mapHttpError,
  resolveProviderTimeoutMessage,
  resolveTranslationModelCandidates,
  splitTranslationRequestBatches,
} from '../src/shared/providerApi'

describe('resolveTranslationModelCandidates', () => {
  it('dedupes the selected model and fallback models while keeping order', () => {
    const provider = {
      ...cloneDefaultSettings().providers[0],
      selectedModel: 'glm-4.7',
      fallbackModels: ['glm-4.7', 'glm-4.5-air', 'glm-5-turbo'],
    }

    expect(resolveTranslationModelCandidates(provider)).toEqual([
      'glm-4.7',
      'glm-4.5-air',
      'glm-5-turbo',
    ])
  })
})

describe('translation retry statuses', () => {
  it('treats 429 and 5xx as retryable', () => {
    expect(isRetryableTranslationStatus(429)).toBe(true)
    expect(isRetryableTranslationStatus(503)).toBe(true)
    expect(isRetryableTranslationStatus(401)).toBe(false)
  })

  it('maps 429 to a user-facing throttling message', () => {
    expect(mapHttpError(429)).toBe('请求过于频繁或额度不足')
  })

  it('maps chat completion timeouts to a translation-specific message', () => {
    expect(resolveProviderTimeoutMessage('/chat/completions')).toBe(
      '翻译接口响应超时，请换轻一点的模型或稍后再试',
    )
    expect(resolveProviderTimeoutMessage('/models')).toBe('接口响应超时，请稍后再试')
  })
})

describe('splitTranslationRequestBatches', () => {
  it('splits large requests while preserving order', () => {
    expect(splitTranslationRequestBatches(['a'.repeat(3000), 'b'.repeat(1500), 'c'])).toEqual([
      ['a'.repeat(3000)],
      ['b'.repeat(1500), 'c'],
    ])
  })
})

describe('estimateTranslationMaxTokens', () => {
  it('keeps short UI batches bounded but non-trivial', () => {
    expect(estimateTranslationMaxTokens(['Advanced', 'Search', 'Song Description'])).toBe(256)
  })

  it('caps long batches to a safe output ceiling', () => {
    expect(estimateTranslationMaxTokens(['a'.repeat(4000)])).toBe(4096)
  })
})

describe('extractTranslationsFromContent', () => {
  it('reads translations from fenced JSON', () => {
    expect(
      extractTranslationsFromContent(
        '```json\n{"translations":["高级","搜索"]}\n```',
        2,
      ),
    ).toEqual(['高级', '搜索'])
  })

  it('reads translations from a plain JSON array', () => {
    expect(extractTranslationsFromContent('["高级","搜索"]', 2)).toEqual([
      '高级',
      '搜索',
    ])
  })

  it('falls back to line-based translations when the model ignores JSON', () => {
    expect(extractTranslationsFromContent('1. 高级\n2. 搜索', 2)).toEqual([
      '高级',
      '搜索',
    ])
  })
})

describe('applyUiTranslationFallbacks', () => {
  it('fills in common short UI labels when the model leaves them untranslated', () => {
    expect(
      applyUiTranslationFallbacks(
        {
          providerId: 'deepseek',
          sourceLang: 'en',
          targetLang: 'zh-CN',
          segments: [
            'Advanced',
            'Search',
            'Song Description',
            'Inspiration',
            'Jump Back In',
            'Staff Picks',
            'Invite Friends',
            'Terms of Service',
            'Suno',
          ],
        },
        [
          'Advanced',
          'Search',
          'Song Description',
          'Inspiration',
          'Jump Back In',
          'Staff Picks',
          'Invite Friends',
          'Terms of Service',
          'Suno',
        ],
      ),
    ).toEqual([
      '高级',
      '搜索',
      '歌曲描述',
      '灵感',
      '继续播放',
      '编辑精选',
      '邀请朋友',
      '服务条款',
      'Suno',
    ])
  })

  it('does not override non-Chinese targets or already translated content', () => {
    expect(
      applyUiTranslationFallbacks(
        {
          providerId: 'deepseek',
          sourceLang: 'en',
          targetLang: 'en',
          segments: ['Advanced'],
        },
        ['Advanced'],
      ),
    ).toEqual(['Advanced'])

    expect(
      applyUiTranslationFallbacks(
        {
          providerId: 'deepseek',
          sourceLang: 'en',
          targetLang: 'zh-CN',
          segments: ['Advanced'],
        },
        ['高级'],
      ),
    ).toEqual(['高级'])
  })
})
