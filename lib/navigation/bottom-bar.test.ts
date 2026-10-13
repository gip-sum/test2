import { describe, expect, it } from 'vitest'
import { bottomBarShown } from './bottom-bar'

describe('bottomBarShown', () => {
  it('shows the bar on browsing pages and on the pages it leads to', () => {
    for (const path of ['/', '/buy/kolkata', '/rent/kolkata/flats', '/videos', '/account/activity', '/account/saved', '/calculators/emi']) {
      expect(bottomBarShown(path), path).toBe(true)
    }
  })

  it('hides it in focused flows and where the property page has its own contact bar', () => {
    for (const path of ['/post', '/login', '/admin', '/property/2-bhk-flat-p1', '/listing/d9140f33-a429-46f3-9514-3e8f32f18189']) expect(bottomBarShown(path), path).toBe(false)
  })

  it('matches whole segments, not any path that merely starts with the same letters', () => {
    expect(bottomBarShown('/postcards')).toBe(true)
  })

  it('lets a page force it on (the 404 under /property)', () => {
    expect(bottomBarShown('/property/gone', true)).toBe(true)
  })
})
