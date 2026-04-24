import type {
  ExtensionSettings,
  FloatingLauncherPosition,
  FloatingWidgetMode,
  PageTranslationConfig,
  PageTranslationState,
  TranslationCardStyle,
} from '../shared/types'
import { resolveSourceVisibilityMode } from './displayMode'
import { collectBlockCandidates, type BlockCandidate, type InlineLayout } from './dom'
import { shouldRefreshForAttributeMutation } from './mutation'
import { toolbarStyles } from './styleText'
import {
  resolveLauncherAction,
  resolveRequestedDisplayMode,
  resolveToolbarSyncAction,
  shouldCollapseToolbar,
} from './viewState'
import { isExtensionContextInvalidatedError } from './runtimeGuard'

interface ToolbarElements {
  root: HTMLDivElement
  launcher: HTMLButtonElement
  launcherMark: HTMLSpanElement
  status: HTMLDivElement
  toggle: HTMLButtonElement
  translate: HTMLButtonElement
  restore: HTMLButtonElement
  bilingual: HTMLButtonElement
  translatedOnly: HTMLButtonElement
  always: HTMLButtonElement
  never: HTMLButtonElement
  settings: HTMLButtonElement
}

interface TranslationEntry extends BlockCandidate {
  cacheKey: string
  translationNode: HTMLElement
}

const TOOLBAR_ROOT_ID = 'browser-translator-toolbar'
const STYLE_ELEMENT_ID = 'browser-translator-style'
const TRANSLATION_NODE_CLASS = 'browser-translator-target'
const SOURCE_HIDDEN_CLASS = 'browser-translator-source-hidden'
const SOURCE_INLINE_MUTED_CLASS = 'browser-translator-inline-source-muted'
const SOURCE_INLINE_SWAPPED_CLASS = 'browser-translator-inline-source-swapped'
const SOURCE_TRACKED_ATTR = 'data-browser-translator-source'
const SOURCE_HASH_ATTR = 'data-browser-translator-hash'
const TRANSLATION_STYLE_ATTR = 'data-browser-translator-card-style'
const SOURCE_RENDER_MODE_ATTR = 'data-browser-translator-render-mode'
const SOURCE_CAN_HIDE_ATTR = 'data-browser-translator-can-hide-source'
const SOURCE_INLINE_LAYOUT_ATTR = 'data-browser-translator-inline-layout'
const SOURCE_KIND_ATTR = 'data-browser-translator-source-kind'
const GENERATED_NODE_SELECTOR = '[data-browser-translator-generated="true"]'
const PAGE_TONE_ATTR = 'data-browser-translator-page-tone'

const DEFAULT_UI_PREFERENCES: {
  floatingWidgetMode: FloatingWidgetMode
  floatingLauncherPosition: FloatingLauncherPosition
  translationCardStyle: TranslationCardStyle
} = {
  floatingWidgetMode: 'launcher' as FloatingWidgetMode,
  floatingLauncherPosition: {
    side: 'right',
    top: 156,
    collapsed: false,
  },
  translationCardStyle: 'edge' as TranslationCardStyle,
}

const LAUNCHER_SIZE = 40
const LAUNCHER_EDGE_MARGIN = 18
const LAUNCHER_COLLAPSE_DISTANCE = 28
const TRANSLATION_BATCH_SEGMENT_LIMIT = 24
const TRANSLATION_BATCH_CHARACTER_LIMIT = 6000

const state = {
  translated: false,
  displayMode: 'original' as PageTranslationState['displayMode'],
  currentConfig: null as PageTranslationConfig | null,
  floatingWidgetMode: DEFAULT_UI_PREFERENCES.floatingWidgetMode,
  toolbarMode: DEFAULT_UI_PREFERENCES.floatingWidgetMode,
  floatingLauncherPosition: DEFAULT_UI_PREFERENCES.floatingLauncherPosition,
  translationCardStyle: DEFAULT_UI_PREFERENCES.translationCardStyle,
  blockCount: 0,
  cache: new Map<string, string>(),
  observer: null as MutationObserver | null,
  refreshTimer: 0,
  isTranslating: false,
  translationRunId: 0,
  pendingDisplayMode: null as PageTranslationConfig['displayMode'] | null,
  statusMessage: '点一下右侧按钮就开始翻译。' as string,
}

let toolbar: ToolbarElements | null = null
let toolbarDismissHandlersInstalled = false
let runtimeGuardsInstalled = false
let viewportRefreshHandlersInstalled = false
let launcherDragState: {
  pointerId: number
  startX: number
  startY: number
  moved: boolean
} | null = null
let suppressNextLauncherClick = false

class TranslationCancelledError extends Error {
  constructor() {
    super('翻译已停止')
    this.name = 'TranslationCancelledError'
  }
}

function isTranslationCancelledError(error: unknown) {
  return error instanceof TranslationCancelledError
}

function assertTranslationRunActive(runId: number) {
  if (!state.isTranslating || state.translationRunId !== runId) {
    throw new TranslationCancelledError()
  }
}

function runtimeSendMessage<TResponse>(message: unknown): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(response as TResponse)
    })
  })
}

function ensureStyles() {
  const existingStyle = document.getElementById(STYLE_ELEMENT_ID)

  if (existingStyle) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ELEMENT_ID
  style.textContent = toolbarStyles
  document.documentElement.append(style)
}

