import { TRANSLATION_BATCH_LIMIT } from './constants'
import type {
  ProviderConfig,
  ProviderTestResult,
  TranslationRequestPayload,
} from './types'

interface ModelsResponse {
  data?: Array<{ id?: string }>
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

const COMMON_ZH_CN_UI_TRANSLATIONS: Record<string, string> = {
  advanced: '高级',
  about: '关于',
  actions: '操作',
  activity: '动态',
  audio: '音频',
  'ai-powered developer platform': 'AI 驱动的开发平台',
  'available add-ons': '可用附加组件',
  'best of': '精选',
  blog: '博客',
  branches: '分支',
  careers: '招聘',
  covers: '翻唱',
  code: '代码',
  'code of conduct': '行为准则',
  'copilot for business': 'Copilot 商业版',
  contributors: '贡献者',
  create: '创建',
  disliked: '不喜欢',
  discussions: '讨论',
  docs: '文档',
  'earn credits': '赚取积分',
  enterprise: '企业版',
  'enterprise platform': '企业平台',
  'enterprise solutions': '企业解决方案',
  'enterprise-grade 24/7 support': '企业级 24/7 支持',
  'enterprise-grade ai features': '企业级 AI 功能',
  'enterprise-grade security features': '企业级安全功能',
  explore: '探索',
  'extensions': '扩展',
  feedback: '反馈',
  'filters (3)': '筛选器 (3)',
  'folders and files': '文件夹和文件',
  'full songs': '完整歌曲',
  'github advanced security': 'GitHub 高级安全',
  'go to file': '转到文件',
  help: '帮助',
  history: '历史记录',
  home: '主页',
  'hide clips from edit mode': '隐藏编辑模式中的剪辑',
  'hide disliked': '隐藏不喜欢',
  'hide stems': '隐藏音轨',
  hooks: '钩子',
  inspiration: '灵感',
  instrumental: '器乐',
  'invite friends': '邀请朋友',
  'jump back in': '继续播放',
  labels: '标签',
  'last commit date': '最后提交日期',
  'last commit message': '最后提交信息',
  'latest commit': '最新提交',
  insights: '洞察',
  library: '库',
  license: '许可证',
  liked: '已喜欢',
  lyrics: '歌词',
  name: '名称',
  'most liked': '最受欢迎',
  'least liked': '最不受欢迎',
  more: '更多',
  'my workspace': '我的工作区',
  newest: '最新',
  notifications: '通知',
  'no songs found': '未找到歌曲',
  oldest: '最旧',
  'open source': '开源',
  privacy: '隐私',
  private: '私人',
  platform: '平台',
  'premium support': '高级支持',
  pricing: '定价',
  public: '公开',
  'pull requests': '拉取请求',
  remasters: '重制版',
  releases: '发布版本',
  'report repository': '举报仓库',
  'reset filters': '重置筛选',
  resources: '资源',
  search: '搜索',
  'security and quality': '安全与质量',
  'see all': '查看全部',
  simple: '简单',
  sounds: '声音',
  solutions: '解决方案',
  'song description': '歌曲描述',
  'sponsor this project': '赞助此项目',
  'staff picks': '编辑精选',
  star: '收藏',
  studio: '工作室',
  tags: '标签',
  topics: '主题',
  'terms of service': '服务条款',
  'trending: text to song': '趋势：文本转歌曲',
  uploads: '上传',
  voices: '声音',
  watchers: '关注者',
  "what's new?": '新功能',
  workspaces: '工作区',
}

const TRANSLATION_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const TRANSLATION_RETRY_DELAY_MS = 700
const TRANSLATION_BATCH_COOLDOWN_MS = 220
const TRANSLATION_MAX_ATTEMPTS = 2
const DEFAULT_REQUEST_TIMEOUT_MS = 15000
const CHAT_COMPLETION_TIMEOUT_MS = 45000

class HttpStatusError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpStatusError'
    this.status = status
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

function buildApiUrl(baseUrl: string, path: string) {
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`
}

export function providerOriginPattern(baseUrl: string) {
  const url = new URL(normalizeBaseUrl(baseUrl))
  return `${url.origin}/*`
}

export function mapHttpError(status: number) {
  if (status === 401) {
    return '鉴权失败，请检查 API Key'
  }

  if (status === 403) {
    return '当前 Key 没有访问权限'
  }

  if (status === 404) {
    return '接口不存在，Base URL 可能不兼容'
  }

  if (status === 429) {
    return '请求过于频繁或额度不足'
  }

  if (status >= 500) {
    return '服务暂时不可用，请稍后重试'
  }

  return `请求失败（${status}）`
}

export function isRetryableTranslationStatus(status: number) {
  return TRANSLATION_RETRYABLE_STATUSES.has(status)
}

export function resolveTranslationModelCandidates(provider: ProviderConfig) {
  return Array.from(
    new Set([provider.selectedModel, ...provider.fallbackModels].filter(Boolean)),
  )
}

export function resolveProviderTimeoutMessage(path: string) {
  if (path.includes('/chat/completions')) {
    return '翻译接口响应超时，请换轻一点的模型或稍后再试'
  }

  return '接口响应超时，请稍后再试'
}

function resolveRequestTimeoutMs(path: string) {
  return path.includes('/chat/completions')
    ? CHAT_COMPLETION_TIMEOUT_MS
    : DEFAULT_REQUEST_TIMEOUT_MS
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
  onTimeout?: () => void,
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      onTimeout?.()
      reject(new Error(message))
    }, timeoutMs)

    promise
      .then((value) => {
        globalThis.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        globalThis.clearTimeout(timeoutId)
        reject(error)
      })
  })
}

async function authorizedFetch(
  provider: ProviderConfig,
  path: string,
  init?: RequestInit,
) {
  const controller = new AbortController()
  const timeoutMs = resolveRequestTimeoutMs(path)
  const timeoutMessage = resolveProviderTimeoutMessage(path)

  let response: Response

  try {
    response = await withTimeout(
      fetch(buildApiUrl(provider.baseUrl, path), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
          ...init?.headers,
        },
        signal: controller.signal,
      }),
      timeoutMs,
      timeoutMessage,
      () => {
        controller.abort()
      },
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(timeoutMessage)
    }

    throw error
  }

  if (!response.ok) {
    throw new HttpStatusError(response.status, mapHttpError(response.status))
  }

  return response
}

async function readJsonWithTimeout<T>(response: Response, path: string) {
  return withTimeout(
    response.json() as Promise<T>,
    resolveRequestTimeoutMs(path),
    resolveProviderTimeoutMessage(path),
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}

function extractMessageContent(
  payload: ChatCompletionResponse,
): string {
  const content = payload.choices?.[0]?.message?.content

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content.map((item) => item.text ?? '').join('')
  }

  return ''
}

type TranslationPayloadCandidate = {
  translations?: unknown
}

function collectBalancedJsonCandidates(
  rawContent: string,
  openChar: '{' | '[',
  closeChar: '}' | ']',
) {
  const candidates: string[] = []
  let startIndex = -1
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = 0; index < rawContent.length; index += 1) {
    const char = rawContent[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === openChar) {
      if (depth === 0) {
        startIndex = index
      }
      depth += 1
      continue
    }

    if (char === closeChar && depth > 0) {
      depth -= 1
      if (depth === 0 && startIndex >= 0) {
        candidates.push(rawContent.slice(startIndex, index + 1))
        startIndex = -1
      }
    }
  }

  return candidates
}

function extractJsonCandidates(rawContent: string) {
  const trimmed = rawContent.trim()
  const candidates = [trimmed]
  const fencedMatches = trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)

  for (const match of fencedMatches) {
    if (match[1]?.trim()) {
      candidates.push(match[1].trim())
    }
  }

  candidates.push(...collectBalancedJsonCandidates(trimmed, '{', '}'))
  candidates.push(...collectBalancedJsonCandidates(trimmed, '[', ']'))

  return Array.from(new Set(candidates.filter(Boolean)))
}

function normalizeLineTranslation(line: string) {
  return line
    .trim()
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[).:：、]\s*/, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim()
}

function parseLineTranslations(rawContent: string, expectedCount: number) {
  const lines = rawContent
    .split(/\r?\n/)
    .map(normalizeLineTranslation)
    .filter(Boolean)

  if (lines.length === expectedCount) {
    return lines
  }

  if (expectedCount === 1) {
    const singleLine = normalizeLineTranslation(rawContent)

    if (singleLine) {
      return [singleLine.replace(/^translation\s*[:：]\s*/i, '').trim()]
    }
  }

  return null
}

function normalizeParsedTranslations(
  parsed: unknown,
  expectedCount: number,
): string[] | null {
  if (typeof parsed === 'string') {
    return parseLineTranslations(parsed, expectedCount)
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item) => String(item))
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const candidate = parsed as TranslationPayloadCandidate

