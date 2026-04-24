import { describe, expect, it } from 'vitest'
import { normalizeQuickWidgetMode, resolvePagePhase } from '../src/popup/uiState'

describe('popup ui state helpers', () => {
  it('maps the widget setting to quick-toggle choices', () => {
    expect(normalizeQuickWidgetMode('launcher')).toBe('launcher')
    expect(normalizeQuickWidgetMode('panel')).toBe('launcher')
    expect(normalizeQuickWidgetMode('off')).toBe('off')
  })

  it('exposes the correct page phase labels for popup actions', () => {
    expect(resolvePagePhase(null, false)).toEqual({
      badgeLabel: '待翻译',
      badgeTone: 'idle',
      actionLabel: '翻译此页',
    })

    expect(
      resolvePagePhase({
        translated: true,
        displayMode: 'bilingual',
        blockCount: 12,
        currentUrl: 'https://example.com',
      }, false),
    ).toEqual({
      badgeLabel: '已翻译',
      badgeTone: 'ready',
      actionLabel: '重新翻译',
    })

    expect(
      resolvePagePhase({
        translated: false,
        displayMode: 'original',
        blockCount: 0,
        currentUrl: 'https://example.com',
        isTranslating: true,
      }, false),
    ).toEqual({
      badgeLabel: '翻译中',
      badgeTone: 'busy',
      actionLabel: '停止翻译',
    })
  })
})