function parseRgbColor(color: string) {
  const match = color.match(/rgba?\(([^)]+)\)/i)

  if (!match) {
    return null
  }

  const [r, g, b, a = 1] = match[1]
    .split(',')
    .map((part) => Number.parseFloat(part.trim()))

  if (![r, g, b].every(Number.isFinite) || !Number.isFinite(a) || a <= 0.05) {
    return null
  }

  return { r, g, b }
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const [sr, sg, sb] = [r, g, b].map((value) => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb
}

function resolvePageTone() {
  const candidates = [
    document.body,
    document.documentElement,
  ].filter(Boolean) as HTMLElement[]

  for (const element of candidates) {
    const background = parseRgbColor(getComputedStyle(element).backgroundColor)

    if (background) {
      return relativeLuminance(background) > 0.58 ? 'light' : 'dark'
    }
  }

  const textColor = parseRgbColor(getComputedStyle(document.body).color)

  if (textColor) {
    return relativeLuminance(textColor) < 0.42 ? 'light' : 'dark'
  }

  return 'light'
}

function applyPageTone() {
  document.documentElement.setAttribute(PAGE_TONE_ATTR, resolvePageTone())
}

function cleanupStaleUi() {
  const staleToolbar = document.getElementById(TOOLBAR_ROOT_ID)

  if (staleToolbar) {
    staleToolbar.remove()
  }
}

function destroyToolbar() {
  cleanupStaleUi()
  toolbar = null
  state.toolbarMode = 'off'
}

function handleInvalidatedContext(error: unknown) {
  if (!isExtensionContextInvalidatedError(error)) {
    return false
  }

  window.clearTimeout(state.refreshTimer)
  state.refreshTimer = 0
  stopObserver()
  cleanupStaleUi()
  toolbar = null
  state.isTranslating = false
  return true
}

function installRuntimeGuards() {
  if (runtimeGuardsInstalled) {
    return
  }

  runtimeGuardsInstalled = true

  window.addEventListener('unhandledrejection', (event) => {
    if (handleInvalidatedContext(event.reason)) {
      event.preventDefault()
    }
  })
}

function buildButton(label: string, tone?: 'primary' | 'warning') {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label

  if (tone) {
    button.dataset.tone = tone
  }

  return button
}

async function loadSettingsSnapshot(): Promise<ExtensionSettings> {
  const response = await runtimeSendMessage<
    { ok: true; settings: ExtensionSettings } | { ok: false; error: string }
  >({
    type: 'GET_SETTINGS',
  })

  if (!response.ok) {
    throw new Error(response.error)
  }

  return response.settings
}

