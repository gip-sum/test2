import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cn, FONT_FAMILIES, SHADOW_SCALE, TYPE_SCALE } from './cn'

// The token names come from app/globals.css itself, so a token added there
// without teaching cn about it fails here instead of losing classes in the UI.
const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
const theme = css.slice(css.indexOf('@theme {'), css.indexOf('\n}', css.indexOf('@theme {')))
const names = (prefix: string) =>
  [...theme.matchAll(new RegExp(`^\\s*--${prefix}-([a-z0-9-]+?):`, 'gm'))]
    .map((m) => m[1]!)
    .filter((n) => !n.includes('--'))
const typeTokens = names('text')
const colorTokens = names('color')
const shadowTokens = names('shadow')
const radiusTokens = names('radius')
const fontTokens = names('font')

describe('cn configuration matches the @theme tokens', () => {
  it('reads the token layer', () => {
    // Guards the parser: an empty list would make every test below vacuous.
    expect(typeTokens.length).toBeGreaterThanOrEqual(13)
    expect(colorTokens.length).toBeGreaterThanOrEqual(30)
    expect(shadowTokens).toContain('e2')
  })
  it('knows every type token', () => expect([...TYPE_SCALE].sort()).toEqual([...typeTokens].sort()))
  it('knows every shadow token', () => expect([...SHADOW_SCALE].sort()).toEqual([...shadowTokens].sort()))
  it('knows every font family', () => expect([...FONT_FAMILIES].sort()).toEqual([...fontTokens].sort()))
})

describe('custom tokens are never merged away', () => {
  it('keeps every type token beside every text colour token', () => {
    for (const size of typeTokens) {
      for (const color of colorTokens) {
        expect(cn(`text-${size}`, `text-${color}`)).toBe(`text-${size} text-${color}`)
        expect(cn(`text-${color}`, `text-${size}`)).toBe(`text-${color} text-${size}`)
      }
    }
  })
  it('treats a size-only token reference as a font size', () => {
    // UI-03 uses text-(length:--text-overline) where only the size of a type
    // token is wanted (a label with its own weight and tracking).
    expect(cn('text-(length:--text-overline)', 'text-ink-700')).toBe('text-(length:--text-overline) text-ink-700')
    expect(cn('text-(length:--text-overline)', 'sm:text-caption')).toBe('text-(length:--text-overline) sm:text-caption')
    expect(cn('text-(length:--text-overline)', 'text-caption')).toBe('text-caption')
  })
  it('keeps type tokens beside weight, family, leading, tracking and alignment', () => {
    expect(cn('text-label', 'font-normal')).toBe('text-label font-normal')
    expect(cn('font-display', 'text-heading-3')).toBe('font-display text-heading-3')
    expect(cn('leading-6', 'text-body')).toBe('leading-6 text-body')
    expect(cn('text-body', 'leading-6')).toBe('text-body leading-6')
    expect(cn('text-overline', 'tracking-wide')).toBe('text-overline tracking-wide')
    expect(cn('text-caption', 'text-center', 'uppercase')).toBe('text-caption text-center uppercase')
  })
  it('keeps colour tokens across different properties', () => {
    for (const color of colorTokens) {
      expect(cn(`bg-${color}`, `text-${color}`, `border-${color}`)).toBe(`bg-${color} text-${color} border-${color}`)
    }
  })
  it('keeps a border width beside a border colour token', () => {
    expect(cn('border', 'border-border-subtle')).toBe('border border-border-subtle')
    expect(cn('border-2', 'border-border-strong')).toBe('border-2 border-border-strong')
    expect(cn('border-b', 'border-border-subtle')).toBe('border-b border-border-subtle')
  })
  it('keeps radius and shadow tokens beside unrelated utilities', () => {
    for (const r of radiusTokens) expect(cn(`rounded-${r}`, 'shadow-e1', 'bg-surface-000')).toBe(`rounded-${r} shadow-e1 bg-surface-000`)
  })
  it('leaves project classes it does not know untouched', () => {
    expect(cn('tabular', 'text-caption')).toBe('tabular text-caption')
    expect(cn('bar-item', 'nav-top', 'glass-card')).toBe('bar-item nav-top glass-card')
  })
  it('keeps variants and breakpoints separate from the base class', () => {
    expect(cn('text-heading-2', 'lg:text-heading-1')).toBe('text-heading-2 lg:text-heading-1')
    expect(cn('bg-surface-200', 'dark:bg-surface-000', 'hover:bg-brand-100')).toBe('bg-surface-200 dark:bg-surface-000 hover:bg-brand-100')
    expect(cn('hidden', 'lg:block')).toBe('hidden lg:block')
  })
})

describe('genuine conflicts resolve to the last class', () => {
  it('type tokens', () => {
    expect(cn('text-body', 'text-body-sm')).toBe('text-body-sm')
    expect(cn('text-price', 'text-price-lg')).toBe('text-price-lg')
    expect(cn('text-caption', 'text-sm')).toBe('text-sm')
  })
  it('colour tokens', () => {
    expect(cn('text-ink-700', 'text-ink-900')).toBe('text-ink-900')
    expect(cn('bg-brand-600', 'hover:bg-brand-700', 'bg-supply-600')).toBe('hover:bg-brand-700 bg-supply-600')
    expect(cn('border-border-subtle', 'border-brand-600')).toBe('border-brand-600')
  })
  it('elevation, radius and font family', () => {
    expect(cn('shadow-e1', 'shadow-e2')).toBe('shadow-e2')
    expect(cn('shadow-e2', 'shadow-none')).toBe('shadow-none')
    expect(cn('rounded-md', 'rounded-lg')).toBe('rounded-lg')
    expect(cn('rounded-sm', 'rounded-full')).toBe('rounded-full')
    expect(cn('font-sans', 'font-display')).toBe('font-display')
  })
  it('spacing and sizing utilities the app uses', () => {
    expect(cn('h-11', 'h-12')).toBe('h-12')
    expect(cn('h-6.5', 'h-8')).toBe('h-8')
    expect(cn('px-3', 'px-4')).toBe('px-4')
    expect(cn('px-4', 'py-3', 'p-2')).toBe('p-2')
    expect(cn('size-11', 'size-5')).toBe('size-5')
    expect(cn('gap-2', 'gap-3')).toBe('gap-3')
    expect(cn('max-w-[14rem]', 'max-w-full')).toBe('max-w-full')
  })
})

describe('backward compatibility with existing call sites', () => {
  it('joins strings and drops falsy values like the old helper', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
    expect(cn()).toBe('')
    const pending = false
    expect(cn('min-w-0 transition-opacity', pending && 'pointer-events-none opacity-55')).toBe('min-w-0 transition-opacity')
  })
  it('accepts clsx arrays and objects for adapted registry components', () => {
    expect(cn(['a', ['b']], { c: true, d: false })).toBe('a b c')
  })
})
