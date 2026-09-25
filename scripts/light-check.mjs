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
const ROUTES = [
  '/',
  '/post',
  '/post?role=OWNER&intent=buy&type=APARTMENT',
  // Phase 12: a failed submission (error summary, every field marked) and a review.
  '/post?role=OWNER&intent=buy&type=APARTMENT&carpet=',
  '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=3&baths=2&unit=sqft&carpet=1240&super=1650&furnishing=SEMI_FURNISHED&floor=4&floors=12&status=READY&age=6',
  // Sign-in: the scene beside (desktop) or above (phones) the form.
  '/login',
  '/login?mode=register',
  // The animated 404, reached by an unmatched path and by a dead listing.
  '/this-page-does-not-exist',
  '/property/missing-pabcdef',
  '/buy/kolkata',
  '/buy/kolkata?loc=howrah&type=VILLA&bhk=5&pmax=1600000',
  '/property/4-bhk-flat-for-sale-in-ballygunge-p5d40ab',
  '/property/2-bhk-builder-floor-for-sale-in-behala-p9c17f4',
]

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
      // Computed colors can be oklab() when Tailwind applies an opacity.
      // Convert through the browser's canvas parser before measuring WCAG
      // luminance; parsing the first three numbers as RGB would read white
      // as almost black and produce a false failure.
      const resolvedColor = (css) => {
        if (!css) return null
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        context.fillStyle = '#fff'
        context.fillRect(0, 0, 1, 1)
        context.fillStyle = css
        context.fillRect(0, 0, 1, 1)
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data
        return `rgb(${r}, ${g}, ${b})`
      }
      const bg = (el) => resolvedColor(el ? painted(el) : null)
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
          'commitment card': bg(q('section[aria-labelledby="how-it-works"] li')),
          'footer': bg(q('footer')),
          'bottom nav': bg(q('nav.fixed')),
          // Results-page surfaces. Absent on the homepage, where they are
          // skipped rather than failed.
          'filter rail': bg(q('aside[aria-label="Filters"]')),
          'rail facet row': bg(q('aside[aria-label="Filters"] button[aria-pressed]')),
          'rail range input': bg(q('aside[aria-label="Filters"] input')),
          'active filter chip': bg(q('button[aria-label^="Remove filter"]')?.parentElement),
          'sort select': bg(q('select[aria-label="Sort results"]')),
          'pagination link': bg(q('nav[aria-label="Pagination"] a:not([aria-current])')),
          'zero-result panel': bg(q('section[aria-labelledby="zero-results"]')),
          // The outlined suggestion chips only; the blue "Clear all" button
          // below them is a filled action and is asserted as one.
          'recovery option': bg(q('section[aria-labelledby="zero-results"] ul button')),
          'gallery frame': bg(q('section[aria-label="Property photos"] > div')),
          'detail grid': bg(q('section[aria-labelledby="details-heading"] dl')),
          'contact card': bg(q('aside form')),
          'sticky contact bar': bg(q('div.fixed:has(button[aria-haspopup="dialog"])')),
        },
        // Filled actions are deliberately saturated; they are asserted the
        // other way, as proof the accent survived rather than went pale.
        actions: {
          'current page': bg(q('nav[aria-label="Pagination"] a[aria-current="page"]')),
          'search button': bg(form?.querySelector('button[type="submit"]')),
          'active tab': bg(q('[role="tab"][aria-selected="true"]')),
          'clear all filters': bg(
            [...document.querySelectorAll('section[aria-labelledby="zero-results"] button')]
              .find((b) => /Clear all filters/.test(b.textContent)),
          ),
          'contact submit': bg(q('aside form button[type="submit"]')),
          'mobile contact action': bg(q('div.fixed button[aria-haspopup="dialog"]')),
        },
        text: {
          'h1': resolvedColor(getComputedStyle(q('h1')).color),
          'lede': resolvedColor(getComputedStyle(q('h1').nextElementSibling).color),
        },
        // The editorial seller band intentionally inverts the light page.
        // Check contrast instead of incorrectly requiring a white surface.
        seller: q('.seller-invitation') ? {
          background: bg(q('.seller-invitation')),
          text: resolvedColor(getComputedStyle(q('.seller-invitation p')).color),
          button: bg(q('.seller-invitation a')),
          buttonText: resolvedColor(getComputedStyle(q('.seller-invitation a')).color),
        } : null,
        heroText: Boolean(q('.home-hero')?.contains(q('h1'))),
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
      // A surface that does not exist on this route is not a failure.
      if (css === null) continue
      report(name, css, luminance(css) > 0.5, 'must be light')
    }
    for (const [name, css] of Object.entries(probes.actions)) {
      // Controls that only exist on one kind of page (the homepage search
      // button, the results pagination) are skipped where they are absent
      // rather than failing a page that never had them.
      if (css === null) continue
      report(name, css, luminance(css) < 0.35, 'must stay saturated')
    }
    for (const [name, css] of Object.entries(probes.text)) {
      if (css === null) continue
      const ok = probes.heroText ? luminance(css) > 0.6 : luminance(css) < 0.25
      report(name, css, ok, probes.heroText ? 'must stay light on hero' : 'must be dark ink')
    }
    if (probes.seller) {
      const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)
      const seller = probes.seller
      report('seller text contrast', seller.text, contrast(seller.background, seller.text) >= 4.5, 'must meet 4.5:1')
      report('seller button contrast', seller.buttonText, contrast(seller.button, seller.buttonText) >= 4.5, 'must meet 4.5:1')
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
