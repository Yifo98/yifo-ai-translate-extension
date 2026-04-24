import type { PageTranslationConfig } from '../shared/types'

export type SourceRenderMode = 'block' | 'inline'
export type SourceKind = 'interactive' | 'plain'
export type SourceVisibilityMode = 'show' | 'hide' | 'mute-inline' | 'swap-inline'

interface SourceVisibilityInput {
  canHideSource: boolean
  displayMode: PageTranslationConfig['displayMode']
  renderMode: SourceRenderMode
  sourceKind: SourceKind
}

export function resolveSourceVisibilityMode({
  canHideSource,
  displayMode,
  renderMode,
  sourceKind,
}: SourceVisibilityInput): SourceVisibilityMode {
  void sourceKind

  if (displayMode !== 'translated-only' || !canHideSource) {
    return 'show'
  }

  if (renderMode === 'inline') {
    return 'swap-inline'
  }

  return 'hide'
}
