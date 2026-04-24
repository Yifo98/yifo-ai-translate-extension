import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { LANGUAGES } from '../shared/constants'
import { runtimeSendMessage } from '../shared/chrome'
import { buildRuleId, validatePattern } from '../shared/matchPatterns'
import type {
  ExtensionSettings,
  ExportPayload,
  ProviderConfig,
  SiteRule,
} from '../shared/types'

function isErrorResponse(
  response: { ok: boolean; error?: string },
): response is { ok: false; error: string } {
  return response.ok === false
}

function createRuleDraft(settings: ExtensionSettings): SiteRule {
  const now = Date.now()

  return {
    id: buildRuleId(),
    pattern: '',
    enabled: true,
    mode: 'always',
    providerId: settings.defaultProviderId,
    sourceLang: settings.defaultSourceLang,
    targetLang: settings.defaultTargetLang,
    displayMode: settings.defaultDisplayMode,
    createdAt: now,
    updatedAt: now,
  }
}

function getModelChoices(provider: ProviderConfig) {
  return Array.from(
    new Set([provider.selectedModel, ...provider.models, ...provider.fallbackModels].filter(Boolean)),
  )
}

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null)
  const [providerDrafts, setProviderDrafts] = useState<ProviderConfig[]>([])
  const [ruleDraft, setRuleDraft] = useState<SiteRule | null>(null)
  const [status, setStatus] = useState('先配置你的 Provider，再保存默认偏好。')

  const providersById = useMemo(() => {
    return new Map(providerDrafts.map((provider) => [provider.id, provider]))
  }, [providerDrafts])

  useEffect(() => {
    void loadSettings()
  }, [])

  async function loadSettings() {
    const response = await runtimeSendMessage<
      { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
    >({
      type: 'GET_SETTINGS',
    })

    if (isErrorResponse(response)) {
      setStatus(response.error)
      return
    }

    setSettings(response.settings)
    setProviderDrafts(response.settings.providers)
    setRuleDraft(createRuleDraft(response.settings))
  }

  async function persistSettings(nextSettings: ExtensionSettings) {
    const response = await runtimeSendMessage<
      { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
    >({
      type: 'SAVE_SETTINGS',
      settings: nextSettings,
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setSettings(response.settings)
  }

  async function saveProvider(providerId: string) {
    const provider = providersById.get(providerId)

    if (!provider) {
      return
    }

    const response = await runtimeSendMessage<
      { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
    >({
      type: 'SAVE_PROVIDER',
      provider,
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setSettings(response.settings)
    setProviderDrafts(response.settings.providers)
  }

  async function refreshModels(providerId: string) {
    await saveProvider(providerId)
    const response = await runtimeSendMessage<
      { ok: true; models: string[] } | { ok: false; error: string }
    >({
      type: 'REFRESH_PROVIDER_MODELS',
      providerId,
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setStatus(`模型列表已刷新，共 ${response.models.length} 个。`)
    await loadSettings()
  }

  async function testProvider(providerId: string) {
    await saveProvider(providerId)
    const response = await runtimeSendMessage<
      { ok: true; result: { message: string } } | { ok: false; error: string }
    >({
      type: 'TEST_PROVIDER',
      providerId,
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setStatus(response.result.message)
    await loadSettings()
  }

  async function saveRule() {
    if (!ruleDraft || !settings) {
      return
    }

    if (!validatePattern(ruleDraft.pattern)) {
      throw new Error('规则必须写成 https://example.com/* 这种格式')
    }

    const response = await runtimeSendMessage<
      { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
    >({
      type: 'UPSERT_RULE',
      rule: {
        ...ruleDraft,
        updatedAt: Date.now(),
      },
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setSettings(response.settings)
    setRuleDraft(createRuleDraft(response.settings))
    setStatus('站点规则已保存。')
  }

  async function deleteRule(ruleId: string) {
    const response = await runtimeSendMessage<
      { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
    >({
      type: 'DELETE_RULE',
      ruleId,
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setSettings(response.settings)
    setStatus('站点规则已删除。')
  }

  async function exportSettings(includeSecrets: boolean) {
    if (includeSecrets) {
      const confirmed = window.confirm(
        '完整导出会包含 API Key。这个文件谁拿到，谁就能直接调用你的接口。确定继续？',
      )

      if (!confirmed) {
        return
      }
    }

    const response = await runtimeSendMessage<
      { ok: true; payload: ExportPayload } | { ok: false; error: string }
    >({
      type: 'EXPORT_SETTINGS',
      includeSecrets,
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    const fileName = includeSecrets
      ? 'browser-translator-config.full.json'
      : 'browser-translator-config.safe.json'
    const blob = new Blob([JSON.stringify(response.payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
    setStatus(includeSecrets ? '完整配置已导出。' : '安全配置已导出。')
  }

  async function importSettings(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const content = await file.text()
    const payload = JSON.parse(content) as ExportPayload
    const response = await runtimeSendMessage<
      { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
    >({
      type: 'IMPORT_SETTINGS',
      payload,
    })

    if (isErrorResponse(response)) {
      throw new Error(response.error)
    }

    setStatus('配置已导入。')
    setSettings(response.settings)
    setProviderDrafts(response.settings.providers)
    setRuleDraft(createRuleDraft(response.settings))
  }

  if (!settings) {
    return <div className="page-shell">正在加载设置…</div>
  }

  return (
    <div className="page-shell">
      <header className="hero-banner">
        <div>
          <p className="eyebrow">Yifo AI Translate</p>
          <h1>发给朋友用，也别把配置做得像地雷阵。</h1>
        </div>
        <p className="hero-copy">
          这里管 Provider、默认翻译偏好、站点规则和配置导入导出。
        </p>
      </header>

      <section className="settings-grid">
        <article className="panel">
          <div className="panel-title">
            <h2>默认偏好</h2>
            <button
              className="primary-button"
              onClick={() =>
                void (async () => {
                  try {
                    await persistSettings({
                      ...settings,
                      providers: providerDrafts,
                      onboardingComplete: true,
                    })
                    setStatus('全局默认偏好已保存。')
                  } catch (error) {
                    setStatus(error instanceof Error ? error.message : '保存失败')
                  }
                })()
              }
            >
              保存默认
            </button>
          </div>
          <div className="two-columns">
            <label className="field">
              <span>默认 Provider</span>
              <select
                value={settings.defaultProviderId}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, defaultProviderId: event.target.value }
                      : current,
                  )
                }
              >
                {providerDrafts.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>显示模式</span>
              <select
                value={settings.defaultDisplayMode}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          defaultDisplayMode: event.target.value as SiteRule['displayMode'],
                        }
                      : current,
                  )
                }
              >
                <option value="bilingual">双语对照</option>
                <option value="translated-only">仅看译文</option>
              </select>
            </label>
          </div>
          <div className="two-columns">
            <label className="field">
              <span>默认源语言</span>
              <select
                value={settings.defaultSourceLang}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, defaultSourceLang: event.target.value }
                      : current,
                  )
                }
              >
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>默认目标语言</span>
              <select
                value={settings.defaultTargetLang}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, defaultTargetLang: event.target.value }
                      : current,
                  )
                }
              >
                {LANGUAGES.filter((language) => language.value !== 'auto').map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="two-columns">
            <label className="field">
              <span>页面悬浮控件</span>
              <select
                value={settings.floatingWidgetMode}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          floatingWidgetMode: event.target.value as ExtensionSettings['floatingWidgetMode'],
                        }
                      : current,
                  )
                }
              >
                <option value="panel">展开控制卡片</option>
                <option value="launcher">侧边一键翻译按钮</option>
                <option value="off">关闭页面内按钮</option>
              </select>
            </label>
            <label className="field">
              <span>译文样式</span>
              <select
                value={settings.translationCardStyle}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          translationCardStyle: event.target.value as ExtensionSettings['translationCardStyle'],
                        }
                      : current,
                  )
                }
              >
                <option value="edge">边线高亮</option>
                <option value="glass">玻璃卡片</option>
              </select>
            </label>
          </div>
          <p className="help-text">
            现在推荐用“侧边一键翻译按钮”。按钮会在普通网页常驻，可拖拽到左右边缘，贴边后会半隐藏。
          </p>
        </article>

        <article className="panel">
          <div className="panel-title">
            <h2>导入 / 导出</h2>
          </div>
          <p className="help-text">
            安全导出默认不会带 API Key。完整导出适合你自己备份，不适合乱发。
          </p>
          <div className="button-row">
            <button className="secondary-button" onClick={() => void exportSettings(false)}>
              导出安全配置
            </button>
            <button className="ghost-button" onClick={() => void exportSettings(true)}>
              导出完整配置
            </button>
          </div>
          <label className="upload-card">
            <span>导入配置 JSON</span>
            <input
              type="file"
              accept="application/json"
              onChange={(event) => {
                void importSettings(event).catch((error) => {
                  setStatus(error instanceof Error ? error.message : '导入失败')
                })
              }}
            />
          </label>
        </article>
      </section>

      <section className="panel stack-panel">
        <div className="panel-title">
          <h2>Provider 配置</h2>
        </div>
        <div className="provider-list">
          {providerDrafts.map((provider) => {
            const modelChoices = getModelChoices(provider)

            return (
              <article key={provider.id} className="provider-card">
                <div className="provider-head">
                  <div>
                    <strong>{provider.label}</strong>
                    <p>{provider.lastTestStatus.message}</p>
                  </div>
                  <span className={`status-badge status-${provider.lastTestStatus.state}`}>
                    {provider.lastTestStatus.state}
                  </span>
                </div>
                <label className="field">
                  <span>Base URL</span>
                  <input
                    value={provider.baseUrl}
                    onChange={(event) =>
                      setProviderDrafts((current) =>
                        current.map((item) =>
                          item.id === provider.id
                            ? { ...item, baseUrl: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>API Key</span>
                  <input
                    type="password"
                    value={provider.apiKey}
                    onChange={(event) =>
                      setProviderDrafts((current) =>
                        current.map((item) =>
                          item.id === provider.id
                            ? { ...item, apiKey: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>模型</span>
                  <select
                    value={provider.selectedModel}
                    onChange={(event) =>
                      setProviderDrafts((current) =>
                        current.map((item) =>
                          item.id === provider.id
                            ? { ...item, selectedModel: event.target.value }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="">从已同步模型中选择</option>
                    {modelChoices.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="也可以手动输入模型 ID"
                    value={provider.selectedModel}
                    onChange={(event) =>
                      setProviderDrafts((current) =>
                        current.map((item) =>
                          item.id === provider.id
                            ? { ...item, selectedModel: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <span>已同步 {modelChoices.length} 个模型，可下拉选择，也可手填。</span>
                </label>
                <div className="button-row">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      void saveProvider(provider.id).then(
                        () => setStatus(`${provider.label} 配置已保存。`),
                        (error) =>
                          setStatus(error instanceof Error ? error.message : '保存失败'),
                      )
                    }
                  >
                    保存
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() =>
                    void refreshModels(provider.id).catch((error) => {
                      setStatus(error instanceof Error ? error.message : '拉取模型失败')
                    })
                    }
                  >
                    拉取模型
                  </button>
                  <button
                    className="primary-button"
                    onClick={() =>
                      void testProvider(provider.id).catch((error) => {
                        setStatus(error instanceof Error ? error.message : '测试失败')
                      })
                    }
                  >
                    连通测试
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="panel stack-panel">
        <div className="panel-title">
          <h2>站点规则</h2>
        </div>
        <div className="rule-editor">
          <label className="field">
            <span>匹配规则</span>
            <input
              placeholder="https://example.com/*"
              value={ruleDraft?.pattern ?? ''}
              onChange={(event) =>
                setRuleDraft((current) =>
                  current ? { ...current, pattern: event.target.value } : current,
                )
              }
            />
          </label>
          <div className="three-columns">
            <label className="field">
              <span>模式</span>
              <select
                value={ruleDraft?.mode ?? 'always'}
                onChange={(event) =>
                  setRuleDraft((current) =>
                    current
                      ? { ...current, mode: event.target.value as SiteRule['mode'] }
                      : current,
                  )
                }
              >
                <option value="always">自动翻译</option>
                <option value="never">永不自动翻译</option>
                <option value="manual">仅手动触发</option>
              </select>
            </label>
            <label className="field">
              <span>Provider</span>
              <select
                value={ruleDraft?.providerId ?? settings.defaultProviderId}
                onChange={(event) =>
                  setRuleDraft((current) =>
                    current ? { ...current, providerId: event.target.value } : current,
                  )
                }
              >
                {providerDrafts.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>显示模式</span>
              <select
                value={ruleDraft?.displayMode ?? settings.defaultDisplayMode}
                onChange={(event) =>
                  setRuleDraft((current) =>
                    current
                      ? {
                          ...current,
                          displayMode: event.target.value as SiteRule['displayMode'],
                        }
                      : current,
                  )
                }
              >
                <option value="bilingual">双语对照</option>
                <option value="translated-only">仅看译文</option>
              </select>
            </label>
          </div>
          <div className="two-columns">
            <label className="field">
              <span>源语言</span>
              <select
                value={ruleDraft?.sourceLang ?? settings.defaultSourceLang}
                onChange={(event) =>
                  setRuleDraft((current) =>
                    current ? { ...current, sourceLang: event.target.value } : current,
                  )
                }
              >
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>目标语言</span>
              <select
                value={ruleDraft?.targetLang ?? settings.defaultTargetLang}
                onChange={(event) =>
                  setRuleDraft((current) =>
                    current ? { ...current, targetLang: event.target.value } : current,
                  )
                }
              >
                {LANGUAGES.filter((language) => language.value !== 'auto').map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="button-row">
            <button
              className="primary-button"
              onClick={() =>
                void saveRule().catch((error) => {
                  setStatus(error instanceof Error ? error.message : '保存规则失败')
                })
              }
            >
              保存规则
            </button>
            <button
              className="ghost-button"
              onClick={() => setRuleDraft(createRuleDraft(settings))}
            >
              新建空白规则
            </button>
          </div>
        </div>

        <div className="rule-list">
          {settings.siteRules.length === 0 ? (
            <p className="help-text">还没有站点规则。你可以先在弹窗里对常用站点做快捷记忆。</p>
          ) : (
            settings.siteRules.map((rule) => (
              <article key={rule.id} className="rule-card">
                <div>
                  <strong>{rule.pattern}</strong>
                  <p>
                    {rule.mode} · {providerDrafts.find((provider) => provider.id === rule.providerId)?.label ?? rule.providerId} · {rule.sourceLang} → {rule.targetLang}
                  </p>
                </div>
                <div className="button-row">
                  <button className="secondary-button" onClick={() => setRuleDraft(rule)}>
                    编辑
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() =>
                      void deleteRule(rule.id).catch((error) => {
                        setStatus(error instanceof Error ? error.message : '删除失败')
                      })
                    }
                  >
                    删除
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <footer className="status-bar">{status}</footer>
    </div>
  )
}