function buildDefaultConfig(settings: ExtensionSettings): PageTranslationConfig {
  return {
    providerId: settings.defaultProviderId,
    sourceLang: settings.defaultSourceLang,
    targetLang: settings.defaultTargetLang,
    displayMode: settings.defaultDisplayMode,
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeFloatingLauncherPosition(
  position: FloatingLauncherPosition | undefined,
): FloatingLauncherPosition {
  const fallback = DEFAULT_UI_PREFERENCES.floatingLauncherPosition
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720
  const safeMaxTop = Math.max(LAUNCHER_EDGE_MARGIN, viewportHeight - LAUNCHER_SIZE - LAUNCHER_EDGE_MARGIN)
  const rawTop = Number.isFinite(position?.top) ? Number(position?.top) : fallback.top

  return {
    side: position?.side === 'left' ? 'left' : 'right',
    top: clampNumber(rawTop, LAUNCHER_EDGE_MARGIN, safeMaxTop),
    collapsed: Boolean(position?.collapsed),
  }
}

function resolveFloatingLauncherPositionFromPointer(
  clientX: number,
  clientY: number,
): FloatingLauncherPosition {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280
  const side = clientX < viewportWidth / 2 ? 'left' : 'right'
  const distanceToEdge = side === 'left' ? clientX : viewportWidth - clientX

  return normalizeFloatingLauncherPosition({
    side,
    top: clientY - LAUNCHER_SIZE / 2,
    collapsed: distanceToEdge <= LAUNCHER_COLLAPSE_DISTANCE,
  })
}

function applyFloatingLauncherPosition() {
  if (!toolbar) {
    return
  }

  const nextPosition = normalizeFloatingLauncherPosition(state.floatingLauncherPosition)
  state.floatingLauncherPosition = nextPosition
  toolbar.root.dataset.launcherSide = nextPosition.side
  toolbar.root.dataset.launcherCollapsed = String(nextPosition.collapsed)
  toolbar.root.style.setProperty('--bt-launcher-top', `${nextPosition.top}px`)
}

function setFloatingLauncherPosition(
  position: FloatingLauncherPosition,
  shouldPersist = false,
) {
  const nextPosition = normalizeFloatingLauncherPosition(position)
  state.floatingLauncherPosition = nextPosition
  applyFloatingLauncherPosition()

  if (!shouldPersist) {
    return
  }

  void runtimeSendMessage<{ ok: true } | { ok: false; error: string }>({
    type: 'SAVE_FLOATING_LAUNCHER_POSITION',
    position: nextPosition,
  }).catch((error) => {
    handleInvalidatedContext(error)
  })
}

function splitTranslationRequestBatches(segments: string[]) {
  const batches: string[][] = []
  let currentBatch: string[] = []
  let characterCount = 0

  for (const segment of segments) {
    const exceedsCount = currentBatch.length >= TRANSLATION_BATCH_SEGMENT_LIMIT
    const exceedsSize = characterCount + segment.length > TRANSLATION_BATCH_CHARACTER_LIMIT

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

function registerTranslationSession(config: PageTranslationConfig) {
  void runtimeSendMessage<{ ok: true } | { ok: false; error: string }>({
    type: 'REGISTER_TRANSLATION_SESSION',
    config,
  }).catch((error) => {
    handleInvalidatedContext(error)
  })
}

function clearTranslationSession() {
  void runtimeSendMessage<{ ok: true } | { ok: false; error: string }>({
    type: 'CLEAR_TRANSLATION_SESSION',
  }).catch((error) => {
    handleInvalidatedContext(error)
  })
}

function invalidateActiveTranslationRun() {
  if (!state.isTranslating) {
    return false
  }

  state.translationRunId += 1
  state.isTranslating = false
  state.pendingDisplayMode = null
  window.clearTimeout(state.refreshTimer)
  state.refreshTimer = 0

  return true
}

function cancelActiveTranslation({
  restoreOriginal = false,
  message = '已停止翻译。',
}: {
  restoreOriginal?: boolean
  message?: string
} = {}) {
  if (!invalidateActiveTranslationRun()) {
    return false
  }

  stopObserver()
  clearTranslationSession()

  if (restoreOriginal || !state.translated) {
    clearTrackedNodes()
    state.translated = false
    state.blockCount = 0
    state.displayMode = 'original'
    state.currentConfig = null
  } else {
    state.blockCount = trackedSourceCount()
  }

  updateToolbarStatus(message)
  updateToolbarButtons()

  return true
}

function applyResolvedTranslations(entries: TranslationEntry[]) {
  for (const entry of entries) {
    const cached = state.cache.get(entry.cacheKey)

    if (cached !== undefined) {
      entry.translationNode.textContent = cached
    }
  }
}

async function loadDefaultConfig(): Promise<PageTranslationConfig> {
  return buildDefaultConfig(await loadSettingsSnapshot())
}

async function bootstrapUi() {
  try {
    const settings = await loadSettingsSnapshot()
    applyUiPreferences(settings, true)
  } catch (error) {
    handleInvalidatedContext(error)
  }
}

function syncToolbarMode(mode: FloatingWidgetMode) {
  state.toolbarMode = mode

  if (!toolbar) {
    return
  }

  toolbar.root.dataset.mode = mode
  toolbar.toggle.textContent = mode === 'panel' ? '收起' : '展开'
  applyFloatingLauncherPosition()
  updateToolbarButtons()
}

function applyUiPreferences(settings: ExtensionSettings, syncMode = false) {
  applyPageTone()
  state.translationCardStyle = settings.translationCardStyle
  state.floatingWidgetMode = settings.floatingWidgetMode
  state.floatingLauncherPosition = normalizeFloatingLauncherPosition(
    settings.floatingLauncherPosition,
  )
  document.documentElement.setAttribute(
    TRANSLATION_STYLE_ATTR,
    settings.translationCardStyle,
  )

  if (resolveToolbarSyncAction(settings.floatingWidgetMode) === 'destroy') {
    destroyToolbar()
    return
  }

  ensureToolbar()
  applyFloatingLauncherPosition()

  if (syncMode || state.toolbarMode === 'off' || !state.translated) {
    syncToolbarMode(settings.floatingWidgetMode)
  }

  updateToolbarStatus(state.statusMessage)
  updateToolbarButtons()
}

function applyUiPreferencePatch(
  settings: Pick<
    ExtensionSettings,
    'floatingWidgetMode' | 'floatingLauncherPosition' | 'translationCardStyle'
  >,
) {
  applyPageTone()
  state.translationCardStyle = settings.translationCardStyle
  state.floatingWidgetMode = settings.floatingWidgetMode
  state.floatingLauncherPosition = normalizeFloatingLauncherPosition(
    settings.floatingLauncherPosition,
  )
  document.documentElement.setAttribute(
    TRANSLATION_STYLE_ATTR,
    settings.translationCardStyle,
  )

  if (resolveToolbarSyncAction(settings.floatingWidgetMode) === 'destroy') {
    destroyToolbar()
    return
  }

  ensureToolbar()
  applyFloatingLauncherPosition()
  syncToolbarMode(settings.floatingWidgetMode)
  updateToolbarStatus(state.statusMessage)
  updateToolbarButtons()
}

function updateToolbarStatus(message: string) {
  state.statusMessage = message

  if (!toolbar) {
    return
  }

  toolbar.status.textContent = message
}

function updateToolbarButtons() {
  if (!toolbar) {
    return
  }

  const launcherState = state.isTranslating
    ? 'loading'
    : state.translated
      ? 'ready'
      : 'idle'

  toolbar.bilingual.dataset.active = String(state.displayMode === 'bilingual')
  toolbar.translatedOnly.dataset.active = String(
    state.displayMode === 'translated-only',
  )
  toolbar.translate.textContent = state.isTranslating ? '停止翻译' : '翻译此页'
  toolbar.restore.textContent = state.isTranslating ? '停止并恢复' : '恢复原文'
  toolbar.translate.disabled = !state.isTranslating && state.translated
  toolbar.restore.disabled = !state.isTranslating && !state.translated
  toolbar.launcher.disabled = false
  toolbar.launcher.dataset.state = launcherState
  toolbar.launcher.setAttribute('aria-busy', String(state.isTranslating))
  toolbar.launcherMark.textContent = state.isTranslating
    ? ''
    : state.translated
      ? '↺'
      : ''
  toolbar.launcher.setAttribute(
    'aria-label',
    state.isTranslating
      ? '停止翻译并恢复原文'
      : state.translated
        ? '恢复原文'
        : '翻译当前页面',
  )
  toolbar.launcher.title = state.isTranslating
    ? '停止翻译并恢复原文'
    : state.translated
      ? `恢复原文（已处理 ${state.blockCount} 段）`
      : '翻译当前页面'
}

function collapseToolbarToLauncher() {
  if (state.toolbarMode !== 'panel' || state.floatingWidgetMode === 'off') {
    return
  }

  syncToolbarMode('launcher')
}

function resolveEventTargets(event: Event) {
  const path = typeof event.composedPath === 'function'
    ? event.composedPath()
    : []

  if (path.length > 0) {
    return path
  }

  return event.target ? [event.target] : []
}

function maybeCollapseToolbarFromEvent(event: Event) {
  if (!toolbar) {
    return
  }

  const clickedInsideToolbar = resolveEventTargets(event).some((target) => (
    target instanceof Node && toolbar?.root.contains(target)
  ))

  if (!shouldCollapseToolbar({
    floatingWidgetMode: state.floatingWidgetMode,
    toolbarMode: state.toolbarMode,
    clickedInsideToolbar,
  })) {
    return
  }

  collapseToolbarToLauncher()
}

function installToolbarDismissHandlers() {
  if (toolbarDismissHandlersInstalled) {
    return
  }

  toolbarDismissHandlersInstalled = true

  const collapseFromEvent = (event: Event) => {
    maybeCollapseToolbarFromEvent(event)
  }

  window.addEventListener('pointerdown', collapseFromEvent, true)
  window.addEventListener('mousedown', collapseFromEvent, true)
  window.addEventListener('click', collapseFromEvent, true)
  window.addEventListener('focusin', collapseFromEvent, true)
  window.addEventListener('resize', () => {
    applyFloatingLauncherPosition()
  }, { passive: true })

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return
    }

    collapseToolbarToLauncher()
  }, true)
}

function installLauncherDragHandlers(launcher: HTMLButtonElement) {
  launcher.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || state.isTranslating) {
      return
    }

    launcherDragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
    launcher.dataset.dragging = 'false'
    launcher.setPointerCapture(event.pointerId)
  })

  launcher.addEventListener('pointermove', (event) => {
    if (!launcherDragState || launcherDragState.pointerId !== event.pointerId) {
      return
    }

    const distance = Math.hypot(
      event.clientX - launcherDragState.startX,
      event.clientY - launcherDragState.startY,
    )

    if (!launcherDragState.moved && distance < 5) {
      return
    }

    launcherDragState.moved = true
    launcher.dataset.dragging = 'true'
    setFloatingLauncherPosition(
      resolveFloatingLauncherPositionFromPointer(event.clientX, event.clientY),
    )
    event.preventDefault()
  })

  const finishDrag = (event: PointerEvent) => {
    if (!launcherDragState || launcherDragState.pointerId !== event.pointerId) {
      return
    }

    const moved = launcherDragState.moved
    launcherDragState = null
    launcher.dataset.dragging = 'false'

    if (launcher.hasPointerCapture(event.pointerId)) {
      launcher.releasePointerCapture(event.pointerId)
    }

    if (!moved) {
      return
    }

    suppressNextLauncherClick = true
    setFloatingLauncherPosition(
      resolveFloatingLauncherPositionFromPointer(event.clientX, event.clientY),
      true,
    )
    window.setTimeout(() => {
      suppressNextLauncherClick = false
    }, 0)
    event.preventDefault()
  }

  launcher.addEventListener('pointerup', finishDrag)
  launcher.addEventListener('pointercancel', finishDrag)
}

