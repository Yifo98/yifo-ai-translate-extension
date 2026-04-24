import { describe, expect, it } from 'vitest'
import {
  canFinalizePendingAutoRule,
  canFinalizePendingWidgetSiteAccess,
  isPendingAutoRuleFresh,
} from '../src/shared/pendingAutoRule'
import type { PendingAutoRule } from '../src/shared/types'

function createPendingRule(requestedAt = 1_000): PendingAutoRule {
  return {
    tabId: 42,
    requestedAt,
    rule: {
      id: 'rule_1',
      pattern: 'https://huggingface.co/*',
      enabled: true,
      mode: 'always',
      providerId: 'deepseek',
      sourceLang: 'auto',
      targetLang: 'zh-CN',
      displayMode: 'bilingual',
      createdAt: requestedAt,
      updatedAt: requestedAt,
    },
  }
}

describe('pending auto rule permission flow', () => {
  it('finalizes a fresh pending rule when the granted origin matches', () => {
    const pendingRule = createPendingRule()

    expect(
      canFinalizePendingAutoRule(
        pendingRule,
        ['https://huggingface.co/*'],
        pendingRule.requestedAt + 1_000,
      ),
    ).toBe(true)
  })

  it('treats stale pending rules as expired', () => {
    const pendingRule = createPendingRule()

    expect(isPendingAutoRuleFresh(pendingRule, pendingRule.requestedAt + 5 * 60 * 1000 + 1)).toBe(
      false,
    )
    expect(
      canFinalizePendingAutoRule(
        pendingRule,
        ['https://huggingface.co/*'],
        pendingRule.requestedAt + 5 * 60 * 1000 + 1,
      ),
    ).toBe(false)
  })

  it('finalizes pending widget site access when the granted origin matches', () => {
    expect(
      canFinalizePendingWidgetSiteAccess(
        {
          pattern: 'https://suno.com/*',
          requestedAt: 1_000,
        },
        ['https://suno.com/*'],
        2_000,
      ),
    ).toBe(true)
  })
})
