import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isProtected, walkCss, type CssDecl } from './css-walk'

// Radius, type size, transition timing and elevation come from the @theme
// scales (UI-03). A literal outside the scale is allowed only when it is
// listed below with the reason it stays and the stage that resolves it. The
// lists must match exactly, so they can only shrink: a new literal fails,
// and so does removing one without deleting its entry.
//
// The frozen login and 404 scenes are out of scope by design (isProtected).

const RADIUS_OK = /^(0|inherit|var\(--radius-(sm|md|lg|full)\)|calc\(var\(--radius-(sm|md|lg)\) - 1px\))$/
const SIZE_OK = /^(inherit|var\(--text-[a-z0-9-]+\))$/
// Elevation must be a token; flat rings and inset indicator bars (no blur,
// token colour) are shapes, not shadows, and may be written out.
const SHADOW_PART_OK = /^(none|var\(--shadow-[a-z0-9]+\)|(inset )?-?\d+(px)? -?\d+(px)?( 0( -?\d+px)?)? var\(--color-[a-z0-9-]+\))$/

const DEFERRED_CSS: Record<string, string> = {
  // Permanent: the focus outline hugs text links; the base layer lets components override it.
  ':focus-visible | 2px': 'focus ring shape',
  // 16px tiles and cards sit between md (12) and lg (20): either is a 4px change. UI-05 decides the card radius.
  '.calc-peek | 16px': 'UI-05 cards', '.calc-sibling | 16px': 'UI-05 cards', '.discovery-band | 16px': 'UI-05 cards',
  '.type-tile | 16px': 'UI-05 cards', '.why-point | 16px': 'UI-05 cards',
  // The approved compact workspace uses 8px panels by design (concept 1). UI-09 revisits the workspace.
  '.workspace-panel | 8px': 'UI-09 workspace', '.workspace-toolbar | 8px': 'UI-09 workspace', '.workspace-summary | 8px': 'UI-09 workspace',
  '.workspace-empty | 8px': 'UI-09 workspace', '.workspace-content .rounded-lg | 8px': 'UI-09 workspace',
  // Phase E reference controls (client-approved). UI-06 revisits the public pages.
  '.reference-search-trigger | 8px': 'UI-06 public', '.reference-home .compact-card > div:first-child | 8px': 'UI-06 public',
  '.seller-invitation @media (min-width: 768px) | 26px': 'UI-06 public',
  // Display and compact sizes off the 13-step type scale. Each is 1–3px from a
  // step, and several are Phase E reference sizes; moving them changes
  // approved layouts, so they move with their components in UI-05/06/09.
  '.activity-homes .compact-card h3 | 14px': 'UI-06', '.all-localities a | 14px': 'UI-06', '.all-localities summary | 14px': 'UI-06',
  '.calc-cta | 14px': 'UI-05', '.calc-figures dd | 14px': 'UI-06', '.calc-reason | 14px': 'UI-06', '.calc-schedule summary | 14px': 'UI-06',
  '.count-tile-label | 14px': 'UI-06', '.hub-sell-link | 14px': 'UI-06', '.nav-panel-hub .hub-label | 14px': 'UI-06', '.reference-login | 14px': 'UI-06',
  '.calc-hero-unit | 16px': 'UI-06', '.hub-post .hub-label | 16px': 'UI-06', '.locality-panel h3 | 16px': 'UI-06',
  '.activity-homes h2 | 18px': 'UI-06', '.activity-welcome h1 | 18px': 'UI-06', '.marketplace-dialog > header h2 | 18px': 'UI-05',
  '.menu-welcome strong | 18px': 'UI-06', '.workspace-content :where(h2) | 18px': 'UI-09', '.workspace-counts dd @media (max-width: 639px) | 18px': 'UI-09',
  '.possession-section strong | 19px': 'UI-06', '.discovery-band-title h2 | 21px': 'UI-06', '.home-content h2 | 21px': 'UI-06',
  '.reference-home .home-section-head h2, .possession-section h2 | 21px': 'UI-06', '.footer-intro p @media (max-width: 767px) | 23px': 'UI-06',
  '.workspace-title @media (max-width: 639px) | 23px': 'UI-09', '.home-content h2 @media (min-width: 640px) | 26px': 'UI-06',
  '.reference-home .home-section-head h2 @media (min-width: 1024px) | 26px': 'UI-06', '.seller-invitation h2 | 26px': 'UI-06',
  '.reference-banner h1 | 27px': 'UI-06', '.footer-intro p | 28px': 'UI-06', '.home-content h2 @media (min-width: 1024px) | 30px': 'UI-06',
  '.calc-hero | 34px': 'UI-06', '.seller-invitation h2 @media (min-width: 768px) | 36px': 'UI-06', '.calc-hero @media (min-width: 1024px) | 40px': 'UI-06',
  '.reference-banner h1 @media (min-width: 1024px) | 40px': 'UI-06', '.seller-invitation h2 @media (min-width: 1101px) | 42px': 'UI-06',
  // Permanent: a decorative 140px glyph inside the seller band's orbit, not text.
  '.seller-orbit span | 140px': 'decorative glyph',
}