function ensureToolbar() {
  if (toolbar) {
    return toolbar
  }

  ensureStyles()
  cleanupStaleUi()

  const launcherIconUrl = chrome.runtime.getURL('icons/icon-48.png')
  const root = document.createElement('div')
  root.id = TOOLBAR_ROOT_ID
  root.innerHTML = `
    <button type="button" class="bt-launcher" aria-label="翻译当前页面">
      <img class="bt-launcher-icon" src="${launcherIconUrl}" alt="" aria-hidden="true" />
      <span class="bt-launcher-mark"></span>
      <span class="bt-launcher-glow"></span>
    </button>
    <div class="bt-panel">
      <div class="bt-header">
        <div class="bt-brand">
          <strong>Yifo</strong>
          <span class="bt-pill">AI Translate</span>
        </div>
        <button type="button" class="bt-toggle">收起</button>
      </div>
      <div class="bt-body">
        <div class="bt-status"></div>
        <div class="bt-grid"></div>
        <div class="bt-grid"></div>
      </div>
    </div>
  `

  const launcher = root.querySelector('.bt-launcher')
  const launcherMark = root.querySelector('.bt-launcher-mark')
  const toggle = root.querySelector('.bt-toggle')
  const body = root.querySelector('.bt-body')
  const status = root.querySelector('.bt-status')

  if (
    !(launcher instanceof HTMLButtonElement)
    || !(launcherMark instanceof HTMLSpanElement)
    || !(toggle instanceof HTMLButtonElement)
    || !body
    || !(status instanceof HTMLDivElement)
  ) {
    throw new Error('无法初始化工具条')
  }

  const grids = Array.from(root.querySelectorAll<HTMLDivElement>('.bt-grid'))
  const primaryGrid = grids[0]
  const secondaryGrid = grids[1]

  const translate = buildButton('翻译此页', 'primary')
  const restore = buildButton('恢复原文')
  const bilingual = buildButton('双语对照')
  const translatedOnly = buildButton('仅看译文')
  const always = buildButton('总是翻译')
  const never = buildButton('永不翻译', 'warning')
  const settings = buildButton('打开设置')

  primaryGrid.append(translate, restore, bilingual, translatedOnly)
  secondaryGrid.append(always, never, settings)

  document.documentElement.append(root)
  installToolbarDismissHandlers()
  installLauncherDragHandlers(launcher)

  toolbar = {
    root,
    launcher,
    launcherMark,
    status,
    toggle,
    translate,
    restore,
    bilingual,
    translatedOnly,
    always,
    never,
    settings,
  }

  applyFloatingLauncherPosition()
  syncToolbarMode(state.toolbarMode)

  launcher.addEventListener('click', async () => {
    if (suppressNextLauncherClick) {
      return
    }

    if (state.isTranslating) {
      cancelActiveTranslation({
        restoreOriginal: true,
        message: '已停止翻译并恢复原文。',
      })
      return
    }

    try {
      const action = resolveLauncherAction(state.translated)

      if (action === 'restore') {
        restorePage()
        return
      }

      updateToolbarStatus('正在翻译当前页面…')
      updateToolbarButtons()
      const settingsSnapshot = await loadSettingsSnapshot()
      applyUiPreferences(settingsSnapshot, true)
      const config = state.currentConfig ?? buildDefaultConfig(settingsSnapshot)
      await translatePage(config, false, settingsSnapshot)
    } catch (error) {
      if (handleInvalidatedContext(error)) {
        return
      }

      updateToolbarStatus(error instanceof Error ? error.message : '翻译失败')
      updateToolbarButtons()
    }
  })

  toggle.addEventListener('click', () => {
    syncToolbarMode(state.toolbarMode === 'panel' ? 'launcher' : 'panel')
  })

  translate.addEventListener('click', async () => {
    if (state.isTranslating) {
      cancelActiveTranslation()
      return
    }

    try {
      updateToolbarStatus('正在翻译当前页面…')
      const settingsSnapshot = await loadSettingsSnapshot()
      applyUiPreferences(settingsSnapshot, true)
      const config = state.currentConfig ?? buildDefaultConfig(settingsSnapshot)
      await translatePage(config, false, settingsSnapshot)
    } catch (error) {
      if (handleInvalidatedContext(error)) {
        return
      }

      updateToolbarStatus(error instanceof Error ? error.message : '翻译失败')
    }
  })

  restore.addEventListener('click', () => {
    if (state.isTranslating) {
      cancelActiveTranslation({
        restoreOriginal: true,
        message: '已停止翻译并恢复原文。',
      })
      return
    }

    restorePage()
  })

  bilingual.addEventListener('click', () => {
    if (state.isTranslating) {
      cancelActiveTranslation()
    }

    if (!state.translated) {
      return
    }

    applyDisplayMode('bilingual')
    updateToolbarStatus(`已切换为双语对照（${state.blockCount} 段）`)
  })

  translatedOnly.addEventListener('click', () => {
    if (state.isTranslating) {
      cancelActiveTranslation()
    }

    if (!state.translated) {
      return
    }

    applyDisplayMode('translated-only')
    updateToolbarStatus(`已切换为纯译文模式（${state.blockCount} 段）`)
  })

  always.addEventListener('click', async () => {
    if (state.isTranslating) {
      cancelActiveTranslation()
    }

    try {
      const config = state.currentConfig ?? (await loadDefaultConfig())
      const response = await runtimeSendMessage<
        { ok: true } | { ok: false; error: string }
      >({
        type: 'UPSERT_RULE_FROM_PAGE',
        tabId: 0,
        url: location.href,
        mode: 'always',
        config,
      })

      if (!response.ok) {
        throw new Error(response.error)
      }

      updateToolbarStatus('以后打开这个站点会自动翻译。')
    } catch (error) {
      if (handleInvalidatedContext(error)) {
        return
      }

      updateToolbarStatus(error instanceof Error ? error.message : '保存规则失败')
    }
  })

  never.addEventListener('click', async () => {
    if (state.isTranslating) {
      cancelActiveTranslation()
    }

    try {
      const config = state.currentConfig ?? (await loadDefaultConfig())
      const response = await runtimeSendMessage<
        { ok: true } | { ok: false; error: string }
      >({
        type: 'UPSERT_RULE_FROM_PAGE',
        tabId: 0,
        url: location.href,
        mode: 'never',
        config,
      })

      if (!response.ok) {
        throw new Error(response.error)
      }

      updateToolbarStatus('这个站点已标记为不自动翻译。')
    } catch (error) {
      if (handleInvalidatedContext(error)) {
        return
      }

      updateToolbarStatus(error instanceof Error ? error.message : '保存规则失败')
    }
  })

  settings.addEventListener('click', async () => {
    if (state.isTranslating) {
      cancelActiveTranslation()
    }

    try {
      await runtimeSendMessage<{ ok: true } | { ok: false; error: string }>({
        type: 'OPEN_OPTIONS_PAGE',
      })
    } catch (error) {
      if (handleInvalidatedContext(error)) {
        return
      }

      updateToolbarStatus(error instanceof Error ? error.message : '打开设置失败')
    }
  })

  updateToolbarStatus(state.statusMessage)
  updateToolbarButtons()

  return toolbar
}

