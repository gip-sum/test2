/**
 * A minimal CSS reader for the design-system guards: every declaration with
 * the selector and at-rules it sits in. Enough for this codebase's own
 * stylesheets (no nested CSS, no semicolons inside strings); not a general
 * parser, and deliberately dependency-free.
 */
export type CssDecl = {
  prop: string
  value: string
  line: number
  /** The nearest enclosing rule's selector ('' for declarations directly in an at-rule such as @theme). */
  selector: string
  /** Enclosing at-rule preludes, outermost first ('@theme', '@media (min-width: 768px)', '@keyframes nf-walk' …). */
  atRules: string[]
}

/** Comments replaced by spaces, so offsets and line numbers survive. */
export function stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
}

export function walkCss(source: string): CssDecl[] {
  const text = stripCssComments(source)
  const stack: string[] = []
  const decls: CssDecl[] = []
  let start = 0
  const lineAt = (i: number) => text.slice(0, i).split('\n').length
  const take = (end: number) => {
    const raw = text.slice(start, end)
    const colon = raw.indexOf(':')
    const selector = [...stack].reverse().find((p) => !p.startsWith('@')) ?? ''
    if (stack.length && colon > 0 && !raw.trim().startsWith('@')) {
      const offset = start + raw.length - raw.trimStart().length
      decls.push({ prop: raw.slice(0, colon).trim(), value: raw.slice(colon + 1).trim(), line: lineAt(offset), selector, atRules: stack.filter((p) => p.startsWith('@')) })
    }
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') { stack.push(text.slice(start, i).trim().replace(/\s+/g, ' ')); start = i + 1 }
    else if (ch === ';') { take(i); start = i + 1 }
    else if (ch === '}') { take(i); stack.pop(); start = i + 1 }
  }
  return decls
}

/** The login street, the login art panel and the 404 scene are frozen (UI-03). */
const PROTECTED_SELECTOR = /(^|[\s,>+~(])\.(wh-|login-art|nf-|google-)/
const PROTECTED_KEYFRAMES = /^@keyframes (wh-|nf-|login-copy)/

export function isProtected(decl: CssDecl, file: string): boolean {
  return file.endsWith('way-home.css')
    || PROTECTED_SELECTOR.test(' ' + decl.selector)
    || decl.atRules.some((a) => PROTECTED_KEYFRAMES.test(a))
    || /^--(wh|nf|google)-/.test(decl.prop)
}
