const BLOCK_SELECTOR = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'legend',
  'dt',
  'p',
  'li',
  'blockquote',
  'figcaption',
  'td',
  'th',
  'summary',
  '[role="heading"]',
].join(', ')

const INLINE_SELECTOR = [
  'button',
  'a',
  'label',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  'span',
  'div',
].join(', ')

const PRIORITY_INLINE_SELECTOR = [
  '.react-directory-row-commit-cell a',
  '.react-directory-row-commit-cell span',
  '[class*="react-directory-row-commit-cell"] a',
  '[class*="react-directory-row-commit-cell"] span',
  '[data-testid*="commit" i] a',
  '[data-testid*="commit" i] span',
].join(', ')

const GENERATED_NODE_SELECTOR = '[data-browser-translator-generated="true"]'
const TRACKED_SOURCE_SELECTOR = '[data-browser-translator-source="true"]'

const HARD_EXCLUDED_SELECTOR = [
  'script',
  'style',
  'code',
  'pre',
  'textarea',
  'input',
  'select',
  'option',
  '#browser-translator-toolbar',
  GENERATED_NODE_SELECTOR,
  '[data-browser-translator-ignore="true"]',
].join(', ')

const BLOCK_EXCLUDED_SELECTOR = [
  HARD_EXCLUDED_SELECTOR,
  'nav',
  'footer',
  'header',
  'menu',
].join(', ')

const UI_CONTEXT_SELECTOR = [
  'nav',
  'header',
  'aside',
  'form',
  'dialog',
  '[role="navigation"]',
  '[role="toolbar"]',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tooltip"]',
  '[aria-modal="true"]',
  '[aria-label$="menu" i]',
  '[data-radix-popper-content-wrapper]',
  '[data-radix-dropdown-menu-content]',
  '[data-radix-select-content]',
  '[data-headlessui-portal]',
  '[data-radix-portal]',
].join(', ')

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'label',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
].join(', ')

const OVERLAY_ROOT_SELECTOR = [
  'dialog',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tooltip"]',
  '[aria-modal="true"]',
  '[aria-label$="menu" i]',
  '[data-radix-popper-content-wrapper]',
  '[data-radix-dropdown-menu-content]',
  '[data-radix-select-content]',
  '[data-headlessui-portal]',
  '[data-radix-portal]',
].join(', ')

const UI_ROOT_SELECTOR = [
  'aside',
  'nav',
  'header',
  'form',
  '[role="navigation"]',
  '[role="toolbar"]',
  '[role="menubar"]',
  '[role="tablist"]',
].join(', ')

const IMPORTANT_UI_LABELS = new Set([
  'advanced',
  'about',
  'actions',
  'activity',
  'audio',
  'available add-ons',
  'best of',
  'blog',
  'branches',
  'careers',
  'code',
  'code of conduct',
  'contests',
  'contributors',
  'covers',
  'create',
  'disliked',
  'discussions',
  'docs',
  'earn credits',
  'enterprise',
  'enterprise platform',
  'enterprise solutions',
  'explore',
  'extensions',
  'feedback',
  'filters',
  'filters (3)',
  'folders and files',
  'full songs',
  'github advanced security',
  'go to file',
  'help',
  'history',
  'home',
  'hooks',
  'hide disliked',
  'hide stems',
  'insights',
  'inspiration',
  'instrumental',
  'invite friends',
  'jump back in',
  'last commit date',
  'last commit message',
  'latest commit',
  'library',
  'license',
  'liked',
  'lyrics',
  'name',
  'least liked',
  'made with studio',
  'more',
  'most liked',
  'newest',
  'notifications',
  'oldest',
  'open source',
  'platform',
  'premium support',
  'pricing',
  'privacy',
  'private',
  'public',
  'pull requests',
  'remasters',
  'releases',
  'report repository',
  'reset filters',
  'resources',
  'search',
  'security and quality',
  'see all',
  'sign in',
  'sign up',
  'simple',
  'song description',
  'sounds',
  'solutions',
  'sponsor this project',
  'staff picks',
  'star',
  'studio',
  'tags',
  'terms of service',
  'topics',
  'trending: text to song',
  'uploads',
  'voices',
  'watchers',
  "what's new?",
  'workspaces',
])