function findTranslationNode(source: HTMLElement) {
  const siblingNode = source.nextElementSibling

  if (
    siblingNode
    && siblingNode instanceof HTMLElement
    && siblingNode.classList.contains(TRANSLATION_NODE_CLASS)
  ) {
    return siblingNode
  }

  const inlineChild = source.querySelector<HTMLElement>(
    `:scope > .${TRANSLATION_NODE_CLASS}[data-render-mode="inline"]`,
  )

  return inlineChild instanceof HTMLElement ? inlineChild : null
}

function trackedSourceCount() {
  return document.querySelectorAll(`[${SOURCE_TRACKED_ATTR}="true"]`).length
}

function clearTrackedNodes() {
  const translations = Array.from(
    document.querySelectorAll<HTMLElement>(GENERATED_NODE_SELECTOR),
  )
  const sources = Array.from(
    document.querySelectorAll<HTMLElement>(`[${SOURCE_TRACKED_ATTR}="true"]`),
  )

  translations.forEach((node) => node.remove())
  sources.forEach((source) => {
    source.classList.remove(SOURCE_HIDDEN_CLASS, SOURCE_INLINE_MUTED_CLASS)
    source.classList.remove(SOURCE_INLINE_SWAPPED_CLASS)
    source.removeAttribute(SOURCE_TRACKED_ATTR)
    source.removeAttribute(SOURCE_HASH_ATTR)
    source.removeAttribute(SOURCE_RENDER_MODE_ATTR)
    source.removeAttribute(SOURCE_CAN_HIDE_ATTR)
    source.removeAttribute(SOURCE_INLINE_LAYOUT_ATTR)
    source.removeAttribute(SOURCE_KIND_ATTR)
  })
}

