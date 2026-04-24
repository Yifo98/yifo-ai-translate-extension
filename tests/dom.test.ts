import { describe, expect, it } from 'vitest'
import {
  dedupePrioritizedRoots,
  prioritizeCandidatePool,
  resolveContentTitleCandidate,
  resolveInlineCandidatePresentation,
  shouldSkipCompactUiLabel,
  shouldCollectElement,
  shouldSkipDenseChipCandidate,
  shouldSkipInlineText,
  shouldSkipNestedInteractiveText,
  shouldTranslateContentTitle,
  shouldUseOverlayInlineLayout,
} from '../src/content/dom'

describe('content dom inline heuristics', () => {
  it('skips numeric and metadata-like tokens', () => {
    expect(shouldSkipInlineText('10.0k')).toBe(true)
    expect(shouldSkipInlineText('v5.5')).toBe(true)
    expect(shouldSkipInlineText('0/500')).toBe(true)
    expect(shouldSkipInlineText('124 bpm')).toBe(true)
    expect(shouldSkipInlineText('1')).toBe(true)
    expect(shouldSkipInlineText('9968 credits')).toBe(true)
  })

  it('keeps meaningful UI labels translatable', () => {
    expect(shouldSkipInlineText('Filters (3)')).toBe(false)
    expect(shouldSkipInlineText('My Workspace')).toBe(false)
    expect(shouldSkipInlineText('Reset filters')).toBe(false)
    expect(shouldSkipInlineText('Song Description')).toBe(false)
    expect(shouldSkipInlineText('Inspiration')).toBe(false)
  })

  it('skips compact chip labels that would likely break layout', () => {
    expect(shouldSkipCompactUiLabel('rap fast', 56, 32)).toBe(true)
    expect(shouldSkipCompactUiLabel('k-r&b', 46, 32)).toBe(true)
    expect(shouldSkipCompactUiLabel('Filters (3)', 94, 32)).toBe(false)
    expect(shouldSkipCompactUiLabel('Audio', 56, 32)).toBe(false)
    expect(shouldSkipCompactUiLabel('Advanced', 82, 32)).toBe(false)
    expect(shouldSkipCompactUiLabel('Song Description', 96, 32)).toBe(false)
    expect(shouldSkipCompactUiLabel('Most Liked', 88, 32)).toBe(false)
    expect(shouldSkipCompactUiLabel('Hide Disliked', 104, 32)).toBe(false)
    expect(shouldSkipCompactUiLabel('Invite Friends', 96, 32)).toBe(false)
    expect(shouldSkipCompactUiLabel('Terms of Service', 116, 32)).toBe(false)
  })

  it('keeps compact song title links eligible for translation', () => {
    expect(
      shouldTranslateContentTitle({
        href: '/song/c300ad46-daff-4',
        text: 'MISS YOU MORE THAN I SHOULD?',
      }),
    ).toBe(true)

    expect(
      shouldTranslateContentTitle({
        href: 'https://suno.com/song/da2a540f',
        text: 'Just Circling Back',
      }),
    ).toBe(true)

    expect(
      shouldTranslateContentTitle({
        href: '/@aligatie',
        text: 'Ali Gatie',
      }),
    ).toBe(false)
  })

  it('resolves long song titles from accessible link labels', () => {
    expect(
      resolveContentTitleCandidate({
        href: '/song/c300ad46-daff-4',
        textCandidates: ['', null, 'MISS YOU MORE THAN I SHOULD?'],
      }),
    ).toBe('MISS YOU MORE THAN I SHOULD?')

    expect(
      resolveContentTitleCandidate({
        href: '/@aligatie',
        textCandidates: ['MISS YOU MORE THAN I SHOULD?'],
      }),
    ).toBe('')
  })

  it('renders song title translations outside compact links', () => {
    const presentation = resolveInlineCandidatePresentation({
      element: {} as HTMLElement,
      isContentTitle: true,
      text: 'Rude Customers',
    })

    expect(presentation).toEqual({
      canHideSource: true,
      inlineLayout: 'stacked',
      renderMode: 'block',
    })
  })

  it('skips dense chip clusters that are likely to collapse into vertical text', () => {
    expect(
      shouldSkipDenseChipCandidate({
        width: 96,
        height: 32,
        peerCount: 12,
      }),
    ).toBe(true)

    expect(
      shouldSkipDenseChipCandidate({
        width: 132,
        height: 48,
        peerCount: 3,
      }),
    ).toBe(false)
  })

  it('uses overlay layout for compact interactive controls that should not resize', () => {
    expect(
      shouldUseOverlayInlineLayout({
        hasVisualAddon: true,
        height: 32,
        isInteractiveElement: true,
        isOverlaySurface: false,
        text: 'Follow Comfy Org',
        width: 112,
      }),
    ).toBe(true)

    expect(
      shouldUseOverlayInlineLayout({
        hasVisualAddon: false,
        height: 32,
        isInteractiveElement: true,
        isOverlaySurface: false,
        text: 'Advanced',
        width: 84,
      }),
    ).toBe(true)

    expect(
      shouldUseOverlayInlineLayout({
        hasVisualAddon: true,
        height: 32,
        isInteractiveElement: true,
        isOverlaySurface: true,
        text: 'Follow Comfy Org',
        width: 112,
      }),
    ).toBe(false)
  })

  it('skips nested text nodes inside interactive controls', () => {
    expect(
      shouldSkipNestedInteractiveText({
        isSelfInteractive: false,
        hasInteractiveHost: true,
      }),
    ).toBe(true)

    expect(
      shouldSkipNestedInteractiveText({
        isSelfInteractive: true,
        hasInteractiveHost: true,
      }),
    ).toBe(false)

    expect(
      shouldSkipNestedInteractiveText({
        isSelfInteractive: false,
        hasInteractiveHost: false,
      }),
    ).toBe(false)
  })

  it('allows tracked nodes to be recollected during incremental refreshes', () => {
    expect(
      shouldCollectElement({
        includeTracked: false,
        isTracked: true,
      }),
    ).toBe(false)

    expect(
      shouldCollectElement({
        includeTracked: true,
        isTracked: true,
      }),
    ).toBe(true)

    expect(
      shouldCollectElement({
        includeTracked: false,
        isTracked: false,
      }),
    ).toBe(true)
  })

  it('keeps earlier overlay roots even when a later page root contains them', () => {
    const overlay = { id: 'overlay' }
    const main = { id: 'main' }
    const navigation = { id: 'navigation' }

    const contains = (root: { id: string }, candidate: { id: string }) => {
      if (root.id === candidate.id) {
        return true
      }

      return root.id === 'main' && candidate.id === 'overlay'
    }

    expect(
      dedupePrioritizedRoots([overlay, main, navigation, overlay], contains).map(
        (root) => root.id,
      ),
    ).toEqual(['overlay', 'main', 'navigation'])
  })

  it('prioritizes visible untranslated candidates during incremental refreshes', () => {
    const candidates = [
      { id: 'old-above' },
      { id: 'visible-card-title' },
      { id: 'visible-detail-panel' },
      { id: 'far-below' },
    ]

    expect(
      prioritizeCandidatePool({
        candidates,
        limit: 3,
        prioritizeVisible: true,
        isVisibleCandidate: (candidate) => candidate.id.startsWith('visible'),
      }).map((candidate) => candidate.id),
    ).toEqual(['visible-card-title', 'visible-detail-panel', 'old-above'])
  })
})
