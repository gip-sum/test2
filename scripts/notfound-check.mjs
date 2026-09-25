// Browser assertions for the animated 404 (app/not-found.tsx).
//
// Measures what a screenshot cannot: the status code, where each button
// actually goes, that keyboard focus is visible, that the animation runs —
// and stops under prefers-reduced-motion — and that the page fetches
// nothing from another origin.
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const TITLE = 'This address doesn’t feel like home.'
let passed = 0

async function check(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`)
  passed++
  console.log(`ok ${label}`)
}

const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
const focusRing = (page) => page.evaluate(() => {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return null
  const style = getComputedStyle(el)
  return { text: el.textContent?.trim(), visible: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2 }
})

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  const foreign = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(base) && !url.startsWith('data:')) foreign.push(url)
  })

  // ── Every way of reaching the page, with a real 404 status ───────────
  for (const path of ['/this-page-does-not-exist', '/property/missing-pabcdef', '/buy/atlantis', '/a/b/c?x=1']) {
    const response = await page.goto(`${base}${path}`)
    await check(`${path} returns 404 with the animated page`, response.status() === 404 && await page.getByRole('heading', { level: 1, name: TITLE }).isVisible() && await page.locator('.nf-scene').count() === 1)
  }
  await check('the bottom nav is shown even under /property', await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Saved' }).isVisible())

  await page.goto(`${base}/this-page-does-not-exist`)
  await check('one h1, and the page is titled', await page.locator('h1').count() === 1 && (await page.title()).startsWith('Page not found'))
  await check('the illustration and numerals are hidden from assistive tech', await page.locator('svg.nf-scene[aria-hidden="true"]').count() === 1 && await page.locator('.nf-code[aria-hidden="true"]').count() === 1)
  await check('the error is still stated in text', await page.getByText('Error 404 · Page not found').isVisible())
  await check('both actions are single links, not buttons inside links', await page.locator('.nf-actions a').count() === 2 && await page.locator('.nf-actions button').count() === 0)

  // ── Motion runs, on transform and opacity only ───────────────────────
  const motion = await page.evaluate(() => {
    const scene = document.querySelector('.nf-scene')
    const animations = document.getAnimations().filter((a) => scene?.contains(a.effect?.target ?? null))
    const properties = new Set(animations.flatMap((a) => a.effect.getKeyframes().flatMap((k) => Object.keys(k))))
    return { running: animations.filter((a) => a.playState === 'running').length, properties: [...properties] }
  })
  await check('the scene is animating', motion.running >= 10)
  await check('only transform and opacity are animated', motion.properties.every((p) => ['transform', 'opacity', 'offset', 'easing', 'composite', 'computedOffset'].includes(p)))

  // ── Keyboard: the two actions are reachable and visibly focused ──────
  await page.locator('#nf-title').click()
  await page.keyboard.press('Tab')
  const first = await focusRing(page)
  await check('Tab reaches Go to homepage with a visible focus ring', first?.text === 'Go to homepage' && first.visible)
  await page.keyboard.press('Tab')
  const second = await focusRing(page)
  await check('Tab reaches Browse properties with a visible focus ring', second?.text === 'Browse properties' && second.visible)
  await page.keyboard.press('Enter')
  await page.waitForURL((url) => url.pathname === '/buy/kolkata')
  await page.locator('article').first().waitFor()
  await check('Browse properties opens the search results', await page.locator('article').count() > 0)

  await page.goto(`${base}/this-page-does-not-exist`)
  await page.getByRole('link', { name: 'Go to homepage' }).click()
  await page.waitForURL((url) => url.pathname === '/')
  await check('Go to homepage opens the homepage', await page.locator('#home-title').isVisible())

  // ── Widths ───────────────────────────────────────────────────────────
  for (const width of [390, 412, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/this-page-does-not-exist', '/property/missing-pabcdef']) {
      await page.goto(`${base}${path}`)
      await check(`${width}px ${path} has no horizontal overflow`, await noOverflow(page))
    }
    const boxes = await page.locator('.nf-actions a').evaluateAll((links) => links.map((l) => l.getBoundingClientRect()).map((r) => ({ h: r.height, left: r.left, right: r.right })))
    await check(`${width}px both actions are at least 44px tall and fully on screen`, boxes.length === 2 && boxes.every((b) => b.h >= 44 && b.left >= 0 && b.right <= width))
    const scene = await page.locator('.nf-scene').boundingBox()
    await check(`${width}px the scene is drawn at a readable size`, scene && scene.width >= 300)
  }

  await check('nothing is fetched from another origin', foreign.length === 0)
  await check('no script errors', errors.length === 0)
  await page.close()

  // ── Reduced motion: a complete still picture, nothing moving ─────────
  const still = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  await still.goto(`${base}/this-page-does-not-exist`)
  const rest = await still.evaluate(() => {
    const scene = document.querySelector('.nf-scene')
    const moving = document.getAnimations().filter((a) => scene?.contains(a.effect?.target ?? null) || a.effect?.target?.closest?.('.nf-zero')).length
    const pin = getComputedStyle(document.querySelector('.nf-pin')).opacity
    const question = getComputedStyle(document.querySelector('.nf-question')).opacity
    const walk = getComputedStyle(document.querySelector('.nf-walk')).animationName
    return { moving, pin, question, walk }
  })
  await check('reduced motion stops every scene animation', rest.moving === 0 && rest.walk === 'none')
  await check('reduced motion still shows the full picture: pin and question mark', rest.pin === '1' && rest.question === '1')
  await still.close()
} finally {
  await browser.close()
}

console.log(`${passed} passed, 0 failed`)