function getTranslationNode(
  source: HTMLElement,
  renderMode: 'block' | 'inline',
  inlineLayout: InlineLayout,
) {
  const existingNode = findTranslationNode(source)

  if (existingNode) {
    existingNode.dataset.renderMode = renderMode
    existingNode.dataset.inlineLayout = inlineLayout
    return existingNode
  }

  const translationNode = document.createElement(renderMode === 'inline' ? 'span' : 'div')
  translationNode.className = TRANSLATION_NODE_CLASS
  translationNode.setAttribute('data-browser-translator-generated', 'true')
  translationNode.setAttribute('aria-hidden', 'true')
  translationNode.dataset.renderMode = renderMode
  translationNode.dataset.inlineLayout = inlineLayout

  if (renderMode === 'inline') {
    source.append(translationNode)
  } else {
    source.insertAdjacentElement('afterend', translationNode)
  }

  return translationNode
}

function applyDisplayMode(displayMode: PageTranslationConfig['displayMode']) {
  const sources = Array.from(
    document.querySelectorAll<HTMLElement>(`[${SOURCE_TRACKED_ATTR}="true"]`),
  )

  for (const source of sources) {
    const translationNode = findTranslationNode(source)
    const canHideSource = source.getAttribute(SOURCE_CAN_HIDE_ATTR) === 'true'
    const renderMode = source.getAttribute(SOURCE_RENDER_MODE_ATTR) as
      | 'block'
      | 'inline'
      | null
    const sourceKind = (source.getAttribute(SOURCE_KIND_ATTR) as
      | 'interactive'
      | 'plain'
      | null) ?? 'plain'

    if (!translationNode || !(translationNode instanceof HTMLElement)) {
      continue
    }

    translationNode.hidden = false
    source.classList.remove(
      SOURCE_HIDDEN_CLASS,
      SOURCE_INLINE_MUTED_CLASS,
      SOURCE_INLINE_SWAPPED_CLASS,
    )

    if (!renderMode) {
      continue
    }

    const visibilityMode = resolveSourceVisibilityMode({
      canHideSource,
      displayMode,
      renderMode,
      sourceKind,
    })

    if (visibilityMode === 'hide') {
      source.classList.add(SOURCE_HIDDEN_CLASS)
    }

    if (visibilityMode === 'mute-inline') {
      source.classList.add(SOURCE_INLINE_MUTED_CLASS)
    }

    if (visibilityMode === 'swap-inline') {
      source.classList.add(SOURCE_INLINE_SWAPPED_CLASS)
    }
  }

  state.displayMode = displayMode

  if (state.currentConfig) {
    state.currentConfig = {
      ...state.currentConfig,
      displayMode,
    }
  }

  if (state.translated && state.currentConfig) {
    registerTranslationSession(state.currentConfig)
  }

  updateToolbarButtons()
}

function stopObserver() {
  state.observer?.disconnect()
  state.observer = null
}

function isExtensionOwnedNode(node: Node | null) {
  if (!node) {
    return false
  }

  const element = node instanceof Element ? node : node.parentElement

  return Boolean(
    element?.closest(`#${TOOLBAR_ROOT_ID}`) || element?.closest(GENERATED_NODE_SELECTOR),
  )
}

function isRelevantVisibilityAttributeMutation(mutation: MutationRecord) {
  const target = mutation.target

  return shouldRefreshForAttributeMutation({
    mutationType: mutation.type,
    attributeName: mutation.attributeName,
    isElementTarget: target instanceof HTMLElement,
    isExtensionOwned: isExtensionOwnedNode(target),
    isTrackedSource: target instanceof HTMLElement
      && target.getAttribute(SOURCE_TRACKED_ATTR) === 'true',
  })
}