const CANDIDATE_LIMIT = 120

export type InlineLayout = 'flow' | 'overlay' | 'stacked'

export interface BlockCandidate {
  element: HTMLElement
  text: string
  hash: string
  renderMode: 'block' | 'inline'
  canHideSource: boolean
  inlineLayout: InlineLayout
  sourceKind: 'interactive' | 'plain'
}

export interface CollectBlockCandidatesOptions {
  includeTracked?: boolean
  prioritizeVisible?: boolean
}

export function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function shouldCollectElement({
  includeTracked,
  isTracked,
}: {
  includeTracked: boolean
  isTracked: boolean
}) {
  return includeTracked || !isTracked
}

export function hashText(value: string) {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }

  return (hash >>> 0).toString(16)
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()

  return (
    style.display !== 'none'
    && style.visibility !== 'hidden'
    && Number.parseFloat(style.opacity) !== 0
    && rect.width > 0
    && rect.height > 0
  )
}

function textThreshold(tagName: string) {
  if (/^H[1-6]$/.test(tagName)) {
    return 3
  }

  return 18
}

function isInteractive(element: HTMLElement) {
  return element.matches(INTERACTIVE_SELECTOR)
}

function normalizeUiLabelKey(text: string) {
  return normalizeText(text).toLowerCase()
}

function isImportantUiLabel(text: string) {
  const key = normalizeUiLabelKey(text)

  return IMPORTANT_UI_LABELS.has(key) || /^filters\s*\(\d+\)$/i.test(key)
}

function interactiveHostFor(element: HTMLElement) {
  return element.closest<HTMLElement>(INTERACTIVE_SELECTOR)
}

function hasMeaningfulChildText(element: HTMLElement) {
  return Array.from(element.children).some((child) => {
    if (
      !(child instanceof HTMLElement)
      || !isVisible(child)
      || child.matches(GENERATED_NODE_SELECTOR)
    ) {
      return false
    }

    return getElementText(child).length >= 2
  })
}

function directTextContent(element: HTMLElement) {
  return normalizeText(
    Array.from(element.childNodes)
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent ?? '')
      .join(' '),
  )
}

function isUiContext(element: HTMLElement) {
  return Boolean(element.closest(UI_CONTEXT_SELECTOR) || element.closest(INTERACTIVE_SELECTOR))
}

function isUiSurfaceContext(element: HTMLElement) {
  return Boolean(
    element.closest(
      [
        UI_CONTEXT_SELECTOR,
        'main',
        'section',
        '[role="main"]',
        '[role="group"]',
        '[data-state]',
      ].join(', '),
    ),
  )
}

function inlineTextThreshold(text: string) {
  return text.length >= 2 && text.length <= 72
}

export function shouldSkipInlineText(text: string) {
  const normalized = normalizeText(text)

  if (!normalized) {
    return true
  }

  if (/^[vV]?\d+(?:[./:-]\d+)*(?:\s*(?:k|m|b|kb|mb|gb|tb|bpm|fps|hz|ms|s|min|mins|hr|hrs|%))?$/i.test(normalized)) {
    return true
  }

  if (/^\d+\s*\/\s*\d+$/.test(normalized)) {
    return true
  }

  if (/^[\d\s./:+\-()%]+$/.test(normalized)) {
    return true
  }

  const digitCount = (normalized.match(/\d/g) ?? []).length
  const latinCount = (normalized.match(/[A-Za-z]/g) ?? []).length
  const cjkCount = (normalized.match(/[\u4E00-\u9FFF]/g) ?? []).length
  const alphaNumericCount = digitCount + latinCount

  return (
    digitCount > 0
    && cjkCount === 0
    && (
      (latinCount <= 2 && normalized.length <= 12)
      || (
        alphaNumericCount > 0
        && digitCount / alphaNumericCount >= 0.35
        && normalized.length <= 18
      )
    )
  )
}

