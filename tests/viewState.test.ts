import { describe, expect, it } from 'vitest'
import {
  resolveLauncherAction,
  resolveRequestedDisplayMode,
  resolveToolbarSyncAction,
  shouldCollapseToolbar,
} from '../src/content/viewState'

describe('content view state helpers', () => {
  it('prefers a requested display mode when one is pending', () => {
    expect(resolveRequestedDisplayMode('translated-only', 'bilingual')).toBe('translated-only')
    expect(resolveRequestedDisplayMode(null, 'bilingual')).toBe('bilingual')
  })

  it('collapses the toolbar only for outside interactions while the panel is open', () => {
    expect(
      shouldCollapseToolbar({
        floatingWidgetMode: 'launcher',
        toolbarMode: 'panel',
        clickedInsideToolbar: false,
      }),
    ).toBe(true)

    expect(
      shouldCollapseToolbar({
        floatingWidgetMode: 'panel',
        toolbarMode: 'panel',
        clickedInsideToolbar: true,
      }),
    ).toBe(false)

    expect(
      shouldCollapseToolbar({
        floatingWidgetMode: 'launcher',
        toolbarMode: 'launcher',
        clickedInsideToolbar: false,
      }),
    ).toBe(false)
  })

  it('destroys the toolbar tree when the floating widget is turned off', () => {
    expect(resolveToolbarSyncAction('off')).toBe('destroy')
    expect(resolveToolbarSyncAction('launcher')).toBe('ensure')
    expect(resolveToolbarSyncAction('panel')).toBe('ensure')
  })

  it('uses the floating launcher as a translate/restore toggle', () => {
    expect(resolveLauncherAction(false)).toBe('translate')
    expect(resolveLauncherAction(true)).toBe('restore')
  })
})
