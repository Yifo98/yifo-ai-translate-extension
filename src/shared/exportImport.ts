import type { ExportPayload, ExtensionSettings, ProviderConfig } from './types'

function sanitizeProvider(provider: ProviderConfig, includeSecrets: boolean): ProviderConfig {
  if (includeSecrets) {
    return provider
  }

  return {
    ...provider,
    apiKey: '',
  }
}

export function buildExportPayload(
  settings: ExtensionSettings,
  includeSecrets: boolean,
): ExportPayload {
  return {
    exportedAt: Date.now(),
    includeSecrets,
    settings: {
      ...settings,
      providers: settings.providers.map((provider) =>
        sanitizeProvider(provider, includeSecrets),
      ),
    },
  }
}

export function mergeImportedSettings(
  current: ExtensionSettings,
  incomingPayload: ExportPayload,
): ExtensionSettings {
  const incoming = incomingPayload.settings

  return {
    ...current,
    ...incoming,
    providers: current.providers.map((provider) => {
      const imported = incoming.providers.find((item) => item.id === provider.id)

      if (!imported) {
        return provider
      }

      return {
        ...provider,
        ...imported,
        apiKey: imported.apiKey || provider.apiKey,
      }
    }),
    siteRules: incoming.siteRules,
  }
}
