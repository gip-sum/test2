import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// components.json tells the shadcn CLI where registry code belongs. Imported
// components are adapted by hand from the projects' GitHub source at a pinned
// commit (docs/ui-modernization/UI-02-foundation.md), but the aliases must
// still be true so that any `import { cn } from '<utils>'` resolves to ours.
const root = process.cwd()
const config = JSON.parse(readFileSync(join(root, 'components.json'), 'utf8'))
const resolve = (alias: string) => join(root, alias.replace(/^@\//, ''))

describe('components.json', () => {
  it('points every alias at a real location', () => {
    for (const [name, alias] of Object.entries<string>(config.aliases)) {
      const path = resolve(alias)
      expect(existsSync(path) || existsSync(`${path}.ts`), `${name} → ${alias}`).toBe(true)
    }
  })
  it('routes registry utils to the token-aware cn()', () => {
    expect(config.aliases.utils).toBe('@/lib/cn')
    expect(readFileSync(`${resolve(config.aliases.utils)}.ts`, 'utf8')).toContain('export function cn(')
  })
  it('lists only the two approved registries, over https', () => {
    expect(config.registries).toEqual({
      '@kokonutui': 'https://kokonutui.com/r/{name}.json',
      '@bklit': 'https://ui.bklit.com/r/{name}.json',
    })
  })
  it('names the real stylesheet and no Tailwind v3 config', () => {
    expect(existsSync(join(root, config.tailwind.css))).toBe(true)
    expect(config.tailwind.config).toBe('')
  })
})
