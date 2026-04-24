import type { PendingAutoRule, PendingWidgetSiteAccess } from './types'

const PENDING_AUTO_RULE_TTL_MS = 5 * 60 * 1000

export function isPendingAutoRuleFresh(
  pendingRule: PendingAutoRule | undefined,
  now = Date.now(),
) {
  if (!pendingRule) {
    return false
  }

  return now - pendingRule.requestedAt <= PENDING_AUTO_RULE_TTL_MS
}

export function canFinalizePendingAutoRule(
  pendingRule: PendingAutoRule | undefined,
  grantedOrigins: string[],
  now = Date.now(),
) {
  if (!isPendingAutoRuleFresh(pendingRule, now)) {
    return false
  }

  return grantedOrigins.includes(pendingRule!.rule.pattern)
}

export function isPendingWidgetSiteAccessFresh(
  pendingAccess: PendingWidgetSiteAccess | undefined,
  now = Date.now(),
) {
  if (!pendingAccess) {
    return false
  }

  return now - pendingAccess.requestedAt <= PENDING_AUTO_RULE_TTL_MS
}

export function canFinalizePendingWidgetSiteAccess(
  pendingAccess: PendingWidgetSiteAccess | undefined,
  grantedOrigins: string[],
  now = Date.now(),
) {
  if (!isPendingWidgetSiteAccessFresh(pendingAccess, now)) {
    return false
  }

  return grantedOrigins.includes(pendingAccess!.pattern)
}