function canRunIncrementalRefresh() {
  return Boolean(state.currentConfig && state.translated && !state.isTranslating)
}

function scheduleIncrementalRefresh(delay = 800) {
  window.clearTimeout(state.refreshTimer)
  state.refreshTimer = window.setTimeout(() => {
    if (state.currentConfig && canRunIncrementalRefresh()) {
      void translatePage(state.currentConfig, true).catch((error) => {
        if (handleInvalidatedContext(error)) {
          return
        }

        updateToolbarStatus(error instanceof Error ? error.message : '增量翻译失败')
      })
    }
  }, delay)
}

function scheduleViewportIncrementalRefresh() {
  if (!canRunIncrementalRefresh()) {
    return
  }

  scheduleIncrementalRefresh(420)
}

function installViewportRefreshHandlers() {
  if (viewportRefreshHandlersInstalled) {
    return
  }

  viewportRefreshHandlersInstalled = true

  window.addEventListener('resize', scheduleViewportIncrementalRefresh, { passive: true })
  window.addEventListener('orientationchange', scheduleViewportIncrementalRefresh, {
    passive: true,
  })
  document.addEventListener('scroll', scheduleViewportIncrementalRefresh, {
    capture: true,
    passive: true,
  })
  window.visualViewport?.addEventListener('resize', scheduleViewportIncrementalRefresh, {
    passive: true,
  })
  window.visualViewport?.addEventListener('scroll', scheduleViewportIncrementalRefresh, {
    passive: true,
  })
}

function ensureObserver() {
  if (state.observer) {
    return
  }

  installViewportRefreshHandlers()

  state.observer = new MutationObserver((mutations) => {
    const shouldRefresh = mutations.some((mutation) => {
      if (mutation.type === 'attributes') {
        return isRelevantVisibilityAttributeMutation(mutation)
      }

      if (mutation.type === 'characterData') {
        return !isExtensionOwnedNode(mutation.target)
      }

      if (mutation.type !== 'childList') {
        return false
      }

      const addedRelevant = Array.from(mutation.addedNodes).some(
        (node) => !isExtensionOwnedNode(node),
      )
      const removedRelevant = Array.from(mutation.removedNodes).some(
        (node) => !isExtensionOwnedNode(node),
      )

      return addedRelevant || removedRelevant
    })

    if (shouldRefresh) {
      scheduleIncrementalRefresh()
    }
  })

  state.observer.observe(document.body, {
    attributes: true,
    attributeFilter: [
      'aria-expanded',
      'aria-hidden',
      'class',
      'data-open',
      'data-state',
      'hidden',
      'open',
      'style',
    ],
    childList: true,
    characterData: true,
    subtree: true,
  })
}

async function requestTranslations(
  config: PageTranslationConfig,
  segments: string[],
) {
  const response = await runtimeSendMessage<
    { ok: true; translations: string[] } | { ok: false; error: string }
  >({
    type: 'TRANSLATE_SEGMENTS',
    providerId: config.providerId,
    sourceLang: config.sourceLang,
    targetLang: config.targetLang,
    segments,
  })

  if (!response.ok) {
    throw new Error(response.error)
  }

  return response.translations
}

