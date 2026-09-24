/**
 * Browser acceptance checks for Phase 4. Run against a production server:
 *   npm run build && npm run start -- -p 3100
 *   npm run property-check
 *
 * Set CHROME_PATH if Chromium is installed outside the project default.
 * The suite asserts that each fixture state was reached before checking it.
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CHROME = process.env.CHROME_PATH ??
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const FULL = '/property/4-bhk-flat-for-sale-in-ballygunge-p5d40ab'
const MULTI = '/property/3-bhk-flat-for-sale-in-new-town-p8f3c2a'
const ONE = '/property/2-bhk-flat-for-rent-in-salt-lake-p2b91de'
const EMPTY = '/property/2-bhk-builder-floor-for-sale-in-behala-p9c17f4'
const THIN = '/property/5-bhk-independent-house-for-sale-in-howrah-pb4c0d2'
const WIDTHS = [360, 390, 412, 768, 1280]
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
let failures = 0
let assertions = 0

function check(name, condition, detail = '') {
  assertions++
  if (!condition) failures++
  console.log(`  ${condition ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}

async function ready(page, path) {
  await page.goto(BASE + path, { waitUntil: 'load' })
  await page.locator('h1').first().waitFor({ state: 'visible' })
  await page.evaluate(() => document.fonts.ready)
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  console.log('\nRoute identity and status')
  const response = await page.request.get(BASE + FULL, { maxRedirects: 0 })
  check('canonical route returns 200', response.status() === 200)
  const wrong = await page.request.get(BASE + '/property/old-title-p5d40ab', { maxRedirects: 0 })
  check('wrong slug returns 301 to canonical', wrong.status() === 301 &&
    new URL(wrong.headers().location, BASE).pathname === FULL)
  const legacy = await page.request.get(BASE +
    '/property/4-bhk-flat-for-sale-in-ballygunge-p_5d40ab', { maxRedirects: 0 })
  check('old URL redirects', legacy.status() === 301 &&
    new URL(legacy.headers().location, BASE).pathname === FULL)
  for (const handle of ['missing-pabcdef', 'bad-pXX', 'bad-p', 'bad']) {
    const res = await page.request.get(BASE + '/property/' + handle, { maxRedirects: 0 })
    check(`unknown or malformed ${handle} returns 404`, res.status() === 404)
  }

  console.log('\nProperty content and gallery')
  await ready(page, FULL)
  const heads = await page.locator('article h1, article h2, article h3').evaluateAll((els) =>
    els.map((el) => Number(el.tagName[1])))
  check('one h1, no skipped heading levels', heads[0] === 1 && heads.filter((n) => n === 1).length === 1 &&
    heads.every((n, i) => i === 0 || n <= heads[i - 1] + 1), heads.join(','))
  check('photo region renders', await page.getByRole('region', { name: 'Property photos' }).count() === 1)
  for (const title of ['Property details', 'Amenities', 'About this property',
    'Area breakdown', 'Location']) {
    check(`${title} section renders`, await page.getByRole('heading', { name: title, exact: true }).count() > 0)
  }
  check('price and carpet basis render', /₹|Rs/.test(await page.locator('article').innerText()) &&
    /carpet/i.test(await page.locator('article').innerText()))
  check('development imagery is visibly marked', await page.getByText('Sample image — not a real property').count() > 0)
  const contrast = await page.evaluate(() => {
    const rgb = (css) => {
      const c = document.createElement('canvas').getContext('2d')
      c.fillStyle = css
      c.fillRect(0, 0, 1, 1)
      return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3)
    }
    const lum = (color) => {
      const [r, g, b] = rgb(color).map((v) => {
        v /= 255
        return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4
      })
      return .2126 * r + .7152 * g + .0722 * b
    }
    const ratio = (el, background) => {
      const a = lum(getComputedStyle(el).color)
      const b = lum(background)
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
    }
    return {
      heading: ratio(document.querySelector('article h1'), '#fff'),
      action: ratio(document.querySelector('aside form button[type="submit"]'), getComputedStyle(document.querySelector('aside form button[type="submit"]')).backgroundColor),
      details: ratio(document.querySelector('#details-heading'), '#fff'),
    }
  })
  check('new heading, detail and action text contrast at least 4.5:1',
    Object.values(contrast).every((n) => n >= 4.5), JSON.stringify(contrast))
  check('no seller phone is rendered', !(await page.locator('body').innerText()).match(/\b[6-9]\d{9}\b/))
  const ld = await page.locator('script[type="application/ld+json"]').textContent()
  const graph = JSON.parse(ld)['@graph']
  check('structured listing and breadcrumb parse', graph.some((x) => x['@type'] === 'RealEstateListing') &&
    graph.some((x) => x['@type'] === 'BreadcrumbList'))
  const more = page.getByRole('button', { name: 'Read more' })
  check('long description has an expand control', await more.count() === 1)
  if (await more.count()) {
    check('collapsed description reports false', await more.getAttribute('aria-expanded') === 'false')
    await more.click()
    check('expanded description reports true', await page.getByRole('button', { name: 'Show less' })
      .getAttribute('aria-expanded') === 'true')
  }
  const initial = await page.locator('[aria-live="polite"]').filter({ hasText: /^Image / }).innerText()
  const next = page.getByRole('button', { name: 'Next photo' })
  await next.focus()
  await page.keyboard.press('ArrowRight')
  check('gallery arrow changes the announced position', initial !==
    await page.locator('[aria-live="polite"]').filter({ hasText: /^Image / }).innerText())
  check('gallery navigation keeps focus', await next.evaluate((el) => document.activeElement === el))
  check('twelve-image strip exists', await page.getByRole('button', { name: /^Show photo/ }).count() === 12)
  const similarLinks = await page.locator('section[aria-labelledby="similar-heading"] a[href^="/property/"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href')))
  check('similar listings exclude the current listing', !similarLinks.includes(FULL))
  check('similar section has at least four listings if shown', similarLinks.length === 0 ||
    new Set(similarLinks).size >= 4)

  await ready(page, ONE)
  check('one photo has no controls or counter', await page.getByRole('button', { name: 'Next photo' }).count() === 0 &&
    await page.getByRole('button', { name: /^Show photo/ }).count() === 0)
  await ready(page, EMPTY)
  check('no-photo placeholder renders', await page.getByText('The seller has not added photos yet').count() === 1)
  check('missing description omits section', await page.getByRole('heading', { name: 'About this property' }).count() === 0)
  check('no-photo listing omits gallery controls', await page.getByRole('button', { name: 'Next photo' }).count() === 0)
  await ready(page, THIN)
  check('thin listing omits similar section',
    await page.getByRole('heading', { name: 'Similar properties' }).count() === 0)

  console.log('\nEnquiry and navigation')
  await ready(page, MULTI)
  const form = page.locator('aside form')
  await form.getByLabel('Your name').fill('Phase Four Browser Check')
  await form.getByLabel('Mobile number').fill('12345')
  await form.getByLabel('Message').fill('Please share viewing details')
  await form.getByRole('button', { name: 'Send enquiry' }).click()
  await form.getByRole('alert').waitFor()
  check('invalid phone reports error', /mobile|phone/i.test(await form.getByRole('alert').innerText()))
  check('failed submission preserves name and message',
    await form.getByLabel('Your name').inputValue() === 'Phase Four Browser Check' &&
    await form.getByLabel('Message').inputValue() === 'Please share viewing details')
  await form.getByLabel('Mobile number').fill('9876543210')
  await form.getByRole('button', { name: 'Send enquiry' }).click()
  const succeeded = await page.locator('aside [role="status"]').waitFor({ timeout: 10000 })
    .then(() => true).catch(() => false)
  check('valid enquiry reports success', succeeded &&
    /Enquiry sent/i.test(await page.locator('aside [role="status"]').innerText()),
    succeeded ? '' : (await page.locator('aside').innerText()).slice(0, 300))
  await ready(page, '/buy/kolkata?bhk=3')
  const resultLink = page.locator('article h3 a[href^="/property/"]:visible').first()
  await resultLink.waitFor({ state: 'visible' })
  const href = await resultLink.getAttribute('href')
  await resultLink.click()
  await page.locator('article h1').waitFor()
  check('result card opens a property', new URL(page.url()).pathname === href)
  await page.goBack()
  check('back keeps the filtered result URL', new URL(page.url()).searchParams.get('bhk') === '3')
  await ready(page, FULL)
  // Traverse by keyboard rather than merely counting focusable nodes.
  // These controls must be in the actual tab order, in reading order.
  await page.locator('body').focus()
  const reached = []
  for (let i = 0; i < 90; i++) {
    await page.keyboard.press('Tab')
    const label = await page.evaluate(() => {
      const el = document.activeElement
      return el?.getAttribute('aria-label') || el?.textContent?.trim() || el?.getAttribute('name') || ''
    })
    for (const key of ['Next photo', 'Read more', 'Send enquiry']) {
      if (label.includes(key) && !reached.includes(key)) reached.push(key)
    }
    if (reached.length === 3) break
  }
  check('gallery, description and enquiry reached by Tab in order',
    reached.join('|') === 'Next photo|Read more|Send enquiry', reached.join(' → '))
  await context.close()

  console.log('\nJavaScript-disabled submission')
  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const noJsPage = await noJs.newPage()
  await noJsPage.goto(BASE + MULTI, { waitUntil: 'load' })
  const noJsVisible = await noJsPage.locator('h1:visible').count()
  check('page is visible without JavaScript', noJsVisible === 1,
    noJsVisible ? '' : (await noJsPage.locator('body').innerText()).slice(0, 200))
  if (noJsVisible) {
    const noJsForm = noJsPage.locator('aside form')
    await noJsForm.getByLabel('Your name').fill('No JS Browser Check')
    await noJsForm.getByLabel('Mobile number').fill('9876543211')
    await noJsForm.getByRole('button', { name: 'Send enquiry' }).click()
    check('form submits without JavaScript', await noJsPage.locator('aside [role="status"]')
      .waitFor({ timeout: 10000 }).then(() => true).catch(() => false))
  } else {
    check('form submits without JavaScript', false, 'property content is hidden')
  }
  await noJs.close()

  console.log('\nResponsive layout, sticky action, layout shift')
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } })
    const p = await ctx.newPage()
    await p.addInitScript(() => {
      window.__shift = 0
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__shift += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await ready(p, FULL)
    await p.locator('article img').first().waitFor({ state: 'visible' })
    await p.waitForTimeout(400)
    const metrics = await p.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      shift: window.__shift,
    }))
    check(`${width}px no horizontal overflow`, metrics.scroll <= metrics.client + 1,
      `${metrics.scroll}/${metrics.client}`)
    check(`${width}px gallery CLS ≤ 0.05`, metrics.shift <= 0.05, metrics.shift.toFixed(3))
    if (width < 1024) {
      const bar = p.locator('div.fixed').filter({ has: p.getByRole('button', { name: /^Contact / }) })
      for (const position of [0, 0.5, 1]) {
        await p.evaluate((fraction) => window.scrollTo(0,
          (document.documentElement.scrollHeight - innerHeight) * fraction), position)
        check(`${width}px contact visible at ${position * 100}% scroll`,
          await bar.getByRole('button', { name: /^Contact / }).isVisible())
      }
      const footerClear = await p.evaluate(() => {
        const footer = document.querySelector('footer')
        const fixed = document.querySelector('div.fixed:has(button[aria-haspopup="dialog"])')
        return footer && fixed && footer.getBoundingClientRect().bottom <= fixed.getBoundingClientRect().top + 1
      })
      check(`${width}px footer clears sticky contact at page end`, footerClear)
    } else {
      check('desktop contact form visible', await p.locator('aside form').isVisible())
    }
    await ctx.close()
  }
} finally {
  await browser.close()
}
console.log(`\n${assertions - failures}/${assertions} property assertions passed`)
process.exitCode = failures ? 1 : 0
