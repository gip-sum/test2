import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DURATION, EASE, TRANSITION } from './tokens'

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
const start = css.indexOf('@theme static {')
const block = css.slice(start, css.indexOf('\n}', start))
const declared = (prefix: string) =>
  Object.fromEntries([...block.matchAll(new RegExp(`^\\s*--${prefix}-([a-z]+):\\s*([^;]+);`, 'gm'))].map((m) => [m[1]!, m[2]!.trim()]))

describe('CSS and Motion share one timing scale', () => {
  it('finds the motion block in globals.css', () => expect(start).toBeGreaterThan(-1))

  it('declares every duration in CSS with the same value', () => {
    expect(declared('duration')).toEqual(Object.fromEntries(Object.entries(DURATION).map(([k, ms]) => [k, `${ms}ms`])))
  })

  it('declares every easing in CSS with the same curve', () => {
    expect(declared('ease')).toEqual(Object.fromEntries(Object.entries(EASE).map(([k, p]) => [k, `cubic-bezier(${p.join(', ')})`])))
  })
})

describe('the scale keeps its rules', () => {
  const durations = Object.values(DURATION)

  it('ascends, with nothing longer than deliberate', () => {
    expect([...durations].sort((a, b) => a - b)).toEqual(durations)
    expect(Math.max(...durations)).toBe(DURATION.deliberate)
    expect(DURATION.deliberate).toBeLessThanOrEqual(450)
  })

  it('builds every preset from the scale', () => {
    const seconds = new Set(durations.map((ms) => ms / 1000))
    const curves = Object.values(EASE).map((p) => p.join())
    for (const [name, t] of Object.entries(TRANSITION)) {
      if ('ease' in t) {
        expect(seconds.has(t.duration), name).toBe(true)
        expect(curves, name).toContain(t.ease.join())
      } else {
        expect(seconds.has(t.visualDuration), name).toBe(true)
        expect(t.bounce, name).toBe(0)
      }
    }
  })

  it('leaves faster than it arrives', () => {
    expect(TRANSITION.exit.duration).toBeLessThan(TRANSITION.enter.duration)
    expect(TRANSITION.overlayExit.duration).toBeLessThan(TRANSITION.overlayEnter.duration)
  })
})
