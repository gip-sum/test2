// Visual verification harness. Renders routes at the four target widths and
// reports horizontal overflow, which is the defect class that hides from
// eyeballing a screenshot.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const BASE = process.env.BASE ?? 'http://127.0.0.1:3100'
const OUT = process.env.OUT ?? '/tmp/shots'
const WIDTHS = [390, 412, 768, 1280]
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/']

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
    const slug = route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '')
    await page.screenshot({ path: `${OUT}/${slug}-${width}.png`, fullPage: true })
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