async function translatePage(
  config: PageTranslationConfig,
  incremental = false,
  settingsSnapshot?: ExtensionSettings,
) {
  if (state.isTranslating) {
    return false
  }

  applyPageTone()
  state.translationRunId += 1
  const runId = state.translationRunId
  state.isTranslating = true
  updateToolbarButtons()

  try {
    const settings = settingsSnapshot ?? (await loadSettingsSnapshot())
    assertTranslationRunActive(runId)
    applyUiPreferences(settings, !incremental)
    assertTranslationRunActive(runId)

    if (!incremental) {
      stopObserver()
      clearTrackedNodes()
      state.cache.clear()
    }

    const candidates = collectBlockCandidates({
      includeTracked: false,
      prioritizeVisible: incremental,
    })
    const languageKey = `${config.sourceLang}:${config.targetLang}`
    const unresolved = new Map<string, string[]>()
    const blockEntries: TranslationEntry[] = candidates.map((candidate) => {
      const translationNode = getTranslationNode(
        candidate.element,
        candidate.renderMode,
        candidate.inlineLayout,
      )
      const cacheKey = `${languageKey}:${candidate.text}`
      return {
        ...candidate,
        cacheKey,
        translationNode,
      }
    })

    for (const entry of blockEntries) {
      entry.element.setAttribute(SOURCE_TRACKED_ATTR, 'true')
      entry.element.setAttribute(SOURCE_HASH_ATTR, entry.hash)
      entry.element.setAttribute(SOURCE_RENDER_MODE_ATTR, entry.renderMode)
      entry.element.setAttribute(SOURCE_CAN_HIDE_ATTR, String(entry.canHideSource))
      entry.element.setAttribute(SOURCE_INLINE_LAYOUT_ATTR, entry.inlineLayout)
      entry.element.setAttribute(SOURCE_KIND_ATTR, entry.sourceKind)
      entry.translationNode.dataset.langKey = languageKey
      entry.translationNode.hidden = false

      const cached = state.cache.get(entry.cacheKey)

      if (cached) {
        entry.translationNode.textContent = cached
        continue
      }

      const list = unresolved.get(entry.text) ?? []
      list.push(entry.cacheKey)
      unresolved.set(entry.text, list)
    }

    const missingSegments = Array.from(unresolved.keys())

    if (missingSegments.length > 0) {
      const batches = splitTranslationRequestBatches(missingSegments)
      const startedAt = performance.now()

      updateToolbarStatus(
        incremental
          ? `发现 ${missingSegments.length} 段新增内容，分 ${batches.length} 批翻译…`
          : `准备翻译 ${missingSegments.length} 段，分 ${batches.length} 批…`,
      )

      for (const [batchIndex, batch] of batches.entries()) {
        assertTranslationRunActive(runId)
        const batchStartedAt = performance.now()
        updateToolbarStatus(
          batches.length > 1
            ? `正在翻译第 ${batchIndex + 1}/${batches.length} 批（${batch.length} 段）…`
            : `正在翻译当前页面（${batch.length} 段）…`,
        )

        const translations = await requestTranslations(config, batch)
        assertTranslationRunActive(runId)

        batch.forEach((segment, index) => {
          const translation = translations[index]
          const keys = unresolved.get(segment) ?? []

          for (const key of keys) {
            state.cache.set(key, translation)
          }
        })

        applyResolvedTranslations(blockEntries)
        updateToolbarStatus(
          batches.length > 1
            ? `已完成第 ${batchIndex + 1}/${batches.length} 批，用时 ${Math.round(performance.now() - batchStartedAt)}ms`
            : `翻译响应完成，用时 ${Math.round(performance.now() - startedAt)}ms`,
        )
      }
    }

    assertTranslationRunActive(runId)
    applyResolvedTranslations(blockEntries)

    const effectiveConfig = {
      ...config,
      displayMode: resolveRequestedDisplayMode(
        state.pendingDisplayMode ?? state.currentConfig?.displayMode ?? null,
        config.displayMode,
      ),
    }

    state.currentConfig = effectiveConfig
    state.pendingDisplayMode = null
    state.translated = true
    state.blockCount = trackedSourceCount()
    applyDisplayMode(effectiveConfig.displayMode)
    ensureObserver()
    updateToolbarStatus(
      incremental
        ? missingSegments.length > 0
          ? `已增量更新 ${missingSegments.length} 段，当前共 ${state.blockCount} 段`
          : `已检查新增内容，当前共 ${state.blockCount} 段`
        : `翻译完成，共处理 ${state.blockCount} 段`,
    )
    return true
  } catch (error) {
    if (isTranslationCancelledError(error)) {
      return false
    }

    if (handleInvalidatedContext(error)) {
      return false
    }

    throw error
  } finally {
    if (state.translationRunId === runId) {
      state.isTranslating = false
    }
    updateToolbarButtons()
  }
}

function restorePage() {
  invalidateActiveTranslationRun()
  window.clearTimeout(state.refreshTimer)
  state.refreshTimer = 0
  clearTrackedNodes()

  state.translated = false
  state.blockCount = 0
  state.displayMode = 'original'
  state.currentConfig = null
  state.pendingDisplayMode = null
  stopObserver()
  clearTranslationSession()
  updateToolbarStatus('已恢复原文。')
  updateToolbarButtons()
}

function currentPageState(): PageTranslationState {
  return {
    translated: state.translated,
    displayMode: state.displayMode,
    blockCount: state.blockCount,
    currentUrl: location.href,
    isTranslating: state.isTranslating,
    statusMessage: state.statusMessage,
    toolbarMode: state.toolbarMode,
    floatingWidgetMode: state.floatingWidgetMode,
    providerId: state.currentConfig?.providerId ?? null,
    sourceLang: state.currentConfig?.sourceLang ?? null,
    targetLang: state.currentConfig?.targetLang ?? null,
  }
}

function installHistoryHooks() {
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function pushState(...args) {
    originalPushState.apply(this, args)
    scheduleIncrementalRefresh()
  }

  history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(this, args)
    scheduleIncrementalRefresh()
  }

  window.addEventListener('popstate', () => {
    scheduleIncrementalRefresh()
  })
}

function installMessageHandler() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void (async () => {
      try {
        if (message.type === 'CONTENT_PING') {
          sendResponse({ ok: true })
          return
        }

        if (message.type === 'CONTENT_GET_PAGE_STATE') {
          sendResponse(currentPageState())
          return
        }

        if (message.type === 'CONTENT_TRANSLATE_PAGE') {
          const translated = await translatePage(message.config)
          sendResponse({ ok: true, translated })
          return
        }

        if (message.type === 'CONTENT_RESTORE_PAGE') {
          restorePage()
          sendResponse({ ok: true })
          return
        }

        if (message.type === 'CONTENT_SET_DISPLAY_MODE') {
          state.pendingDisplayMode = message.displayMode

          if (state.currentConfig) {
            state.currentConfig = {
              ...state.currentConfig,
              displayMode: message.displayMode,
            }
          }

          if (state.translated) {
            applyDisplayMode(message.displayMode)
          }
          sendResponse({ ok: true })
          return
        }

        if (message.type === 'CONTENT_SYNC_SETTINGS') {
          applyUiPreferencePatch(message.settings)
          sendResponse({ ok: true })
          return
        }
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : '页面翻译失败',
        })
      }
    })()

  return true
  })
}

installRuntimeGuards()
installHistoryHooks()
installMessageHandler()
void bootstrapUi()