export function shouldSkipCompactUiLabel(
  text: string,
  width: number,
  height: number,
) {
  const normalized = normalizeText(text)

  if (!normalized) {
    return true
  }

  if (isImportantUiLabel(normalized)) {
    return false
  }

  if (/^[A-Za-z][A-Za-z'-]{1,18}$/.test(normalized) && normalized.length <= 10) {
    return false
  }

  if (width > 108 || height > 40) {
    return false
  }

  if (normalized.includes(' ') && width <= 72 && normalized.length <= 12) {
    return true
  }

  if (/[&/+_-]/.test(normalized) && normalized.length >= 4) {
    return true
  }

  return normalized.length > 9 && !/[()]/.test(normalized)
}

export function shouldSkipNestedInteractiveText({
  isSelfInteractive,
  hasInteractiveHost,
}: {
  isSelfInteractive: boolean
  hasInteractiveHost: boolean
}) {
  return hasInteractiveHost && !isSelfInteractive
}

export function shouldSkipDenseChipCandidate({
  width,
  height,
  peerCount,
}: {
  width: number
  height: number
  peerCount: number
}) {
  return peerCount >= 6 && width <= 160 && height <= 44
}

export function shouldUseOverlayInlineLayout({
  hasVisualAddon,
  height,
  isInteractiveElement,
  isOverlaySurface,
  text,
  width,
}: {
  hasVisualAddon: boolean
  height: number
  isInteractiveElement: boolean
  isOverlaySurface: boolean
  text: string
  width: number
}) {
  const normalized = normalizeText(text)

  if (
    !isInteractiveElement
    || isOverlaySurface
    || !normalized
    || normalized.length > 42
    || height > 52
    || width > 180
  ) {
    return false
  }

  if (hasVisualAddon) {
    return true
  }

  return width <= 128 && height <= 44 && normalized.length <= 24
}

export function shouldTranslateContentTitle({
  href,
  text,
}: {
  href: string | null
  text: string
}) {
  const normalized = normalizeText(text)

  return Boolean(
    href
    && href.toLowerCase().includes('/song/')
    && normalized.length >= 2
    && normalized.length <= 72
    && /[A-Za-z]/.test(normalized)
    && !shouldSkipInlineText(normalized),
  )
}

export function resolveContentTitleCandidate({
  href,
  textCandidates,
}: {
  href: string | null
  textCandidates: Array<string | null | undefined>
}) {
  for (const textCandidate of textCandidates) {
    const text = normalizeText(textCandidate ?? '')

    if (shouldTranslateContentTitle({ href, text })) {
      return text
    }
  }

  return ''
}

export function resolveInlineCandidatePresentation({
  element,
  isContentTitle,
  text,
}: {
  element: HTMLElement
  isContentTitle: boolean
  text: string
}): Pick<BlockCandidate, 'canHideSource' | 'inlineLayout' | 'renderMode'> {
  if (isContentTitle) {
    return {
      canHideSource: true,
      inlineLayout: 'stacked',
      renderMode: 'block',
    }
  }

  const inlineLayout = resolveInlineLayout(element, text)

  return {
    canHideSource: true,
    inlineLayout,
    renderMode: 'inline',
  }
}

function contentLinkHrefFor(element: HTMLElement) {
  return element.closest<HTMLAnchorElement>('a[href*="/song/"]')?.getAttribute('href')
    ?? element.getAttribute('href')
}

function isRepositoryPathLink(element: HTMLElement, text: string) {
  const href = element.closest<HTMLAnchorElement>('a[href]')?.getAttribute('href') ?? ''
  const normalized = normalizeText(text)

  return Boolean(
    /^\/[^/]+\/[^/]+\/(?:tree|blob)\//.test(href)
    && !normalized.includes(' ')
    && /^[\w./@-]+$/.test(normalized),
  )
}

function resolveContentTitleText(element: HTMLElement, href: string | null) {
  return resolveContentTitleCandidate({
    href,
    textCandidates: [
      element.innerText,
      element.textContent,
      element.getAttribute('aria-label'),
      resolveAriaLabelledbyText(element),
      element.getAttribute('title'),
    ],
  })
}

function shouldCollectDenseChipText(text: string) {
  return isImportantUiLabel(text)
}

function interactivePeerCount(element: HTMLElement) {
  const parent = element.parentElement

  if (!parent) {
    return 0
  }

  return Array.from(parent.children).filter((child) => (
    child instanceof HTMLElement
    && isVisible(child)
    && isInteractive(child)
  )).length
}

function isWideUiContext(element: HTMLElement) {
  return Boolean(
    element.closest(
      [
        'nav',
        'aside',
        '[role="navigation"]',
        '[role="menu"]',
        '[role="listbox"]',
        '[role="dialog"]',
      ].join(', '),
    ),
  )
}

function isOverlayContext(element: HTMLElement) {
  return Boolean(element.closest(OVERLAY_ROOT_SELECTOR))
}

function isSiteChromeNavigation(element: HTMLElement) {
  const chromeRoot = element.closest<HTMLElement>(
    [
      'header',
      '[role="banner"]',
      '.Header',
      '.AppHeader',
      '.AppHeader-globalBar',
      '.AppHeader-localBar',
      '.js-header-wrapper',
      'nav[aria-label="Global" i]',
      '[aria-label="Global" i]',
      'nav[aria-label="Global navigation" i]',
      '[aria-label="Global navigation" i]',
      '[data-testid="header"]',
    ].join(', '),
  )

  return Boolean(chromeRoot && !chromeRoot.closest('main, article, [role="main"]'))
}

function hasVisualAddon(element: HTMLElement) {
  return Array.from(element.children).some((child) => {
    if (
      !(child instanceof HTMLElement)
      || child.matches(GENERATED_NODE_SELECTOR)
      || !isVisible(child)
    ) {
      return false
    }

    if (
      child.matches(
        'svg, img, picture, use, [role="img"], [aria-hidden="true"], [class*="icon" i]',
      )
    ) {
      return true
    }

    const text = normalizeText(child.innerText || child.textContent || '')
    const rect = child.getBoundingClientRect()

    return !text && rect.width > 0 && rect.width <= 36 && rect.height <= 36
  })
}

function isNearViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight

  return rect.bottom >= -160 && rect.top <= viewportHeight + 480
}

