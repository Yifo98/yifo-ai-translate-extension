export function isExtensionContextInvalidatedError(error: unknown) {
  return (
    error instanceof Error
    && /Extension context invalidated|message channel closed before a response was received|Receiving end does not exist/i.test(
      error.message,
    )
  )
}
