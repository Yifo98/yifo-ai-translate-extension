import { describe, expect, it } from 'vitest'
import { buildExportPayload, mergeImportedSettings } from '../src/shared/exportImport'
import { cloneDefaultSettings } from '../src/shared/defaults'

describe('exportImport', () => {
  it('omits API keys from safe exports', () => {
    const settings = cloneDefaultSettings()
    settings.providers[0].apiKey = 'secret-token'

    const payload = buildExportPayload(settings, false)

    expect(payload.settings.providers[0].apiKey).toBe('')
  })

  it('preserves existing keys when importing a safe export', () => {
    const current = cloneDefaultSettings()
    current.providers[0].apiKey = 'keep-me'

    const incoming = buildExportPayload(cloneDefaultSettings(), false)
    const merged = mergeImportedSettings(current, incoming)

    expect(merged.providers[0].apiKey).toBe('keep-me')
  })
})
