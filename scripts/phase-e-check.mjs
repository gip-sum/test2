// Reference-specific regressions: focus around the homepage's filter sheet,
// the header while the page scrolls, independent menu scrolling and layouts
// at the supplied widths. UI-14 replaced the banner carousel and the
// launcher-opened search sheet with a hero and an inline search, so the
// carousel checks went with the carousel and the nested-focus checks now
// cover the one sheet the search opens.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const out = process.env.PHASE_E_SHOTS ?? '/tmp/gharbazaar-phase-e'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
let passed = 0
// UI-04: sheets rise (phones) or scale from 0.97 (640px+) for 300ms and header
// panels drop 4px for 150ms. Geometry assertions are about where things rest,
// so wait for an element's entrance to finish before measuring it.
const settled = (locator) => locator.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished)))
function check(label, ok) { if (!ok) throw new Error(`FAIL ${label}`); passed++; console.log(`ok ${label}`) }
async function waitFilterFocus(page) {
  try { await page.waitForFunction(() => document.activeElement?.tagName === 'BUTTON' && document.activeElement?.textContent?.trim() === 'More filters') }
  catch (error) {
      console.log('focus restoration diagnostics', await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        role: document.activeElement?.getAttribute('role'),
        label: document.activeElement?.getAttribute('aria-label'),
        text: document.activeElement?.textContent?.slice(0, 120),
        inertAncestor: Boolean(document.activeElement?.closest('[inert]')),
        dialogs: [...document.querySelectorAll('[role="dialog"]')].map(e => ({ title: document.getElementById(e.getAttribute('aria-labelledby'))?.textContent, state: e.getAttribute('data-state') })),
      })))
      throw error
    }
}
try {
  for (const width of [360, 390, 412, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' })
    await page.goto(base)
    await page.evaluate(() => document.fonts.ready)
    const form = page.getByRole('form', { name: 'Search properties' })
    check(`${width}: the hero states the page and holds the search`, await page.getByRole('heading', { level: 1, name: /^Find your next home in Kolkata$/ }).isVisible() && await form.isVisible())
    await page.waitForFunction(() => document.querySelector('form[aria-label="Search properties"] [role=tablist][data-indicator]'))
    const more = form.getByRole('button', { name: /^More filters/ })
    // Repeat a fast open/close to exercise delayed FocusScope cleanup: each
    // time, focus must come back to More filters and the page be released.
    for (let cycle = 1; cycle <= 4; cycle++) {
      await more.click()
      await page.getByRole('dialog', { name: 'More filters' }).waitFor()
      // Visibility precedes Radix's focus-scope effect: wait for its
      // autofocus before sending Escape, or a fast CI runner can dispatch the
      // key while the page still owns focus.
      await page.waitForFunction(() => {
        const dialog = document.activeElement?.closest('[role="dialog"]')
        return document.getElementById(dialog?.getAttribute('aria-labelledby'))?.textContent === 'More filters'
      })
      check(`${width}: More filters ${cycle} makes the page behind it inert`, await page.locator('[data-app-root]').evaluate(e => e.inert))
      await page.keyboard.press('Escape')
      await page.getByRole('dialog', { name: 'More filters' }).waitFor({ state: 'hidden' })
      await waitFilterFocus(page)
      check(`${width}: closing More filters ${cycle} releases the page and returns focus to it`, await page.locator('[data-app-root]').evaluate(e => !e.inert) && await more.evaluate(e => e === document.activeElement))
    }
    await more.blur()
    for (const [name, selector] of [['localities', '#localities'], ['types', 'section[aria-labelledby="browse-type"]'], ['tools', 'section[aria-labelledby="plan-purchase"]']]) {
      await page.locator(selector).first().evaluate(el => window.scrollTo(0, scrollY + el.getBoundingClientRect().top - 90))
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await page.screenshot({ path: `${out}/${name}-${width}.png` })
      check(`${width}: ${name} no document overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      // The header stays: pinned, visible, above the page (the old compact
      // search bar used to replace it on phones).
      check(`${width}: ${name} keeps the header pinned at the top`, Math.abs((await page.locator('header.app-bar').boundingBox()).y) <= 1 && await page.locator('header.app-bar').isVisible())
    }
    if (width < 768) {
      await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('button', { name: 'Menu', exact: true }).click()
      const rail = page.locator('.reference-menu-categories')
      await page.getByRole('dialog').waitFor()
      await settled(page.getByRole('dialog'))
      const before = await rail.boundingBox()
      await page.locator('.reference-menu-content').evaluate(e => e.scrollTop = e.scrollHeight)
      check(`${width}: catalogue scroll keeps category rail in place`, Math.abs((await rail.boundingBox()).y - before.y) <= 1 && await page.locator('.reference-menu-content').evaluate(e => e.scrollTop > 0))
      await page.screenshot({ path: `${out}/menu-scrolled-${width}.png` })
    }
    await page.close()
  }
  console.log(`${passed} Phase E checks passed`)
} finally { await browser.close() }
