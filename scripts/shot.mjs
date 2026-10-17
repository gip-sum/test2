import { createHash } from 'node:crypto'
// Visual verification harness. Renders routes at every phone, tablet and
// desktop width we support and reports horizontal overflow, which is the
// defect class that hides from eyeballing a screenshot.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EXECUTABLE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const BASE = process.env.BASE ?? 'http://127.0.0.1:3100'
const OUT = process.env.OUT ?? join(tmpdir(), 'gharbazaar-shots')
// 320–430 are the phones in use. UI-02 added 320/360/375/430 after the
// search sort control was found overflowing below ~350px, unseen because
// the narrowest width checked was 390. 768 and 1280 are tablet and desktop.
const WIDTHS = [320, 360, 375, 390, 412, 430, 768, 1280]
const DEFAULT_ROUTES = [
  '/',
  '/post',
  '/post?role=OWNER&intent=buy&type=APARTMENT',
  // Phase 12: a failed submission (error summary, every field marked) and a review.
  '/post?role=OWNER&intent=buy&type=APARTMENT&carpet=',
  '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=3&baths=2&unit=sqft&carpet=1240&super=1650&furnishing=SEMI_FURNISHED&floor=4&floors=12&status=READY&age=6',
  // Phase 13: location form, validation error and long-address combined review.
  '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=3&baths=2&unit=sqft&carpet=1240&super=1650&furnishing=SEMI_FURNISHED&floor=4&floors=12&status=READY&age=6&step=location',
  '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=3&baths=2&unit=sqft&carpet=1240&super=1650&furnishing=SEMI_FURNISHED&floor=4&floors=12&status=READY&age=6&city=kolkata&locality=missing&address=&step=location-review',
  '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=3&baths=2&unit=sqft&carpet=1240&super=1650&furnishing=SEMI_FURNISHED&floor=4&floors=12&status=READY&age=6&city=kolkata&locality=new-town&sublocality=new-town-action-area-i&address=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&lat=22.58&lng=88.46&step=location-review',
  // Phase 14: pricing form, invalid input and maximum-price review.
  '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=2&baths=2&unit=sqft&carpet=1000&furnishing=UNFURNISHED&floor=3&floors=8&status=READY&age=4&city=kolkata&locality=new-town&address=Test+building+address&step=pricing',
  '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=2&baths=2&unit=sqft&carpet=1000&furnishing=UNFURNISHED&floor=3&floors=8&status=READY&age=4&city=kolkata&locality=new-town&address=Test+building+address&saleprice=1.5&step=pricing-review',
  '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=2&baths=2&unit=sqft&carpet=1000&furnishing=UNFURNISHED&floor=3&floors=8&status=READY&age=4&city=kolkata&locality=new-town&address=Test+building+address&saleprice=10000000000&maintenance=separate&maintenanceAmount=1000000&negotiable=yes&step=pricing-review',
  // Sign-in: the scene beside (desktop) or above (phones) the form.
  '/login',
  '/login?mode=register',
  // The animated 404, reached by an unmatched path and by a dead listing.
  '/this-page-does-not-exist',
  '/property/missing-pabcdef',
  // Phase 40A: the calculators, one with a lender-limit warning and a
  // thirty-year schedule, the widest figures they print.
  '/calculators',
  '/calculators/emi?price=125000000&down=25000000&years=30',
  '/calculators/budget',
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
    // Streamed routes (search results) are still a loading skeleton at
    // `load`: the real content waits in hidden Suspense segments that React
    // reveals in throttled batches afterwards. Measuring then checked the
    // skeleton, not the page. Wait for every segment, then one painted frame;
    // a segment that never arrives times out loudly rather than passing.
    await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"], template[id^="B:"]'), null, { timeout: 15000 })
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
    const m = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      // Name the widest offending elements so the fix is obvious.
      offenders: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} → ${Math.round(el.getBoundingClientRect().right)}px`),
      // The phone's fixed bottom bar must sit inside the viewport. When the
      // page overflowed, the bar was laid out to the wider page and its last
      // items (Activity, Menu) went off-screen with it.
      barRight: (() => {
        const bar = document.querySelector('.app-bar-bottom')
        if (!bar || getComputedStyle(bar).display === 'none') return null
        return Math.round(bar.getBoundingClientRect().right)
      })(),
    }))
    const readable = route === '/' ? 'home' : route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
    // Addresses and query-heavy routes exceed filesystem filename limits.
    // Keep a readable prefix plus a hash so distinct long routes cannot collide.
    const slug = readable.length <= 180 ? readable : `${readable.slice(0, 120)}-${createHash('sha256').update(route).digest('hex').slice(0, 12)}`
    await page.screenshot({ path: join(OUT, `${slug}-${width}.png`), fullPage: true })
    const barOut = m.barRight !== null && m.barRight > m.clientWidth + 1
    const overflow = m.scrollWidth > m.clientWidth + 1 || barOut
    if (overflow) failures++
    console.log(
      `${route} @${width}  scroll=${m.scrollWidth} client=${m.clientWidth}${m.barRight !== null ? ` bar=${m.barRight}` : ''}  ${overflow ? (barOut ? 'OVERFLOW (bottom bar outside viewport)' : 'OVERFLOW') : 'ok'}`,
    )
    if (overflow) m.offenders.forEach((o) => console.log(`      ${o}`))
    await ctx.close()
  }
}
await browser.close()
if (failures) { console.log(`\n${failures} width(s) overflow horizontally`); process.exit(1) }
console.log('\nno horizontal overflow at any width')