  if (Array.isArray(candidate.translations)) {
    return candidate.translations.map((item) => String(item))
  }

  if (typeof candidate.translations === 'string') {
    return parseLineTranslations(candidate.translations, expectedCount)
  }

  return null
}

export function extractTranslationsFromContent(
  rawContent: string,
  expectedCount: number,
) {
  for (const candidate of extractJsonCandidates(rawContent)) {
    try {
      const parsed = JSON.parse(candidate) as unknown
      const translations = normalizeParsedTranslations(parsed, expectedCount)

      if (translations) {
        return translations
      }
    } catch {
      // Try the next candidate. Some providers wrap JSON in prose or fences.
    }
  }

  const fallbackTranslations = parseLineTranslations(rawContent, expectedCount)

  if (fallbackTranslations) {
    return fallbackTranslations
  }

  throw new Error('模型返回的结果不是合法 JSON')
}

function normalizeUiGlossaryKey(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function isChineseTargetLanguage(targetLang: string) {
  return /^zh(?:-|$)/i.test(targetLang)
}

export function applyUiTranslationFallbacks(
  payload: TranslationRequestPayload,
  translations: string[],
) {
  if (!isChineseTargetLanguage(payload.targetLang)) {
    return translations
  }

  return translations.map((translation, index) => {
    const source = payload.segments[index] ?? ''
    const sourceKey = normalizeUiGlossaryKey(source)
    const fallback = COMMON_ZH_CN_UI_TRANSLATIONS[sourceKey]

    if (!fallback) {
      return translation
    }

    const translationKey = normalizeUiGlossaryKey(translation)

    if (!translation.trim() || translationKey === sourceKey) {
      return fallback
    }

    return translation
  })
}

function createTranslationMessages(payload: TranslationRequestPayload) {
  return [
    {
      role: 'system',
      content:
        'You are a translation engine. Translate faithfully, preserve numbers, standalone counters, versions, timestamps, inline code, branded product names, personal names, usernames, and links. Generic UI labels such as Advanced, Explore, Filters, or Search should be translated naturally. Song, media, and content titles should be translated when they are ordinary words or phrases. If a segment is mostly numeric or metadata-like, return it unchanged. Return JSON only.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'translate_segments',
        source_language: payload.sourceLang,
        target_language: payload.targetLang,
        rules: [
          'Keep the same order as input.',
          'Do not summarize or explain.',
          'Translate generic UI labels and navigation terms concisely.',
          'Translate song/media/content titles when they are ordinary words or phrases; keep artist names, usernames, and brand names unchanged.',
          'Standalone counters, versions, page numbers, and number-heavy tokens should stay unchanged.',
          'Keep branded names untranslated unless they are clearly common UI words.',
          'Return {"translations": [...]} only.',
        ],
        segments: payload.segments,
      }),
    },
  ]
}

