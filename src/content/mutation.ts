export interface AttributeMutationRefreshInput {
  mutationType: string
  attributeName: string | null
  isElementTarget: boolean
  isExtensionOwned: boolean
  isTrackedSource: boolean
}

export function shouldRefreshForAttributeMutation({
  mutationType,
  attributeName,
  isElementTarget,
  isExtensionOwned,
  isTrackedSource,
}: AttributeMutationRefreshInput) {
  if (
    mutationType !== 'attributes'
    || !attributeName
    || !isElementTarget
    || isExtensionOwned
  ) {
    return false
  }

  if (attributeName === 'class' && isTrackedSource) {
    return false
  }

  return true
}
