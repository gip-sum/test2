import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// A var() that names an undefined custom property fails silently: the
// declaration becomes invalid and the element falls back to its inherited or
// initial value. UI-03 hit exactly this — folding --home-* into @theme left
// the frozen login scene's frames black and its rails invisible — and only
// the style comparison noticed. This makes the whole class a test failure.
const root = process.cwd()
const walk = (dir: string, ext: RegExp): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path, ext) : ext.test(name) ? [path] : []
})
const cssFiles = [...walk(join(root, 'app'), /\.css$/), ...walk(join(root, 'components'), /\.css$/)]
const sourceFiles = [...walk(join(root, 'app'), /\.tsx?$/), ...walk(join(root, 'components'), /\.tsx?$/)]
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '')

const defined = new Set<string>()
const define = (text: string, re: RegExp) => { for (const m of text.matchAll(re)) defined.add(m[1]!) }
for (const f of cssFiles) define(strip(readFileSync(f, 'utf8')), /(--[a-zA-Z0-9-]+)\s*:/g)
// Inline style custom properties set from components (the scenes' per-element timings).
for (const f of sourceFiles) {
  const text = readFileSync(f, 'utf8')
  define(text, /['"`](--[a-zA-Z0-9-]+)['"`]\s*:/g)       // { '--d': … }
  define(text, /\[\s*['"`](--[a-zA-Z0-9-]+)['"`]\s*\]\s*=/g) // style['--t'] = …
}
// next/font exposes each family as the CSS variable named in app/fonts.ts.
define(readFileSync(join(root, 'app/fonts.ts'), 'utf8'), /variable:\s*'(--[a-zA-Z0-9-]+)'/g)
// Tailwind's own theme variables.
define(readFileSync(join(root, 'node_modules/tailwindcss/theme.css'), 'utf8'), /(--[a-zA-Z0-9-]+)\s*:/g)

describe('CSS custom properties', () => {
  it('finds definitions and references', () => {
    expect(cssFiles.length).toBeGreaterThanOrEqual(3)
    expect(defined.has('--color-brand-600')).toBe(true)
    expect(defined.has('--font-plex')).toBe(true)
  })

  it('never references a property nothing defines', () => {
    const missing: string[] = []
    for (const f of cssFiles) {
      for (const m of strip(readFileSync(f, 'utf8')).matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
        const name = m[1]!
        // Tailwind's internal --tw-* state variables are set by its utilities at runtime.
        if (!defined.has(name) && !name.startsWith('--tw-')) missing.push(`${relative(root, f)}: ${name}`)
      }
    }
    expect([...new Set(missing)]).toEqual([])
  })
})
