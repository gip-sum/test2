/**
 * Guards the product's defining visual decision: light is the default.
 *
 * Runs every route in a browser whose OS is set to DARK, then measures the
 * computed background of each surface a visitor actually sees. A screenshot
 * cannot prove this — it looks the same whether the light theme won on
 * purpose or the dark tokens simply failed to load — so the assertion is on
 * measured luminance, not on pixels.
 *
 * It also checks the resolved `color-scheme`, because that is what holds the
 * OS-drawn parts (native select popups, scrollbars, autofill) to the theme.
 *
 * Usage: npm run start, then npm run light-check
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CHROME =
  process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const WIDTHS = [390, 412, 768, 1280]
const ROUTES = ['/']

/** Relative luminance, WCAG 2.x. */
function luminance(css) {
  const [r, g, b] = css.match(/[\d.]+/g).slice(0, 3).map(Number)
  const ch = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

const browser = await chromium.launch({ executablePath: CHROME })
let failures = 0

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    // colorScheme: 'dark' is the whole point — it simulates a device whose
    // OS is in dark mode. The product must ignore it.
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: 'dark',
    })
    const page = await ctx.newPage()
    await page.goto(BASE + route, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)

    const probes = await page.evaluate(() => {
      // An element painted `transparent` shows whatever is behind it, so the
      // honest reading is the first ancestor that actually paints.
      const painted = (el) => {
        for (let n = el; n; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor
          if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c
        }
        return null
      }
      const bg = (el) => (el ? painted(el) : null)
      const q = (s) => document.querySelector(s)
      const byText = (s, re) =>
        [...document.querySelectorAll(s)].find((e) => re.test(e.textContent || ''))
      const form = q('form')
      // Desktop renders a combobox; phones render a button opening a sheet.
      const locationField =
        form?.querySelector('[role="combobox"]') ??
        byText('form button[type="button"]', /Search a locality/)

      return {
        surfaces: {
          'page': bg(document.body),
          'header': bg(q('header')),
          'dev banner': bg(byText('main p', /Development build/)),
          'search card': bg(form),
          'location field': bg(locationField),
          'property type': bg(form?.querySelector('select')),
          'budget select': bg(form?.querySelectorAll('select')[1]),
          'bedroom chip': bg(byText('form button[type="button"]', /^1 BHK$/)),
          'inactive tab': bg(q('[role="tab"][aria-selected="false"]')),
          'locality chip': bg(q('section[aria-labelledby="popular-localities"] ul a')),
          'property card': bg(q('article')),
          'save button': bg(q('article button[aria-pressed]')),
          'browse tile': bg(q('section[aria-labelledby="browse-by"] ul a')),
          'seller CTA band': bg(q('section[aria-labelledby="post-cta"]')),
          'commitment card': bg(q('section[aria-labelledby="how-it-works"] li')),
          'footer': bg(q('footer')),
          'bottom nav': bg(q('nav.fixed')),
        },
        // Filled actions are deliberately saturated; they are asserted the
        // other way, as proof the accent survived rather than went pale.
        actions: {
          'search button': bg(form?.querySelector('button[type="submit"]')),
          'active tab': bg(q('[role="tab"][aria-selected="true"]')),
          'post property': bg(q('section[aria-labelledby="post-cta"] a')),
        },
        text: {
          'h1': getComputedStyle(q('h1')).color,
          'lede': getComputedStyle(q('h1').nextElementSibling).color,
        },
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
      }
    })

    const label = `${route} @${width}`
    const report = (name, css, ok, note = '') => {
      if (!ok) failures++
      const L = css ? luminance(css).toFixed(3) : '—'
      console.log(
        `  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(12)} ${name.padEnd(17)} ${String(css).padEnd(22)} L=${L} ${note}`,
      )
    }

    for (const [name, css] of Object.entries(probes.surfaces)) {
      report(name, css, css !== null && luminance(css) > 0.5, 'must be light')
    }
    for (const [name, css] of Object.entries(probes.actions)) {
      report(name, css, css !== null && luminance(css) < 0.35, 'must stay saturated')
    }
    for (const [name, css] of Object.entries(probes.text)) {
      report(name, css, css !== null && luminance(css) < 0.25, 'must be dark ink')
    }
    if (probes.colorScheme !== 'light') {
      failures++
      console.log(`  FAIL ${label.padEnd(12)} color-scheme resolved "${probes.colorScheme}", expected "light"`)
    }

    await ctx.close()
  }
}

await browser.close()
console.log(
  failures === 0
    ? '\nlight-first holds: every surface stayed light under a dark-mode browser'
    : `\n${failures} surface(s) failed the light-first check`,
)
process.exit(failures === 0 ? 0 : 1)
