import type { SiteRule } from './types'

export function createOriginPattern(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)

    if (!/^https?:$/.test(url.protocol)) {
      return null
    }

    return `${url.protocol}//${url.host}/*`
  } catch {
    return null
  }
}

export function matchPattern(pattern: string, rawUrl: string): boolean {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }

  const matcher = pattern
    .replace(/\*/g, '__STAR__')
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/__STAR__/g, '.*')

  return new RegExp(`^${matcher}$`).test(`${url.protocol}//${url.host}${url.pathname}`)
}

function ruleScore(pattern: string) {
  return pattern.replace(/\*/g, '').length
}

export function findMatchingRule(rawUrl: string, rules: SiteRule[]): SiteRule | null {
  const candidates = rules
    .filter((rule) => rule.enabled && matchPattern(rule.pattern, rawUrl))
    .sort((left, right) => {
      const scoreDifference = ruleScore(right.pattern) - ruleScore(left.pattern)

      if (scoreDifference !== 0) {
        return scoreDifference
      }

      if (left.mode !== right.mode) {
        if (left.mode === 'never') {
          return -1
        }

        if (right.mode === 'never') {
          return 1
        }
      }

      return right.updatedAt - left.updatedAt
    })

  return candidates[0] ?? null
}

export function validatePattern(pattern: string): boolean {
  return /^https?:\/\/.+\/\*$/.test(pattern.trim())
}

export function inferRuleLabel(pattern: string): string {
  const sanitized = pattern
    .replace(/^https?:\/\//, '')
    .replace(/\/\*$/, '')

  return sanitized
}

export function buildRuleId() {
  return `rule-${crypto.randomUUID()}`
}

export function normalizePattern(pattern: string): string {
  return pattern.trim()
}
