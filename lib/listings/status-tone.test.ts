import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADMIN_STATUSES } from '@/lib/admin/model'
import { DASHBOARD_LABEL, DASHBOARD_STATUSES } from '@/lib/dashboard/model'
import { LISTING_STATUS, STATUS_LABEL } from '@/lib/listings/types'
import { ACCOUNT_STATUSES } from '@/lib/users/model'
import { isBadgeStatus, LISTING_STATUS_TONE, STATUS_BADGE_LABEL, STATUS_TONE_CLASS, statusToneClass } from './status-tone'

// Resolve @theme colour tokens (following var() aliases) to their light values.
const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
const theme = css.slice(css.indexOf('@theme {'), css.indexOf('\n}', css.indexOf('@theme {')))
const raw = Object.fromEntries([...theme.matchAll(/^\s*--color-([a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1]!, m[2]!.trim()]))
const resolve = (name: string): string => { const v = raw[name]; if (!v) throw new Error(`no token ${name}`); const alias = /^var\(--color-([a-z0-9-]+)\)$/.exec(v); return alias ? resolve(alias[1]!) : v }
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05) }
const pair = (cls: string) => {
  const bg = /bg-([a-z0-9-]+)/.exec(cls)![1]!, fg = /text-([a-z0-9-]+)/.exec(cls)![1]!
  return { bg: resolve(bg), fg: resolve(fg) }
}

describe('listing status tones', () => {
  it('covers every status the owner and admin screens display, the stored lifecycle and account status (UI-11)', () => {
    const all = [...new Set([...DASHBOARD_STATUSES, ...LISTING_STATUS, ...ACCOUNT_STATUSES])].sort()
    expect(Object.keys(LISTING_STATUS_TONE).sort()).toEqual(all)
    expect(Object.keys(STATUS_BADGE_LABEL).sort()).toEqual(all)
    expect([...ADMIN_STATUSES].sort()).toEqual([...DASHBOARD_STATUSES].sort())
  })

  it('gives an account ACTIVE the meaning a listing ACTIVE has, and draws badges only for known strings', () => {
    expect(STATUS_BADGE_LABEL.ACTIVE).toBe('Active')
    expect(LISTING_STATUS_TONE.ACTIVE).toBe('live')
    expect(LISTING_STATUS_TONE.SUSPENDED).toBe('problem')
    expect(['ACTIVE', 'SUSPENDED', 'DELETED', 'WITHDRAWN'].every(isBadgeStatus)).toBe(true)
    expect(isBadgeStatus('SOLD_OR_RENTED')).toBe(false)
  })

  it('reads the same in both vocabularies wherever they share a status', () => {
    for (const status of LISTING_STATUS) {
      if (status in DASHBOARD_LABEL) expect(STATUS_LABEL[status], status).toBe(DASHBOARD_LABEL[status as keyof typeof DASHBOARD_LABEL])
    }
  })

  it('uses only tone tokens defined in @theme', () => {
    for (const cls of Object.values(STATUS_TONE_CLASS)) expect(() => pair(cls)).not.toThrow()
  })

  it('renders exactly the colours the badge used before the mapping existed', () => {
    const before: Record<string, [string, string]> = {
      DRAFT: ['neutral-100', 'neutral-600'], UNDER_REVIEW: ['warn-100', 'warn-600'], ACTIVE: ['trust-100', 'trust-600'],
      EXPIRED: ['neutral-100', 'neutral-600'], REJECTED: ['danger-100', 'danger-600'], CHANGES_REQUESTED: ['warn-100', 'warn-600'],
      WITHDRAWN: ['neutral-100', 'neutral-600'], REMOVED: ['neutral-100', 'neutral-600'],
    }
    for (const status of DASHBOARD_STATUSES) {
      expect(pair(statusToneClass(status)), status).toEqual({ bg: resolve(before[status]![0]), fg: resolve(before[status]![1]) })
    }
  })

  it('keeps every label readable on its tone (WCAG AA, 4.5:1)', () => {
    for (const [tone, cls] of Object.entries(STATUS_TONE_CLASS)) {
      const { bg, fg } = pair(cls)
      expect(contrast(fg, bg), tone).toBeGreaterThanOrEqual(4.5)
    }
  })
})
