import { describe, expect, it } from 'vitest'
import { createOriginPattern, findMatchingRule, matchPattern } from '../src/shared/matchPatterns'
import type { SiteRule } from '../src/shared/types'

const baseRule: SiteRule = {
  id: 'rule-1',
  pattern: 'https://example.com/*',
  enabled: true,
  mode: 'always',
  providerId: 'deepseek',
  sourceLang: 'auto',
  targetLang: 'zh-CN',
  displayMode: 'bilingual',
  createdAt: 1,
  updatedAt: 1,
}

describe('matchPatterns', () => {
  it('creates origin pattern from URL', () => {
    expect(createOriginPattern('https://example.com/docs?id=1')).toBe(
      'https://example.com/*',
    )
  })

  it('matches path within an origin pattern', () => {
    expect(matchPattern('https://example.com/*', 'https://example.com/path/to/page')).toBe(
      true,
    )
  })

  it('prefers never rules over always rules on the same pattern', () => {
    const matched = findMatchingRule('https://example.com/post', [
      baseRule,
      {
        ...baseRule,
        id: 'rule-2',
        mode: 'never',
        updatedAt: 2,
      },
    ])

    expect(matched?.id).toBe('rule-2')
  })
})