function isCompositeUiBlock(element: HTMLElement) {
  if (!element.matches('li, td, th, summary')) {
    return false
  }

  return Boolean(
    element.querySelector(INTERACTIVE_SELECTOR)
    || element.closest(UI_CONTEXT_SELECTOR)
    || element.closest(UI_ROOT_SELECTOR),
  )
}

function resolveInlineLayout(element: HTMLElement, text: string): InlineLayout {
  const rect = element.getBoundingClientRect()
  const overlaySurface = isOverlayContext(element)

  if (isInteractive(element)) {
    if (overlaySurface && rect.width >= 120 && text.includes(' ')) {
      return 'stacked'
    }

    if (
      shouldUseOverlayInlineLayout({
        hasVisualAddon: hasVisualAddon(element),
        height: rect.height,
        isInteractiveElement: true,
        isOverlaySurface: overlaySurface,
        text,
        width: rect.width,
      })
    ) {
      return 'overlay'
    }

    if (isWideUiContext(element) && rect.width >= 36) {
      return 'flow'
    }

    if (rect.height <= 40 && text.length <= 18 && rect.width >= 48) {
      return 'flow'
    }

    if (element.matches('a[href], [role="menuitem"], [role="tab"]')) {
      return 'flow'
    }

    if (rect.width >= 96) {
      return 'flow'
    }

    if (rect.width >= 64 && text.length <= 10) {
      return 'flow'
    }

    return 'stacked'
  }

  if (rect.width >= 180 && text.length <= 22) {
    return 'flow'
  }

  return 'stacked'
}

function resolveUiLabelText(element: HTMLElement) {
  const directText = directTextContent(element)

  if (!directText) {
    return ''
  }

  const rect = element.getBoundingClientRect()
  const visibleChildren = Array.from(element.children).filter(
    (child): child is HTMLElement => (
      child instanceof HTMLElement
      && isVisible(child)
      && !child.matches(GENERATED_NODE_SELECTOR)
    ),
  )

  if (
    !isUiSurfaceContext(element)
    || rect.height > 44
    || directText.length > 36
    || visibleChildren.length > 3
  ) {
    return ''
  }

  const computedStyle = window.getComputedStyle(element)
  const fontWeight = Number.parseInt(computedStyle.fontWeight, 10)
  const hasSupplementaryChildren = visibleChildren.every((child) => (
    isInteractive(child)
    || child.matches('svg, img, picture, use, path')
  ))

  if (fontWeight >= 500 || hasSupplementaryChildren) {
    return directText
  }

  return ''
}

