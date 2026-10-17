/**
 * Finds colours that bypass the GharBazaar token layer in TS/TSX source.
 *
 * Components never hardcode a colour (CLAUDE.md): every colour is a token in
 * the @theme block of app/globals.css, which is why a palette change is one
 * file. Tailwind still compiles its DEFAULT palette, so `bg-zinc-900` or
 * `text-white` render without any error — silently off-brand and blind to
 * the dark theme. Kokonut UI and Bklit UI components arrive written that way,
 * so this check is what makes "re-tokenise before it ships" enforceable.
 *
 * Flags:
 *  - a default-palette step (`zinc-500`, `emerald-600/10` …) used as a colour,
 *    unless the same name is a GharBazaar token (`neutral-100` and
 *    `neutral-600` are);
 *  - `white` / `black` used as a colour (use surface-000, ink-inverse …);
 *  - arbitrary colour values (`bg-[#fff]`, `text-[rgb(…)]`);
 *  - a string literal that is just a hex colour (`fill="#16a34a"`, `'#fff'`).
 * Arbitrary references to tokens (`bg-(--color-brand-600)`) are fine.
 */

const PREFIX = 'bg|text|border|border-[xytrblse]|ring|ring-offset|outline|fill|stroke|from|via|to|shadow|inset-shadow|drop-shadow|divide|placeholder|caret|accent|decoration'
const FAMILY = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const STEP = '50|100|200|300|400|500|600|700|800|900|950'

// A class token ends at whitespace, a quote, a backtick or a brace.
const END = String.raw`(?=$|[\s"'\`}),])`
const PALETTE = new RegExp(String.raw`(?<![\w-])((?:[\w-]+:)*(?:${PREFIX})-((?:${FAMILY})-(?:${STEP}))(?:/\d+)?)${END}`, 'g')
const MONO = new RegExp(String.raw`(?<![\w-])((?:[\w-]+:)*(?:${PREFIX})-(?:white|black)(?:/\d+)?)${END}`, 'g')
const ARBITRARY = new RegExp(String.raw`(?<![\w-])((?:[\w-]+:)*(?:${PREFIX})-\[(?:#|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color-mix\()[^\]]*\])`, 'g')
const HEX_LITERAL = /(["'`])(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))\1/g

export type RawColour = { line: number; match: string; reason: string }

/** Blank out comments so prose that names a colour is not flagged; offsets and lines survive. */
function stripComments(source: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, ' ')
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, (m, lead: string) => lead + blank(m.slice(lead.length)))
}

/**
 * @param tokenColours the colour token names from @theme (`ink-900`, `neutral-100` …)
 */
export function findRawColours(source: string, tokenColours: ReadonlySet<string>): RawColour[] {
  const text = stripComments(source)
  const lineAt = (index: number) => text.slice(0, index).split('\n').length
  const found: RawColour[] = []
  for (const m of text.matchAll(PALETTE)) {
    if (!tokenColours.has(m[2]!)) found.push({ line: lineAt(m.index), match: m[1]!, reason: 'Tailwind default palette — use a GharBazaar colour token' })
  }
  for (const m of text.matchAll(MONO)) found.push({ line: lineAt(m.index), match: m[1]!, reason: 'white/black — use surface-000, ink-inverse or another token' })
  for (const m of text.matchAll(ARBITRARY)) found.push({ line: lineAt(m.index), match: m[1]!, reason: 'arbitrary colour value — add or use a token' })
  for (const m of text.matchAll(HEX_LITERAL)) found.push({ line: lineAt(m.index), match: m[2]!, reason: 'hex colour literal — use a token' })
  return found.sort((a, b) => a.line - b.line)
}
