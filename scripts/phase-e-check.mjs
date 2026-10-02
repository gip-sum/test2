// Reference-specific regressions: banner, compact search, nested focus,
// independent menu scrolling, guest view and layouts at the supplied widths.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const out = process.env.PHASE_E_SHOTS ?? '/tmp/gharbazaar-phase-e'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
let passed = 0
function check(label, ok) { if (!ok) throw new Error(`FAIL ${label}`); passed++; console.log(`ok ${label}`) }
try {
  for (const width of [360, 390, 412, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' })
    await page.goto(base)
    await page.evaluate(() => document.fonts.ready)
    await page.getByRole('button', { name: /^Banner 2:/ }).click()
    check(`${width}: banner changes accessible content`, await page.getByRole('heading', { name: 'Your next move starts here' }).isVisible())
    check(`${width}: banner destination matches selected slide`, await page.getByRole('link', { name: 'Find a rental' }).getAttribute('href') === '/rent/kolkata')
    await page.locator('.reference-search-trigger').click()
    // Visibility precedes Radix's focus-scope effect. Wait for its autofocus
    // before opening a child, and before sending Escape to that child; otherwise
    // a fast CI runner can dispatch the key while the parent still owns focus.
    await page.waitForFunction(() => {
      const dialog = document.activeElement?.closest('[role="dialog"]')
      const title = dialog?.getAttribute('aria-labelledby')
      return title && document.getElementById(title)?.textContent === 'Find your home'
    })
    await page.getByRole('button', { name: /^More filters/ }).click()
    await page.getByRole('dialog', { name: 'More filters' }).waitFor()
    await page.waitForFunction(() => {
      const dialog = document.activeElement?.closest('[role="dialog"]')
      const title = dialog?.getAttribute('aria-labelledby')
      return title && document.getElementById(title)?.textContent === 'More filters'
    })
    await page.keyboard.press('Escape')
    await page.getByRole('dialog', { name: 'More filters' }).waitFor({ state: 'hidden' })
    await page.waitForFunction(() => document.activeElement?.textContent?.includes('More filters'))
    check(`${width}: closing child keeps background inert`, await page.locator('[data-app-root]').evaluate(e => e.inert))
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[data-app-root]').inert)
    await page.waitForFunction(() => document.activeElement === document.querySelector('.reference-search-trigger'))
    check(`${width}: closing search returns focus`, await page.locator('.reference-search-trigger').evaluate(e => e === document.activeElement))
    await page.locator('.reference-search-trigger').blur()
    for (const [name, selector] of [['discovery', '.discovery-band'], ['localities', '#localities'], ['tools', '.reference-tools']]) {
      await page.locator(selector).first().evaluate(el => window.scrollTo(0, scrollY + el.getBoundingClientRect().top - 90))
      if (width < 768) {
        await page.locator('.reference-search[data-stuck]').waitFor()
        await page.locator('header.app-bar').waitFor({ state: 'hidden' })
      }
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await page.screenshot({ path: `${out}/${name}-${width}.png` })
      check(`${width}: ${name} no document overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    }
    if (width < 768) {
      check(`${width}: scrolled search at top`, Math.abs((await page.locator('.reference-search').boundingBox()).y) <= 1)
      check(`${width}: scrolled header replaced by search`, !await page.locator('header.app-bar').isVisible())
      await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('button', { name: 'Menu', exact: true }).click()
      const rail = page.locator('.reference-menu-categories')
      const before = await rail.boundingBox()
      await page.locator('.reference-menu-content').evaluate(e => e.scrollTop = e.scrollHeight)
      check(`${width}: catalogue scroll keeps category rail in place`, Math.abs((await rail.boundingBox()).y - before.y) <= 1 && await page.locator('.reference-menu-content').evaluate(e => e.scrollTop > 0))
      await page.screenshot({ path: `${out}/menu-scrolled-${width}.png` })
    }
    await page.close()
  }
  console.log(`${passed} Phase E checks passed`)
} finally { await browser.close() }