function collectOwnText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  if (node.matches(GENERATED_NODE_SELECTOR)) {
    return ''
  }

  return Array.from(node.childNodes)
    .map((child) => collectOwnText(child))
    .join(' ')
}

function resolveAriaLabelledbyText(element: HTMLElement) {
  const labelledBy = element.getAttribute('aria-labelledby')

  if (!labelledBy) {
    return ''
  }

  return normalizeText(
    labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' '),
  )
}

function resolveAccessibleFallbackText(element: HTMLElement) {
  const accessibleLabel = normalizeText(
    element.getAttribute('aria-label')
    || resolveAriaLabelledbyText(element)
    || element.getAttribute('title')
    || '',
  )

  if (accessibleLabel.length < 2 || accessibleLabel.length > 24) {
    return ''
  }

  return accessibleLabel
}

function getElementText(element: HTMLElement) {
  const visibleText = !element.querySelector(GENERATED_NODE_SELECTOR)
    ? normalizeText(element.innerText || element.textContent || '')
    : normalizeText(collectOwnText(element))

  if (visibleText) {
    return visibleText
  }

  return resolveAccessibleFallbackText(element)
}

export function dedupePrioritizedRoots<T>(
  roots: T[],
  contains: (root: T, candidate: T) => boolean,
) {
  const selected: T[] = []

  for (const root of roots) {
    if (selected.some((existing) => existing === root || contains(existing, root))) {
      continue
    }

    selected.push(root)
  }

  return selected
}

export function prioritizeCandidatePool<T>({
  candidates,
  limit,
  prioritizeVisible,
  isVisibleCandidate,
}: {
  candidates: T[]
  limit: number
  prioritizeVisible: boolean
  isVisibleCandidate: (candidate: T) => boolean
}) {
  if (!prioritizeVisible) {
    return candidates.slice(0, limit)
  }

  const visibleCandidates: T[] = []
  const deferredCandidates: T[] = []

  for (const candidate of candidates) {
    if (isVisibleCandidate(candidate)) {
      visibleCandidates.push(candidate)
    } else {
      deferredCandidates.push(candidate)
    }
  }

  return [...visibleCandidates, ...deferredCandidates].slice(0, limit)
}

function dedupeRoots(roots: HTMLElement[]) {
  return dedupePrioritizedRoots(roots, (root, candidate) => root.contains(candidate))
}

function uniqueRoots(roots: HTMLElement[]) {
  return Array.from(new Set(roots))
}

function findContentRoots() {
  const mainCandidates = Array.from(
    document.querySelectorAll<HTMLElement>('main, article, [role="main"]'),
  ).filter((element) => isVisible(element))
  const overlayCandidates = Array.from(
    document.querySelectorAll<HTMLElement>(OVERLAY_ROOT_SELECTOR),
  ).filter((element) => isVisible(element))
  const uiCandidates = Array.from(
    document.querySelectorAll<HTMLElement>(UI_ROOT_SELECTOR),
  ).filter((element) => isVisible(element))

  return uniqueRoots([
    ...dedupeRoots([...overlayCandidates, ...uiCandidates, ...mainCandidates]),
    document.body,
  ])
}

function isCompactHeading(element: HTMLElement, text: string) {
  return (
    element.matches('[role="heading"], h1, h2, h3, h4, h5, h6')
    && isUiSurfaceContext(element)
    && text.length <= 56
  )
}