export function splitTranslationRequestBatches(segments: string[]) {
  const batches: string[][] = []
  let currentBatch: string[] = []
  let characterCount = 0

  for (const segment of segments) {
    const exceedsCount = currentBatch.length >= TRANSLATION_BATCH_LIMIT.maxSegments
    const exceedsSize =
      characterCount + segment.length > TRANSLATION_BATCH_LIMIT.maxCharacters

    if (currentBatch.length > 0 && (exceedsCount || exceedsSize)) {
      batches.push(currentBatch)
      currentBatch = []
      characterCount = 0
    }

    currentBatch.push(segment)
    characterCount += segment.length
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }

  return batches
}

export function estimateTranslationMaxTokens(segments: string[]) {
  const totalChars = segments.reduce((sum, segment) => sum + segment.length, 0)
  const estimated =
    Math.ceil(totalChars * 1.15)
    + segments.length * 28
    + 96

  return Math.min(4096, Math.max(256, estimated))
}

export async function fetchProviderModels(provider: ProviderConfig) {
  const response = await authorizedFetch(provider, '/models', {
    method: 'GET',
  })
  const payload = await readJsonWithTimeout<ModelsResponse>(response, '/models')

  return (
    payload.data
      ?.map((item) => item.id?.trim())
      .filter((model): model is string => Boolean(model)) ?? []
  )
}

