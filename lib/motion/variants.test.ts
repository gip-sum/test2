import { describe, expect, it } from 'vitest'
import { TRANSITION } from './tokens'
import { PRESETS, stagger } from './variants'

describe('Motion presets', () => {
  it('take every timing from the token scale', () => {
    const allowed = new Set(Object.values(TRANSITION))
    for (const [name, p] of Object.entries(PRESETS)) {
      expect(allowed.has(p.transition), name).toBe(true)
      expect(allowed.has(p.exitTransition), name).toBe(true)
    }
  })

  it('leave faster than they arrive', () => {
    for (const [name, p] of Object.entries(PRESETS)) expect(p.exitTransition.duration, name).toBeLessThan(p.transition.duration)
  })

  it('stay restrained: small offsets, near-1 scale, ending at rest', () => {
    for (const [name, p] of Object.entries(PRESETS)) {
      for (const state of [p.initial, p.exit]) {
        expect(Math.abs(state.y ?? 0), name).toBeLessThanOrEqual(24)
        expect(state.scale ?? 1, name).toBeGreaterThanOrEqual(0.95)
      }
      expect(p.animate.opacity, name).toBe(1)
      if ('y' in p.animate) expect(p.animate.y, name).toBe(0)
      if ('scale' in p.animate) expect(p.animate.scale, name).toBe(1)
    }
  })

  it('caps the stagger so a long list never makes its tail wait', () => {
    expect(stagger(0)).toBe(0)
    expect(stagger(3)).toBeCloseTo(0.09)
    expect(stagger(500)).toBe(0.2)
  })
})
