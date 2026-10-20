import { describe, expect, it } from 'vitest'
import { fitRect, releaseStep, sourceFrame, stageMargin } from './gallery-motion'

describe('gallery motion rules (UI-16)', () => {
  it('decides a release by distance or by speed', () => {
    expect(releaseStep(-120, 0, 400)).toBe(1) // past 22% of the width: next
    expect(releaseStep(120, 0, 400)).toBe(-1)
    expect(releaseStep(-40, 0, 400)).toBe(0) // short and slow: back
    expect(releaseStep(-40, -0.6, 400)).toBe(1) // short but fast: a flick
    expect(releaseStep(-3, -2, 400)).toBe(0) // under the axis lock: a tap
  })

  it('fits a photo inside the stage, centred, keeping its shape', () => {
    const r = fitRect({ left: 0, top: 64, width: 1280, height: 700 }, 4 / 3, 24)
    expect(r.height).toBeCloseTo(652)
    expect(r.width).toBeCloseTo(652 * 4 / 3)
    expect(r.left + r.width / 2).toBeCloseTo(640)
    expect(r.top + r.height / 2).toBeCloseTo(64 + 350)
  })

  it('places the open photo exactly over the box it came from', () => {
    const open = { left: 200, top: 100, width: 800, height: 600 }
    const box = { left: 10, top: 20, width: 200, height: 150 }
    const f = sourceFrame(open, box, 4 / 3, 12)
    expect(f.scale).toBeCloseTo(0.25)
    expect(f.x).toBeCloseTo(110 - 600)
    expect(f.y).toBeCloseTo(95 - 400)
    expect(f.clip).toBe('inset(0px 0px 0px 0px round 48px)')
  })

  it('crops a photo that is wider than its box to the box', () => {
    const f = sourceFrame({ left: 0, top: 0, width: 800, height: 600 }, { left: 0, top: 0, width: 100, height: 200 }, 4 / 3, 0)
    expect(f.scale).toBeCloseTo(200 * 4 / 3 / 800)
    expect(f.clip.startsWith('inset(0px ')).toBe(true)
  })

  it('runs the phone viewer edge to edge', () => {
    expect(stageMargin(390)).toBe(0)
    expect(stageMargin(1280)).toBe(24)
  })
})
