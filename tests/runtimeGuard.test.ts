import { describe, expect, it } from 'vitest'
import { isExtensionContextInvalidatedError } from '../src/content/runtimeGuard'

describe('content runtime guard', () => {
  it('detects extension invalidation errors without muting unrelated failures', () => {
    expect(
      isExtensionContextInvalidatedError(new Error('Extension context invalidated.')),
    ).toBe(true)
    expect(
      isExtensionContextInvalidatedError(
        new Error(
          'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received',
        ),
      ),
    ).toBe(true)
    expect(
      isExtensionContextInvalidatedError(new Error('Could not establish connection. Receiving end does not exist.')),
    ).toBe(true)
    expect(
      isExtensionContextInvalidatedError(new Error('Cannot access contents of the page.')),
    ).toBe(false)
    expect(isExtensionContextInvalidatedError('Extension context invalidated.')).toBe(false)
  })
})
