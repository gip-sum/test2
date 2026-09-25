// Visual verification harness. Renders routes at the four target widths and
// reports horizontal overflow, which is the defect class that hides from
// eyeballing a screenshot.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EXECUTABLE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const BASE = process.env.BASE ?? 'http://127.0.0.1:3100'
const OUT = process.env.OUT ?? join(tmpdir(), 'gharbazaar-shots')
const WIDTHS = [390, 412, 768, 1280]
const DEFAULT_ROUTES = [
  '/',
  '/post',
  '/post?role=OWNER&intent=buy&type=APARTMENT',
  // Phase 12: a failed submission (error summary, every field marked) and a review.
  '/post?role=OWNER&intent=buy&type=APARTMENT&carpet=',
  '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=3&baths=2&unit=sqft&carpet=1240&super=1650&furnishing=SEMI_FURNISHED&floor=4&floors=12&status=READY&age=6',
  '/buy/kolkata',
  '/rent/kolkata',
  '/buy/kolkata/new-town',
  // The widest content the grid has to hold: a long locality name, a long
  // society name and the widest price string, all filtered at once.
  '/buy/kolkata?loc=uttarpara-kotrung,ballygunge&bhk=2,3,4&type=APARTMENT&sort=price_desc',
  // Zero results, whose recovery panel has its own layout.
  '/buy/kolkata?loc=howrah&type=VILLA&bhk=5&pmax=1600000',
  '/property/4-bhk-flat-for-sale-in-ballygunge-p5d40ab',
  '/property/2-bhk-builder-floor-for-sale-in-behala-p9c17f4',
]
const routes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROUTES

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] })

let failures = 0
for (const route of routes) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
      isMobile: width < 768,
      hasTouch: width < 768,
    })
    const page = await ctx.newPage()
    await page.goto(BASE + route, { waitUntil: 'load' })
    // Fonts change metrics, so measure only once they have settled.
    await page.evaluate(() => document.fonts.ready)
    const m = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      // Name the widest offending elements so the fix is obvious.
      offenders: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} → ${Math.round(el.getBoundingClientRect().right)}px`),
    }))
    const slug = route === '/' ? 'home' : route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
    await page.screenshot({ path: join(OUT, `${slug}-${width}.png`), fullPage: true })
    const overflow = m.scrollWidth > m.clientWidth + 1
    if (overflow) failures++
    console.log(
      `${route} @${width}  scroll=${m.scrollWidth} client=${m.clientWidth}  ${overflow ? 'OVERFLOW' : 'ok'}`,
    )
    if (overflow) m.offenders.forEach((o) => console.log(`      ${o}`))
    await ctx.close()
  }
}
await browser.close()
if (failures) { console.log(`\n${failures} width(s) overflow horizontally`); process.exit(1) }
console.log('\nno horizontal overflow at any width')
