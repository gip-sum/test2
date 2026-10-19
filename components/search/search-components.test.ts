import { createElement, type FC } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { buttonClassName } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { SearchLoadingState } from './SearchLoadingState'

// The loading fallback renders inside the page shell (UI-15), whose header
// reads the route; give it the results route it streams under.
vi.mock('next/navigation', () => ({
  usePathname: () => '/buy/kolkata',
  useRouter: () => ({ push: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))

const html = (type: unknown, props: Record<string, unknown>) => renderToStaticMarkup(createElement(type as FC, props))

describe('search progressive enhancement (UI-06)', () => {
  it('the loading fallback carries the no-JavaScript reveal, inside <noscript>', () => {
    const out = html(SearchLoadingState, {})
    expect(out).toContain('data-search-fallback=""')
    // Inside noscript: a browser with JavaScript never applies it.
    expect(out).toMatch(/<noscript><style>\[data-search-fallback\]\{display:none!important\}@layer theme\{div\[hidden\]\[id\^="S:"\]\{display:block!important\}\}<\/style><\/noscript>/)
    // The header is inside the fallback, so the reveal swaps the whole shell
    // for the streamed page's own: one header without JavaScript, not two.
    expect(out.indexOf('data-search-fallback')).toBeLessThan(out.indexOf('<header'))
  })

  it('a chip whose removal is navigation renders a real link with the same name', () => {
    const out = html(Chip, { label: '2 BHK', removeLabel: 'Remove filter: 2 BHK', onRemove: () => {}, removeHref: '/buy/kolkata' })
    expect(out).toMatch(/<a href="\/buy\/kolkata" aria-label="Remove filter: 2 BHK"/)
    expect(out).not.toContain('<button')
  })

  it('a chip without an href keeps its button', () => {
    expect(html(Chip, { label: '2 BHK', onRemove: () => {} })).toMatch(/<button type="button" aria-label="Remove 2 BHK"/)
  })

  it('the outline Button variant is the brand outline the five hand-drawn copies used', () => {
    const cls = buttonClassName({ variant: 'outline' })
    for (const c of ['border-brand-700', 'text-brand-700', 'hover:bg-brand-100', 'bg-transparent']) expect(cls).toContain(c)
  })
})
