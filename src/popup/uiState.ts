import type { FloatingWidgetMode, PageTranslationState } from '../shared/types'

export function normalizeQuickWidgetMode(mode: FloatingWidgetMode | undefined) {
  return mode === 'off' ? 'off' : 'launcher'
}

export function resolvePagePhase(
  pageState: PageTranslationState | null,
  isTranslateBusy: boolean,
) {
  if (isTranslateBusy || pageState?.isTranslating) {
    return {
      badgeLabel: '翻译中',
      badgeTone: 'busy',
      actionLabel: '停止翻译',
    } as const
  }

  if (pageState?.translated) {
    return {
      badgeLabel: '已翻译',
      badgeTone: 'ready',
      actionLabel: '重新翻译',
    } as const
  }

  return {
    badgeLabel: '待翻译',
    badgeTone: 'idle',
    actionLabel: '翻译此页',
  } as const
}
