/** Phase 5 acceptance checks. Run against npm start on port 3100. */
import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const MANY = '/property/4-bhk-flat-for-sale-in-ballygunge-p5d40ab'
const ONE = '/property/2-bhk-flat-for-rent-in-salt-lake-p2b91de'
const NONE = '/property/2-bhk-builder-floor-for-sale-in-behala-p9c17f4'
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  if (ok) passed++
  else failed++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}
async function visit(page, path) {
  await page.goto(BASE + path, { waitUntil: 'load' })
  await page.locator('article h1:visible').waitFor()
}
const position = (page) => page.locator('section[aria-label="Property photos"] > p[role="status"]').innerText()

async function swipe(page, x0, y0, x1, y1) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1, y: y1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await desktop.newPage()
  await visit(page, MANY)
  const gallery = page.getByRole('region', { name: 'Property photos' })
  check('twelve thumbnails', await gallery.getByRole('button', { name: /^Show photo/ }).count() === 12)
  check('four preview tiles form the desktop mosaic', await gallery.getByRole('button', { name: /of 12 full screen$/ }).count() === 4)
  check('counter starts at 1 of 12', /^Image 1 of 12/.test(await position(page)))
  check('all thumbnails carry sample markers', await gallery.locator('ul[aria-label="Choose a photo"] span:has-text("Sample")').count() === 12)
  const img = gallery.locator('div[aria-roledescription="carousel"] img').first()
  check('lead image has responsive srcset and sizes', Boolean(await img.getAttribute('srcset')) &&
    (await img.getAttribute('sizes')).includes('100vw'))
  check('lead image eager, thumbnails lazy', await img.getAttribute('loading') === 'eager' &&
    await gallery.locator('ul[aria-label="Choose a photo"] img').first().getAttribute('loading') === 'lazy')
  await gallery.getByRole('button', { name: 'Previous photo' }).click()
  check('inline previous wraps to last image', /^Image 12 of 12/.test(await position(page)))
  await gallery.getByRole('button', { name: 'Next photo' }).click()
  check('inline next returns to first', /^Image 1 of 12/.test(await position(page)))
  const tile = gallery.getByRole('button', { name: 'View photo 3 of 12 full screen' })
  await tile.click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  if (process.env.MEDIA_SHOT_DIR) {
    await mkdir(process.env.MEDIA_SHOT_DIR, { recursive: true })
    await page.screenshot({ path: `${process.env.MEDIA_SHOT_DIR}/desktop-gallery.png` })
  }
  check('tile opens dialog at chosen image', /^Full screen image 3 of 12/.test(await dialog.getByRole('status').innerText()))
  check('dialog main image uses contain and viewport sizes', await dialog.locator('div.relative.flex-1 img').first().getAttribute('sizes') === '100vw' &&
    (await dialog.locator('div.relative.flex-1 img').first().getAttribute('class')).includes('object-contain'))
  await dialog.getByRole('button', { name: 'Next full-screen photo' }).focus()
  await page.keyboard.press('ArrowRight')
  check('dialog arrow key advances and keeps focus', /^Full screen image 4 of 12/.test(await dialog.getByRole('status').innerText()) &&
    await dialog.getByRole('button', { name: 'Next full-screen photo' }).evaluate((el) => document.activeElement === el))
  await page.keyboard.press('Escape')
  check('Escape closes dialog', await dialog.count() === 0)
  check('focus returns to selected tile', await tile.evaluate((el) => document.activeElement === el))
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const phone = await mobile.newPage()
  await visit(phone, MANY)
  check('mosaic previews hidden on phone', !(await phone.getByRole('button', { name: 'View photo 3 of 12 full screen' }).isVisible()))
  const before = await position(phone)
  await swipe(phone, 300, 220, 175, 228)
  check('horizontal swipe advances inline gallery', before !== await position(phone) && /^Image 2 of 12/.test(await position(phone)))
  await swipe(phone, 280, 190, 267, 330)
  check('vertical gesture does not advance gallery', /^Image 2 of 12/.test(await position(phone)))
  await phone.getByRole('button', { name: 'View full-screen gallery' }).click()
  const mobileDialog = phone.getByRole('dialog')
  if (process.env.MEDIA_SHOT_DIR) await phone.screenshot({ path: `${process.env.MEDIA_SHOT_DIR}/mobile-gallery.png` })
  check('full-screen starts on inline selection', /^Full screen image 2 of 12/.test(await mobileDialog.getByRole('status').innerText()))
  await swipe(phone, 300, 330, 165, 335)
  check('swipe advances full-screen gallery', /^Full screen image 3 of 12/.test(await mobileDialog.getByRole('status').innerText()))
  const dimensions = await phone.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }))
  check('mobile dialog does not overflow', dimensions.w <= dimensions.c + 1, `${dimensions.w}/${dimensions.c}`)
  await mobileDialog.getByRole('button', { name: 'Close gallery' }).click()
  check('close button restores opener focus', await phone.getByRole('button', { name: 'View full-screen gallery' })
    .evaluate((el) => document.activeElement === el))
  await visit(phone, ONE)
  check('one photo offers full screen without arrows or counter', await phone.getByRole('button', { name: 'View full-screen gallery' }).count() === 1 &&
    await phone.getByRole('button', { name: 'Next photo' }).count() === 0 &&
    !(await phone.getByRole('region', { name: 'Property photos' }).innerText()).includes('1 / 1'))
  await phone.getByRole('button', { name: 'View full-screen gallery' }).click()
  check('single photo dialog has no next control', await phone.getByRole('dialog').getByRole('button', { name: 'Next full-screen photo' }).count() === 0)
  await visit(phone, NONE)
  check('no photo has placeholder and no viewer', await phone.getByText('The seller has not added photos yet').count() === 1 &&
    await phone.getByRole('button', { name: 'View full-screen gallery' }).count() === 0)
  await mobile.close()

  const broken = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const errorPage = await broken.newPage()
  let blocked = 0
  await errorPage.route('**/_next/image?**', (route) => {
    const src = new URL(route.request().url()).searchParams.get('url')
    if (src?.endsWith('/living-warm.png')) { blocked++; return route.fulfill({ status: 500, body: 'unavailable' }) }
    return route.continue()
  })
  await visit(errorPage, MANY)
  const fallback = await errorPage.getByRole('img', { name: /image could not load/i }).first()
    .waitFor({ timeout: 8000 }).then(() => true).catch(() => false)
  check('failed image shows clear fallback', blocked > 0 && fallback, `blocked ${blocked} requests`)
  await errorPage.getByRole('button', { name: 'Next photo' }).click()
  check('failure does not block navigation', /^Image 2 of 12/.test(await position(errorPage)))
  await errorPage.route('**/_next/image?**', (route) => route.fulfill({ status: 500, body: 'unavailable' }))
  await errorPage.goto(BASE + '/buy/kolkata', { waitUntil: 'load' })
  const cardFallback = await errorPage.locator('article').getByRole('img', { name: /image could not load/i }).first()
    .waitFor({ timeout: 8000 }).then(() => true).catch(() => false)
  check('result card also handles a failed image', cardFallback)
  await broken.close()
} finally {
  await browser.close()
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exitCode = failed ? 1 : 0
