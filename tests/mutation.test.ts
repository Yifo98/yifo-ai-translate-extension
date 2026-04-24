import { describe, expect, it } from 'vitest'
import { shouldRefreshForAttributeMutation } from '../src/content/mutation'

describe('content mutation refresh heuristics', () => {
  it('reacts to visibility-style attribute changes on page elements', () => {
    expect(
      shouldRefreshForAttributeMutation({
        mutationType: 'attributes',
        attributeName: 'data-state',
        isElementTarget: true,
        isExtensionOwned: false,
        isTrackedSource: false,
      }),
    ).toBe(true)
  })

  it('ignores extension-owned and internal translated source class updates', () => {
    expect(
      shouldRefreshForAttributeMutation({
        mutationType: 'attributes',
        attributeName: 'style',
        isElementTarget: true,
        isExtensionOwned: true,
        isTrackedSource: false,
      }),
    ).toBe(false)

    expect(
      shouldRefreshForAttributeMutation({
        mutationType: 'attributes',
        attributeName: 'class',
        isElementTarget: true,
        isExtensionOwned: false,
        isTrackedSource: true,
      }),
    ).toBe(false)
  })
})
