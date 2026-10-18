import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Handwritten <button> elements outside the shared primitives (UI-09).
//
// The modernization track moves buttons onto components/ui/Button stage by
// stage; this ratchet keeps the number from creeping back up. The count is
// every `<button` in app/ and components/ TSX outside components/ui, which
// reproduces the recorded history with a constant offset (UI-05 counted 62
// where this counts 58; UI-06 57 vs 53) — the earlier method's extra four
// were never written down, so this one is the record from UI-09 on.
//
// What remains is mostly deliberate (docs/ui-modernization/UI-09):
// navigation and menu toggles, tabs, the gallery's icon and thumbnail
// controls, the save heart, chip and field controls, link-styled text
// actions inside sentences and alerts, one danger outline (no variant for
// one use). UI-11 moved the admin review and account forms' Refresh
// buttons onto Button; no handwritten button remains in app/admin or
// components/admin.
//
// Lower the ceiling when a stage migrates more. Raising it needs a reason.
const CEILING = 39
const root = process.cwd()
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path) : /\.tsx$/.test(name) ? [path] : []
})

describe('handwritten buttons', () => {
  it(`stay at or under ${CEILING}`, () => {
    const files = [...walk(join(root, 'app')), ...walk(join(root, 'components'))].filter((f) => !relative(root, f).startsWith('components/ui/'))
    const count = files.reduce((n, f) => n + (readFileSync(f, 'utf8').match(/<button\b/g) ?? []).length, 0)
    expect(count).toBeLessThanOrEqual(CEILING)
  })
})
