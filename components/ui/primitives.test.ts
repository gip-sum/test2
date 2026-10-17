import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement, type FC, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DASHBOARD_STATUSES } from '@/lib/dashboard/model'
import { LISTING_STATUS } from '@/lib/listings/types'
import { STATUS_BADGE_LABEL, statusToneClass } from '@/lib/listings/status-tone'
import { buttonClassName } from './Button'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { SmoothTabs } from './SmoothTabs'
import { StatusBadge } from './StatusBadge'

// createElement types children as a prop; JSX is unavailable in a .test.ts.
const html = (type: unknown, props: Record<string, unknown>, ...children: ReactNode[]) =>
  renderToStaticMarkup(createElement(type as FC, props, ...children))

describe('StatusBadge (UI-05)', () => {
  it('renders every real status with its shared label and tone', () => {
    for (const status of new Set([...DASHBOARD_STATUSES, ...LISTING_STATUS])) {
      const out = html(StatusBadge, { status })
      expect(out, status).toContain(STATUS_BADGE_LABEL[status])
      for (const cls of statusToneClass(status).split(' ')) expect(out, status).toContain(cls)
      expect(out, status).toContain('<span class="sr-only">Status: </span>')
    }
  })

  it('drops the hidden "Status:" when it is itself a status region', () => {
    const out = html(StatusBadge, { status: 'ACTIVE', role: 'status' })
    expect(out).toContain('role="status"')
    expect(out).not.toContain('Status: ')
  })
})

describe('EmptyState and ErrorState (UI-05)', () => {
  it('EmptyState has a heading, the explanation, an optional action and a decorative icon', () => {
    const out = html(EmptyState, { title: 'No enquiries yet', action: createElement('a', { href: '/buy/kolkata' }, 'Browse'), icon: createElement('svg') }, 'Explore homes.')
    expect(out).toMatch(/<h2[^>]*>No enquiries yet<\/h2>/)
    expect(out).toContain('Explore homes.')
    expect(out).toContain('href="/buy/kolkata"')
    expect(out).toMatch(/<span aria-hidden="true"[^>]*><svg/)
    expect(html(EmptyState, { title: 'Nothing' })).not.toContain('mt-5')
  })

  it('ErrorState is an alert by default and can opt out', () => {
    expect(html(ErrorState, {}, 'Could not load.')).toContain('role="alert"')
    expect(html(ErrorState, { role: null }, 'Could not load.')).not.toContain('role=')
  })

  it('ErrorState renders only the copy it is given', () => {
    const out = html(ErrorState, { title: 'Unavailable' }, 'Please try again.')
    expect(out.replace(/<[^>]+>/g, '')).toBe('UnavailablePlease try again.')
  })
})

describe('SmoothTabs (Kokonut-derived, UI-05)', () => {
  const tabs = (value: 'buy' | 'rent') => html(SmoothTabs, {
    items: [{ value: 'buy', label: 'Buy' }, { value: 'rent', label: 'Rent' }], value, onChange: () => {}, label: 'Search intent', idPrefix: 'intent',
  })

  it('server-renders a complete tab list with the selected tab already visible', () => {
    const out = tabs('rent')
    expect(out).toContain('role="tablist"')
    expect(out).toContain('aria-label="Search intent"')
    expect(out).toMatch(/id="intent-buy" aria-selected="false" tabindex="-1"/)
    expect(out).toMatch(/id="intent-rent" aria-selected="true" tabindex="0"/)
    // Before the indicator is measured the selected tab is its own pill, so
    // no-JS, slow devices and the first frame all show which tab is active.
    expect(out).not.toContain('data-indicator')
    expect(out).toMatch(/aria-selected="true"[^>]*class="[^"]*bg-brand-600 text-on-brand/)
    expect(out).not.toContain('aria-hidden')
  })

  it('carries its provenance and none of the upstream demo styling', () => {
    const source = readFileSync(join(process.cwd(), 'components/ui/SmoothTabs.tsx'), 'utf8')
    expect(source).toContain('bb9120f8711b63eb5a7545976cac7493d49e616c')
    expect(source).toContain('MIT License')
    // Code only: the provenance comment names what was removed.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/\bdark:|zinc-|lucide-react|from 'motion/)
  })
})

describe('Button sizes (UI-05)', () => {
  it('sets a minimum height, so a long label wraps instead of overflowing', () => {
    expect(buttonClassName({ size: 'md' })).toContain('min-h-11')
    expect(buttonClassName({ size: 'lg' })).toContain('min-h-12')
    expect(buttonClassName({ size: 'md' })).not.toMatch(/(^| )h-11( |$)/)
  })
})