async function sendConnectivityProbe(provider: ProviderConfig) {
  const response = await authorizedFetch(provider, '/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: provider.selectedModel || provider.fallbackModels[0],
      messages: [
        {
          role: 'system',
          content: 'You are a connectivity probe.',
        },
        {
          role: 'user',
          content: 'Reply with OK.',
        },
      ],
      max_tokens: 8,
      temperature: 0,
    }),
  })

  const payload = await readJsonWithTimeout<ChatCompletionResponse>(response, '/chat/completions')

  if (!extractMessageContent(payload)) {
    throw new Error('探针返回为空，接口可能不兼容')
  }
}

export async function testProvider(provider: ProviderConfig): Promise<ProviderTestResult> {
  if (!provider.apiKey.trim()) {
    return {
      ok: false,
      message: '请先填写 API Key',
      models: provider.models,
    }
  }

  let models = provider.models.length ? provider.models : provider.fallbackModels

  try {
    models = await fetchProviderModels(provider)
  } catch (modelError) {
    try {
      await sendConnectivityProbe(provider)
      return {
        ok: true,
        message: `连通正常，但 /models 不可用：${(modelError as Error).message}`,
        models,
      }
    } catch (probeError) {
      return {
        ok: false,
        message: (probeError as Error).message,
        models,
      }
    }
  }

  try {
    await sendConnectivityProbe(provider)
    return {
      ok: true,
      message: `连通正常，拉取到 ${models.length} 个模型`,
      models,
    }
  } catch (probeError) {
    return {
      ok: false,
      message: `模型列表可用，但翻译接口不可用：${(probeError as Error).message}`,
      models,
    }
  }
}

async function requestTranslations(
  provider: ProviderConfig,
  payload: TranslationRequestPayload,
  model: string,
) {
  const response = await authorizedFetch(provider, '/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: createTranslationMessages(payload),
      temperature: 0.2,
      max_tokens: estimateTranslationMaxTokens(payload.segments),
      response_format: { type: 'json_object' },
    }),
  })

  const result = await readJsonWithTimeout<ChatCompletionResponse>(
    response,
    '/chat/completions',
  )
  const content = extractMessageContent(result)
  const translations = extractTranslationsFromContent(content, payload.segments.length)

  if (translations.length !== payload.segments.length) {
    throw new Error('模型返回段落数量不匹配')
  }

  return applyUiTranslationFallbacks(payload, translations)
}

function formatTranslationError(error: unknown, provider: ProviderConfig, model: string) {
  if (error instanceof HttpStatusError && error.status === 429) {
    return new Error(
      `${provider.label}（${model}）当前被限流或额度不足，请稍后重试；如果还不行，换一个更轻的模型再试。`,
    )
  }

  if (error instanceof Error) {
    return error
  }

  return new Error('翻译请求失败')
}

async function requestTranslationsWithFallback(
  provider: ProviderConfig,
  payload: TranslationRequestPayload,
) {
  const modelCandidates = resolveTranslationModelCandidates(provider)
  let lastError: Error | null = null

  for (const model of modelCandidates) {
    for (let attempt = 1; attempt <= TRANSLATION_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await requestTranslations(provider, payload, model)
      } catch (error) {
        lastError = formatTranslationError(error, provider, model)

        if (
          error instanceof HttpStatusError
          && isRetryableTranslationStatus(error.status)
          && attempt < TRANSLATION_MAX_ATTEMPTS
        ) {
          await sleep(TRANSLATION_RETRY_DELAY_MS * attempt)
          continue
        }

        break
      }
    }
  }

  throw lastError ?? new Error('翻译请求失败')
}

export async function translateSegments(
  provider: ProviderConfig,
  payload: TranslationRequestPayload,
) {
  const batches = splitTranslationRequestBatches(payload.segments)
  const translations: string[] = []

  for (const [index, batch] of batches.entries()) {
    const batchTranslations = await requestTranslationsWithFallback(provider, {
      ...payload,
      segments: batch,
    })

    translations.push(...batchTranslations)

    if (index < batches.length - 1) {
      await sleep(TRANSLATION_BATCH_COOLDOWN_MS)
    }
  }

  return translations
}
