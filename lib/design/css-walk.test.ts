import { describe, expect, it } from 'vitest'
import { isProtected, walkCss } from './css-walk'

describe('walkCss', () => {
  const css = `/* a; comment { } */\n@import "tailwindcss";\n@theme {\n  --color-a: #fff;\n}\n.a, .b { color: red; padding: 0 }\n@media (min-width: 768px) {\n  .c:hover { border-radius: 12px; }\n}\n@keyframes nf-walk { from { opacity: 0 } }`
  const decls = walkCss(css)

  it('reads declarations with their selector, at-rules and line', () => {
    expect(decls.map((d) => [d.prop, d.value, d.selector, d.atRules.join('|'), d.line])).toEqual([
      ['--color-a', '#fff', '', '@theme', 4],
      ['color', 'red', '.a, .b', '', 6],
      ['padding', '0', '.a, .b', '', 6],
      ['border-radius', '12px', '.c:hover', '@media (min-width: 768px)', 8],
      ['opacity', '0', 'from', '@keyframes nf-walk', 10],
    ])
  })

  it('ignores comments and top-level statements', () => {
    expect(decls.some((d) => d.value.includes('comment') || d.prop.includes('import'))).toBe(false)
  })

  it('recognises the protected scenes', () => {
    expect(isProtected(decls[4]!, 'app/globals.css')).toBe(true)
    expect(isProtected({ ...decls[1]!, selector: '.login-art-copy' }, 'app/login/login.css')).toBe(true)
    expect(isProtected({ ...decls[1]!, selector: '.login-card' }, 'app/login/login.css')).toBe(false)
    expect(isProtected(decls[1]!, 'components/auth/way-home.css')).toBe(true)
  })
})