// Arbitrary values in TSX, by file. Same rule: listed, reasoned, shrinking.
const DEFERRED_TSX: Record<string, string[]> = {
  // Dashboard figures: 1px off heading-2. UI-05/UI-09.
  'app/dashboard/enquiries/page.tsx': ['text-[26px]'],
  // The period tiles moved out of the performance page (UI-10), the same one figure.
  // The login form card. UI-07 owns the login screen; UI-03 leaves it exactly as it is.
  'components/auth/LoginForm.tsx': ['rounded-[24px]', 'text-[36px]', 'leading-[1.1]', 'text-[22px]'],
  // The Videos placeholder tile (16px, Tailwind's default 2xl step). UI-05 cards.
  'app/videos/page.tsx': ['rounded-2xl'],
}

const root = process.cwd()
const walk = (dir: string, ext: RegExp): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path, ext) : ext.test(name) && !name.endsWith('.test.ts') ? [path] : []
})
const keyOf = (d: CssDecl) => `${d.selector}${d.atRules.filter((a) => !a.startsWith('@layer')).map((a) => ' ' + a).join('')} | ${d.value}`

function offScaleCss(): Record<string, string> {
  const found: Record<string, string> = {}
  for (const file of [...walk(join(root, 'app'), /\.css$/), ...walk(join(root, 'components'), /\.css$/)]) {
    for (const d of walkCss(readFileSync(file, 'utf8'))) {
      if (d.prop.startsWith('--') || isProtected(d, file) || d.atRules.some((a) => a.startsWith('@theme'))) continue
      const where = relative(root, file)
      if (/radius/.test(d.prop) && !RADIUS_OK.test(d.value)) found[keyOf(d)] = `${where} radius`
      if (d.prop === 'font-size' && !SIZE_OK.test(d.value)) found[keyOf(d)] = `${where} font-size`
      // The reduced-motion rule's 0.01ms is the one literal duration that must stay.
      if (/^transition/.test(d.prop) && /\d+m?s\b/.test(d.value.replace(/var\([^)]*\)/g, '')) && !/prefers-reduced-motion/.test(d.atRules.join(' '))) found[keyOf(d)] = `${where} duration`
      if (d.prop === 'box-shadow' && !d.value.split(/,(?![^(]*\))/).every((p) => SHADOW_PART_OK.test(p.trim()))) found[keyOf(d)] = `${where} shadow`
    }
  }
  return found
}

const ARBITRARY_TSX = /\b(?:rounded(?:-[trblse]{1,2})?-\[[^\]]+\]|text-\[[0-9.]+(?:px|rem)\]|leading-\[[^\]]+\]|shadow-\[[^\]]+\]|duration-\[[^\]]+\]|duration-\d+|rounded-(?:xs|xl|2xl|3xl|4xl))(?![\w-])/g

describe('design scales', () => {
  it('keeps every CSS radius, size, duration and shadow on the scale or deferred with a reason', () => {
    expect(Object.keys(offScaleCss()).sort()).toEqual(Object.keys(DEFERRED_CSS).sort())
  })

  it('keeps arbitrary TSX values to the deferred list', () => {
    const found: Record<string, string[]> = {}
    for (const file of [...walk(join(root, 'app'), /\.tsx$/), ...walk(join(root, 'components'), /\.tsx$/)]) {
      const hits = [...readFileSync(file, 'utf8').matchAll(ARBITRARY_TSX)].map((m) => m[0])
      if (hits.length) found[relative(root, file)] = hits
    }
    for (const list of [...Object.values(found), ...Object.values(DEFERRED_TSX)]) list.sort()
    expect(found).toEqual(DEFERRED_TSX)
  })

  it('accepts the forms the scale allows', () => {
    expect(['var(--radius-md)', 'calc(var(--radius-md) - 1px)', '0'].every((v) => RADIUS_OK.test(v))).toBe(true)
    expect(['var(--shadow-e2)', 'inset 3px 0 0 var(--color-brand-600)', '0 0 0 3px var(--color-supply-700)', 'inset 0 1px var(--color-glass-highlight)'].every((v) => SHADOW_PART_OK.test(v))).toBe(true)
    expect(SHADOW_PART_OK.test('0 12px 32px var(--color-forest)')).toBe(false)
    expect(RADIUS_OK.test('14px')).toBe(false)
  })
})