export function collectBlockCandidates(
  options: CollectBlockCandidatesOptions = {},
): BlockCandidate[] {
  const includeTracked = options.includeTracked ?? false
  const prioritizeVisible = options.prioritizeVisible ?? false
  const roots = findContentRoots()
  const selected: HTMLElement[] = []
  const candidates: BlockCandidate[] = []

  for (const root of roots) {
    const elements = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))

    for (const element of elements) {
      if (!isVisible(element)) {
        continue
      }

      if (!shouldCollectElement({
        includeTracked,
        isTracked: element.matches(TRACKED_SOURCE_SELECTOR),
      })) {
        continue
      }

      if (element.closest(BLOCK_EXCLUDED_SELECTOR)) {
        continue
      }

      if (isCompositeUiBlock(element)) {
        continue
      }

      if (
        selected.some(
          (existing) => existing.contains(element) || element.contains(existing),
        )
      ) {
        continue
      }

      const text = getElementText(element)

      if (text.length < textThreshold(element.tagName)) {
        continue
      }

      const renderInline = isCompactHeading(element, text)

      selected.push(element)
      candidates.push({
        element,
        text,
        hash: hashText(text),
        renderMode: renderInline ? 'inline' : 'block',
        canHideSource: true,
        inlineLayout: renderInline ? 'flow' : 'stacked',
        sourceKind: 'plain',
      })
    }

    const inlineElements = uniqueRoots([
      ...Array.from(root.querySelectorAll<HTMLElement>(PRIORITY_INLINE_SELECTOR)),
      ...Array.from(root.querySelectorAll<HTMLElement>(INLINE_SELECTOR)),
    ])

    for (const element of inlineElements) {
      if (!isVisible(element)) {
        continue
      }

      if (!shouldCollectElement({
        includeTracked,
        isTracked: element.matches(TRACKED_SOURCE_SELECTOR),
      })) {
        continue
      }

      if (element.closest(HARD_EXCLUDED_SELECTOR)) {
        continue
      }

      if (element.closest('#browser-translator-toolbar')) {
        continue
      }

      if (isSiteChromeNavigation(element)) {
        continue
      }

      if (
        selected.some(
          (existing) => existing.contains(element) || element.contains(existing),
        )
      ) {
        continue
      }

      const interactiveHost = interactiveHostFor(element)
      const isSelfInteractive = interactiveHost === element
      const contentHref = isSelfInteractive ? contentLinkHrefFor(element) : null
      const contentTitleText = isSelfInteractive
        ? resolveContentTitleText(element, contentHref)
        : ''
      const labelText = isSelfInteractive ? '' : resolveUiLabelText(element)
      const text = contentTitleText || labelText || getElementText(element)

      if (!inlineTextThreshold(text)) {
        continue
      }

      if (isSelfInteractive && isRepositoryPathLink(element, text)) {
        continue
      }

      if (
        shouldSkipNestedInteractiveText({
          isSelfInteractive,
          hasInteractiveHost: Boolean(interactiveHost),
        })
      ) {
        continue
      }

      if (shouldSkipInlineText(text)) {
        continue
      }

      const rect = element.getBoundingClientRect()
      const isContentTitle = isSelfInteractive
        && shouldTranslateContentTitle({
          href: contentHref,
          text,
        })

      if (
        isSelfInteractive
        && !isContentTitle
        && shouldSkipCompactUiLabel(text, rect.width, rect.height)
      ) {
        continue
      }

      if (
        isSelfInteractive
        && !isContentTitle
        && shouldSkipDenseChipCandidate({
          width: rect.width,
          height: rect.height,
          peerCount: interactivePeerCount(element),
        })
        && !shouldCollectDenseChipText(text)
      ) {
        continue
      }

      if (
        !isUiContext(element)
        && !labelText
        && !isImportantUiLabel(text)
        && !isNearViewport(element)
        && candidates.length >= 6
      ) {
        continue
      }

      if (!isSelfInteractive && !labelText && hasMeaningfulChildText(element)) {
        continue
      }

      const presentation = resolveInlineCandidatePresentation({
        element,
        isContentTitle,
        text,
      })

      selected.push(element)
      candidates.push({
        element,
        text,
        hash: hashText(text),
        renderMode: presentation.renderMode,
        canHideSource: presentation.canHideSource,
        inlineLayout: presentation.inlineLayout,
        sourceKind: isSelfInteractive ? 'interactive' : 'plain',
      })
    }
  }

  return prioritizeCandidatePool({
    candidates,
    limit: CANDIDATE_LIMIT,
    prioritizeVisible,
    isVisibleCandidate: (candidate) => isNearViewport(candidate.element),
  })
}
