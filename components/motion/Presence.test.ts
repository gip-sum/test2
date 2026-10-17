import { createElement, type FC, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MotionProvider } from './MotionProvider'
import { Presence } from './Presence'

// createElement types children as a prop; JSX is unavailable in a .test.ts.
const P = Presence as FC<Omit<Parameters<typeof Presence>[0], 'children'> & { children?: ReactNode }>
const render = (show: boolean, preset?: 'fade' | 'menu' | 'sheet') =>
  renderToStaticMarkup(createElement(MotionProvider, null, createElement(P, { show, preset }, createElement('p', null, 'Enquiry sent'))))

describe('Presence', () => {
  it('renders content present on the first render in its final state, never transparent', () => {
    for (const preset of ['fade', 'menu', 'sheet'] as const) {
      const html = render(true, preset)
      expect(html).toContain('Enquiry sent')
      expect(html, preset).not.toMatch(/opacity:\s*0/)
      expect(html, preset).not.toMatch(/translateY\(\s*-?[1-9]/)
    }
  })

  it('renders nothing when hidden', () => {
    expect(render(false)).not.toContain('Enquiry sent')
  })
})
