import { createElement, useContext } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MotionConfigContext } from 'motion/react'
import { describe, expect, it } from 'vitest'
import { TRANSITION } from '@/lib/motion/tokens'
import { MotionProvider } from './MotionProvider'

// Reads Motion's own configuration context from inside the real provider,
// so this fails if reduced-motion handling is ever removed or weakened.
function Probe() {
  const config = useContext(MotionConfigContext)
  return createElement('output', null, JSON.stringify({ reducedMotion: config.reducedMotion, transition: config.transition }))
}
const read = (tree: ReturnType<typeof createElement>) =>
  JSON.parse(renderToStaticMarkup(tree).replace(/^<output>|<\/output>$/g, '').replaceAll('&quot;', '"'))

describe('MotionProvider', () => {
  it('follows the user’s reduced-motion preference', () => {
    expect(read(createElement(MotionProvider, null, createElement(Probe))).reducedMotion).toBe('user')
  })
  it('makes the token scale the default transition', () => {
    expect(read(createElement(MotionProvider, null, createElement(Probe))).transition).toEqual(TRANSITION.base)
  })
  it('is what changes the default: Motion alone never reduces motion', () => {
    expect(read(createElement(Probe)).reducedMotion).toBe('never')
  })
  it('renders no markup of its own', () => {
    expect(renderToStaticMarkup(createElement(MotionProvider, null, createElement('p', null, 'x')))).toBe('<p>x</p>')
  })
})
