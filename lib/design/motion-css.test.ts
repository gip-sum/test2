import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isProtected, walkCss } from './css-walk'

// The CSS motion layer (UI-04) speaks one language with Motion: durations and
// curves come from the token scale, and keyframes animate only what the
// compositor can run off the main thread. The frozen login and 404 scenes are
// outside these rules by design.
const root = process.cwd()
const walk = (dir: string, ext: RegExp): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path, ext) : ext.test(name) && !name.endsWith('.test.ts') ? [path] : []
})
const cssFiles = [...walk(join(root, 'app'), /\.css$/), ...walk(join(root, 'components'), /\.css$/)]
const decls = cssFiles.flatMap((f) => walkCss(readFileSync(f, 'utf8')).map((d) => ({ ...d, file: relative(root, f) })))
const ui = decls.filter((d) => !isProtected(d, d.file) && !d.prop.startsWith('--') && !d.atRules.some((a) => a.startsWith('@theme')))
// Split a transition/animation list on top-level commas only.
const parts = (value: string) => value.split(/,(?![^(]*\))/).map((p) => p.trim())

describe('motion layer CSS', () => {
  it('animates only transform and opacity in its keyframes', () => {
    const motion = decls.filter((d) => d.atRules.some((a) => a.startsWith('@keyframes motion-')))
    expect(motion.length).toBeGreaterThan(5)
    for (const d of motion) expect(['transform', 'opacity'], `${d.atRules.join(' ')} ${d.prop}`).toContain(d.prop)
  })

  it('gives every UI transition a duration and a curve from the tokens', () => {
    const offenders: string[] = []
    for (const d of ui.filter((x) => x.prop === 'transition')) {
      for (const p of parts(d.value)) {
        if (/^(none|display .*allow-discrete)$/.test(p) && !/\d/.test(p.replace(/var\([^)]*\)/g, ''))) continue
        const timed = /var\(--duration-[a-z]+\)/.test(p), eased = /var\(--ease-[a-z]+\)/.test(p) || /allow-discrete/.test(p)
        if (!timed || !eased) offenders.push(`${d.file} ${d.selector} { transition: ${p} }`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('takes every animation timing from the tokens', () => {
    const offenders: string[] = []
    for (const d of ui.filter((x) => x.prop === 'animation')) {
      if (/prefers-reduced-motion/.test(d.atRules.join(' '))) continue
      if (!/var\(--(duration|loop)-[a-z]+\)/.test(d.value) || !/var\(--ease-[a-z]+\)/.test(d.value) || !/\bmotion-[a-z-]+\b/.test(d.value)) offenders.push(`${d.file} ${d.selector} { animation: ${d.value} }`)
    }
    for (const d of ui.filter((x) => x.prop === 'transition-timing-function' || x.prop === 'animation-timing-function')) {
      if (!/^var\(--ease-[a-z]+\)$/.test(d.value)) offenders.push(`${d.file} ${d.selector} { ${d.prop}: ${d.value} }`)
    }
    expect(offenders).toEqual([])
  })

  it('writes no curve outside the token layer', () => {
    expect(ui.filter((d) => /cubic-bezier\(|steps\(/.test(d.value)).map((d) => `${d.file} ${d.selector}`)).toEqual([])
    const tsx = [...walk(join(root, 'app'), /\.tsx?$/), ...walk(join(root, 'components'), /\.tsx?$/)]
    const arbitrary = tsx.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\bease-\[[^\]]+\]|cubic-bezier\(/g)].map((m) => `${relative(root, f)}: ${m[0]}`))
    expect(arbitrary).toEqual([])
  })
})
