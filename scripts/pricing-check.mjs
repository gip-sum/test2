import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const details = 'role=OWNER&intent=buy&type=APARTMENT&bhk=2&baths=2&unit=sqft&carpet=1000&furnishing=UNFURNISHED&floor=3&floors=8&status=READY&age=4&city=kolkata&locality=new-town&address=Test+building+address'
let passed = 0
const check = (label, condition) => { if (!condition) throw new Error(`FAIL ${label}`); console.log(`ok ${label}`); passed++ }
mkdirSync('/tmp/gharbazaar-pricing-shots', { recursive: true })
try {
  // Native form flow also runs with JavaScript disabled.
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${base}/post?${details}&step=location-review`)
    await page.getByRole('link', { name: 'Continue to pricing' }).click()
    await page.getByRole('heading', { name: 'Set the property price.' }).waitFor()
    check(`sale form / JS ${javaScriptEnabled}`, await page.getByLabel('Sale price (₹)', { exact: true }).isVisible() && await page.getByLabel('Monthly rent (₹)', { exact: true }).count() === 0)
    check('conditional maintenance is initially hidden', !(await page.getByLabel('Monthly maintenance amount (₹)', { exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Review property and pricing' }).click()
    await page.locator('.post-error-summary').waitFor()
    check('empty pricing has three linked errors', await page.locator('.post-error-summary li').count() === 3)
    if (javaScriptEnabled) {
      check('error summary takes focus', await page.locator('.post-error-summary').evaluate((el) => el === document.activeElement))
      await page.locator('.post-error-summary a').first().click()
      check('error link focuses price', await page.getByLabel('Sale price (₹)', { exact: true }).evaluate((el) => el === document.activeElement))
    }
    await page.getByLabel('Sale price (₹)', { exact: true }).fill('62,50,000')
    await page.getByLabel('Monthly maintenance', { exact: true }).selectOption('separate')
    check('separate maintenance reveals amount', await page.getByLabel('Monthly maintenance amount (₹)', { exact: true }).isVisible())
    await page.getByLabel('Monthly maintenance amount (₹)', { exact: true }).fill('2.5')
    await page.getByLabel('Is the price negotiable?').selectOption('yes')
    await page.getByRole('button', { name: 'Review property and pricing' }).click()
    await page.locator('#maintenanceAmount-pricing-error').waitFor()
    check('invalid amount keeps grouped sale price', await page.getByLabel('Sale price (₹)', { exact: true }).inputValue() === '62,50,000')
    await page.getByLabel('Monthly maintenance amount (₹)', { exact: true }).fill('2500')
    await page.getByRole('button', { name: 'Review property and pricing' }).click()
    await page.getByRole('heading', { name: 'Check the property and pricing.' }).waitFor()
    const review = page.url()
    const pricing = page.getByRole('definition').filter({ hasText: 'Exact amount' })
    check('exact price and carpet rate visible', (await pricing.textContent()).includes('₹62,50,000') && (await page.getByRole('main').textContent()).includes('₹6,250 / sq. ft'))
    check('one h1 and all three reviews', await page.locator('h1').count() === 1 && await page.locator('dl').count() === 4)
    check('canonical whole rupees', new URL(review).searchParams.get('saleprice') === '6250000')
    await page.getByRole('link', { name: 'Change Carpet area', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to review' }).click()
    await page.getByRole('link', { name: 'Continue to location' }).click()
    await page.getByRole('button', { name: 'Review details and location' }).click()
    await page.getByRole('link', { name: 'Continue to pricing' }).click()
    check('earlier form submissions retain pricing', await page.getByLabel('Sale price (₹)', { exact: true }).inputValue() === '6250000')
    await page.getByLabel('Monthly maintenance', { exact: true }).selectOption('unknown')
    check('changing maintenance hides stale amount', !(await page.getByLabel('Monthly maintenance amount (₹)', { exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Review property and pricing' }).click()
    await page.getByRole('heading', { name: 'Check the property and pricing.' }).waitFor()
    check('unknown has no stale maintenance amount', !new URL(page.url()).searchParams.has('maintenanceAmount') && (await page.locator('dl[aria-label="Property pricing"]').textContent()).includes('Not known yet'))
    await page.getByRole('link', { name: 'Change You want to', exact: true }).click()
    await page.getByRole('link', { name: /Rent out a property/ }).click()
    await page.locator('main .post-choice').filter({ hasText: 'Flat / Apartment' }).click()
    check('intent switch drops sale amount', !new URL(page.url()).searchParams.has('saleprice'))
    const rental = details.replace('intent=buy', 'intent=rent').replace('&status=READY', '&available=now')
    await page.goto(`${base}/post?${rental}&step=pricing`)
    await page.getByLabel('Monthly rent (₹)', { exact: true }).fill('25,000')
    await page.getByLabel('Security deposit (₹)', { exact: true }).fill('0')
    await page.getByLabel('Monthly maintenance', { exact: true }).selectOption('included')
    await page.getByLabel('Is the price negotiable?').selectOption('no')
    await page.getByRole('button', { name: 'Review property and pricing' }).click()
    await page.getByRole('heading', { name: 'Check the property and pricing.' }).waitFor()
    const rentalReview = page.url()
    const text = await page.locator('dl[aria-label="Property pricing"]').textContent()
    check('rental review has monthly rate, no deposit and included maintenance', text.includes('₹25 / sq. ft per month') && text.includes('No deposit — ₹0') && text.includes('Included in monthly rent'))
    check('no runtime errors', errors.length === 0)
    if (javaScriptEnabled) {
      for (const width of [390, 412, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 })
        for (const [name, url] of [['sale-form', review.replace('step=pricing-review', 'step=pricing')], ['sale-review', review], ['rent-review', rentalReview], ['invalid', `${base}/post?${details}&saleprice=1.5&step=pricing-review`]]) {
          await page.goto(url)
          await page.evaluate(() => document.fonts.ready)
          check(`${name} fits ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
          await page.screenshot({ path: `/tmp/gharbazaar-pricing-shots/${name}-${width}.png`, fullPage: true })
        }
      }
    }
    await context.close()
  }
  console.log(`${passed} pricing checks passed`)
} finally { await browser.close() }
