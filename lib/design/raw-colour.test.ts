import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findRawColours } from './raw-colour'

const root = process.cwd()
const css = readFileSync(join(root, 'app/globals.css'), 'utf8')
const theme = css.slice(css.indexOf('@theme {'), css.indexOf('\n}', css.indexOf('@theme {')))
const tokens = new Set([...theme.matchAll(/^\s*--color-([a-z0-9-]+):/gm)].map((m) => m[1]!))

/**
 * Legacy uses that predate the guard, each with the stage that removes it.
 * The scan must match this list EXACTLY: a new raw colour fails, and so does
 * fixing one of these without deleting its entry, so the list only shrinks.
 */
const LEGACY: Record<string, string[]> = {
  // The frosted hero search panel's hairline. UI-03 gives glass edges a token.
  'components/search/SearchPanel.tsx': ['border-white/80'],
}

/**
 * Literal colours that are correct as literals: they are not interface
 * colours, so no token applies. Each needs a reason.
 */
const PERMANENT: Record<string, string[]> = {
  // viewport.themeColor tints the browser chrome; Next needs a literal, and
  // it must stay white because light is the product (see the comment there).
  'app/layout.tsx': ['#ffffff'],
  // Image processing, not interface: sharp flattens a transparent upload
  // onto white before encoding JPEG.
  'lib/media/compress.ts': ['#ffffff'],
  'lib/media/image.ts': ['#ffffff'],
}

// Every TS/TSX file the app is built from. CSS is out of scope until UI-03:
// globals.css IS the token layer, and its legacy literals are UI-03's work.
const SCANNED = ['app', 'components', 'lib']
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : []
  })
}

describe('findRawColours', () => {
  const find = (s: string) => findRawColours(s, tokens).map((f) => f.match)

  it('reads the colour tokens', () => {
    expect(tokens.has('ink-900')).toBe(true)
    expect(tokens.has('neutral-100')).toBe(true)
  })

  it('flags a typical registry component', () => {
    const kokonut = `<div className="bg-white dark:bg-zinc-900 text-zinc-600 border border-zinc-200 hover:bg-emerald-500/10 ring-black/5">`
    expect(find(kokonut)).toEqual(['dark:bg-zinc-900', 'text-zinc-600', 'border-zinc-200', 'hover:bg-emerald-500/10', 'bg-white', 'ring-black/5'])
  })

  it('flags arbitrary colours and hex literals', () => {
    expect(find(`cn('bg-[#ffffff]', "text-[rgb(0,0,0)]", 'fill-[oklch(0.7_0.1_150)]')`)).toEqual(['bg-[#ffffff]', 'text-[rgb(0,0,0)]', 'fill-[oklch(0.7_0.1_150)]'])
    expect(find(`<path fill="#16a34a" /> const c = '#fff'`)).toEqual(['#16a34a', '#fff'])
  })

  it('accepts GharBazaar tokens, including names shared with the default palette', () => {
    expect(find(`<p className="bg-neutral-100 text-neutral-600 text-ink-700 bg-brand-600 border-border-subtle shadow-e1 bg-chart-1 text-on-brand">`)).toEqual([])
    expect(find(`<p className="bg-(--color-brand-600) text-current fill-current bg-transparent">`)).toEqual([])
  })

  it('ignores non-colour utilities and prose', () => {
    expect(find(`<p className="text-body-sm text-center border-2 rounded-lg ring-2 outline-offset-2 shadow-none">`)).toEqual([])
    expect(find(`// the reference used zinc-500 and bg-white\n/* text-black */ const href = '#main'`)).toEqual([])
  })

  it('reports the line', () => {
    expect(findRawColours('a\nb\n<i className="text-rose-500" />', tokens)[0]!.line).toBe(3)
  })
})

describe('no raw colours in application source', () => {
  it('keeps every permanent exception in use', () => {
    for (const [path, matches] of Object.entries(PERMANENT)) {
      const hits = findRawColours(readFileSync(join(root, path), 'utf8'), tokens).map((h) => h.match)
      for (const m of matches) expect(hits, `${path} no longer uses ${m}; delete the exception`).toContain(m)
    }
  })

  it('matches the legacy list exactly', () => {
    const found: Record<string, string[]> = {}
    for (const dir of SCANNED) {
      for (const file of files(join(root, dir))) {
        const path = relative(root, file)
        const allowed = PERMANENT[path] ?? []
        const hits = findRawColours(readFileSync(file, 'utf8'), tokens).map((h) => h.match).filter((m) => !allowed.includes(m))
        if (hits.length) found[path] = hits
      }
    }
    expect(found).toEqual(LEGACY)
  })
})
