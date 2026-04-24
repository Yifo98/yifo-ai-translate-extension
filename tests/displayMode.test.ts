import { describe, expect, it } from 'vitest'
import { resolveSourceVisibilityMode } from '../src/content/displayMode'

describe('content display mode visibility', () => {
  it('hides block sources in translated-only mode when they can be hidden', () => {
    expect(
      resolveSourceVisibilityMode({
        canHideSource: true,
        displayMode: 'translated-only',
        renderMode: 'block',
        sourceKind: 'plain',
      }),
    ).toBe('hide')
  })

  it('swaps plain inline sources in translated-only mode', () => {
    expect(
      resolveSourceVisibilityMode({
        canHideSource: true,
        displayMode: 'translated-only',
        renderMode: 'inline',
        sourceKind: 'plain',
      }),
    ).toBe('swap-inline')
  })

  it('swaps interactive inline sources in translated-only mode', () => {
    expect(
      resolveSourceVisibilityMode({
        canHideSource: true,
        displayMode: 'translated-only',
        renderMode: 'inline',
        sourceKind: 'interactive',
      }),
    ).toBe('swap-inline')
  })

  it('keeps sources visible outside translated-only mode', () => {
    expect(
      resolveSourceVisibilityMode({
        canHideSource: true,
        displayMode: 'bilingual',
        renderMode: 'inline',
        sourceKind: 'plain',
      }),
    ).toBe('show')

    expect(
      resolveSourceVisibilityMode({
        canHideSource: false,
        displayMode: 'translated-only',
        renderMode: 'inline',
        sourceKind: 'interactive',
      }),
    ).toBe('show')
  })
})
