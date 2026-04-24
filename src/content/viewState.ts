import type { DisplayMode, FloatingWidgetMode } from '../shared/types'

export type ToolbarSyncAction = 'destroy' | 'ensure'
export type LauncherAction = 'translate' | 'restore'

export function resolveRequestedDisplayMode(
  requestedDisplayMode: DisplayMode | null | undefined,
  fallbackDisplayMode: DisplayMode,
) {
  return requestedDisplayMode ?? fallbackDisplayMode
}

export function shouldCollapseToolbar({
  floatingWidgetMode,
  toolbarMode,
  clickedInsideToolbar,
}: {
  floatingWidgetMode: FloatingWidgetMode
  toolbarMode: FloatingWidgetMode
  clickedInsideToolbar: boolean
}) {
  return (
    toolbarMode === 'panel'
    && floatingWidgetMode !== 'off'
    && !clickedInsideToolbar
  )
}

export function resolveToolbarSyncAction(floatingWidgetMode: FloatingWidgetMode): ToolbarSyncAction {
  return floatingWidgetMode === 'off' ? 'destroy' : 'ensure'
}

export function resolveLauncherAction(isTranslated: boolean): LauncherAction {
  return isTranslated ? 'restore' : 'translate'
}
