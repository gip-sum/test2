import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isProtected, walkCss } from './css-walk'

// The login street and the 404 lost-pin scene are frozen (UI-03, UI-04):
// their markup, styles, keyframes and timing must not change. The browser
// checks (login-check, notfound-check) and the style comparison measure the
// rendered scenes; this fails first, on any edit to the files or to the
// protected rules inside the shared stylesheets, before anything is built.
//
// A deliberate, client-approved change to a scene updates these hashes in the
// same commit, with the reason. Nothing else should.
const root = process.cwd()
const sha = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)
const file = (path: string) => sha(readFileSync(join(root, path), 'utf8'))

/** Every protected declaration in a shared stylesheet, with its selector and at-rules. */
const protectedRules = (path: string) => sha(
  walkCss(readFileSync(join(root, path), 'utf8'))
    .filter((d) => isProtected(d, path))
    .map((d) => `${d.atRules.join(' / ')} | ${d.selector} | ${d.prop}: ${d.value}`)
    .join('\n'),
)

// Recorded from main @ 0378010 (UI-03, approved).
const FINGERPRINTS: Record<string, string> = {
  'components/auth/WayHomeScene.tsx': 'a735e5844a84b8f3',
  'components/auth/StreetPeople.tsx': '3756b6463b95654a',
  'components/auth/ScenePlayback.tsx': 'ff5a4a9347741f1a',
  'components/auth/way-home.css': 'b8408a2e07d5656c',
  'components/not-found/LostScene.tsx': '1f1b5bf8d476cdc1',
  'app/globals.css (scene rules, --wh-* palette, nf-* keyframes)': '08f96e7284000ed9',
  'app/login/login.css (login art and its entrance)': '519360566054c482',
}

const current = (): Record<string, string> => ({
  'components/auth/WayHomeScene.tsx': file('components/auth/WayHomeScene.tsx'),
  'components/auth/StreetPeople.tsx': file('components/auth/StreetPeople.tsx'),
  'components/auth/ScenePlayback.tsx': file('components/auth/ScenePlayback.tsx'),
  'components/auth/way-home.css': file('components/auth/way-home.css'),
  'components/not-found/LostScene.tsx': file('components/not-found/LostScene.tsx'),
  'app/globals.css (scene rules, --wh-* palette, nf-* keyframes)': protectedRules('app/globals.css'),
  'app/login/login.css (login art and its entrance)': protectedRules('app/login/login.css'),
})

describe('frozen scenes', () => {
  it('match their approved fingerprints', () => {
    expect(current()).toEqual(FINGERPRINTS)
  })
  it('really contain the scenes (guards an empty extraction)', () => {
    const globals = walkCss(readFileSync(join(root, 'app/globals.css'), 'utf8')).filter((d) => isProtected(d, 'app/globals.css'))
    expect(globals.some((d) => d.atRules.some((a) => a.startsWith('@keyframes nf-')))).toBe(true)
    expect(globals.some((d) => d.prop.startsWith('--wh-'))).toBe(true)
    const login = walkCss(readFileSync(join(root, 'app/login/login.css'), 'utf8')).filter((d) => isProtected(d, 'app/login/login.css'))
    expect(login.some((d) => d.selector.includes('.login-art'))).toBe(true)
  })
})
