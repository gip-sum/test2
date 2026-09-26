// Browser assertions for the home loan calculators (Phase 40A).
//
// Measures what a screenshot cannot: the numbers on screen are the right
// numbers; typing with Indian digit grouping updates the result and the
// URL without adding history entries; a reload and a shared link come back
// identical; invalid input is reported and never answered with a stale
// figure; the lender-limit warning and the budget's limiting factor say
// the right thing; the no-JavaScript form computes the same answer; the
// links into search and from a listing carry the right values; and the
// pages hold at every width.
//
// Usage: npm run build && npm run start, then npm run calculator-check
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
let passed = 0

async function check(label, condition, detail = '') {
  if (!condition) throw new Error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  passed++
  console.log(`ok ${label}`)
}

const errors = []
async function open(width = 390, height = 844, options = {}) {
  const phone = width < 768
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone, ...options })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  return page
}
const hero = (page) => page.locator('.calc-hero').first().innerText().then((t) => t.replace(/\s+/g, ' ').trim())
const rupees = (text) => Number(text.replace(/[^\d]/g, ''))
/** Waits out the URL sync's debounce, then reads path and query. */
const settledUrl = async (page) => { await page.waitForTimeout(450); const u = new URL(page.url()); return u.pathname + u.search }
const resultCount = async (page) => {
  const text = (await page.locator('h1 + p').first().innerText()).replace(/,/g, '')
  const match = text.match(/(\d+)\s+propert/)
  return match ? Number(match[1]) : /No properties/.test(text) ? 0 : null
}

try {
  // ── EMI: defaults, typing, the URL, reload ──────────────────────────
  const page = await open()
  await page.goto(`${base}/calculators/emi`)
  await page.getByRole('heading', { level: 1, name: 'Home loan EMI calculator' }).waitFor()
  await check('the defaults give the standard EMI: ₹40 lakh at 8.5% for 20 years', (await hero(page)) === '₹34,713 a month', await hero(page))

  const price = page.getByLabel('Property price')
  const down = page.getByLabel('Down payment')
  const historyBefore = await page.evaluate(() => history.length)
  await price.fill('62,50,000')
  await down.fill('12,50,000')
  await check('typing with Indian grouping recalculates at once: ₹50 lakh gives ₹43,391', (await hero(page)) === '₹43,391 a month', await hero(page))
  await check('the amount is echoed in lakh', (await page.locator('.calc-field').first().innerText()).includes('₹62.5 L'))
  await check('the URL follows, canonically, without a history entry per keystroke',
    (await settledUrl(page)) === '/calculators/emi?price=6250000&down=1250000' && (await page.evaluate(() => history.length)) === historyBefore)
  await page.reload()
  await check('a reload restores the same figures, grouped', (await price.inputValue()) === '62,50,000' && (await hero(page)) === '₹43,391 a month')

  const figures = await page.locator('.calc-figures dd').allInnerTexts()
  await check('loan, interest and total repaid add up', rupees(figures[0]) === 50_00_000 && rupees(figures[0]) + rupees(figures[1]) === rupees(figures[2]), figures.join(' | '))
  await page.locator('.calc-schedule summary').click()
  const rows = await page.locator('.calc-schedule tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => Number(td.textContent.replace(/[^\d]/g, '')))))
  await check('the yearly schedule has one row a year, principal adding to exactly the loan and ending at zero',
    rows.length === 20 && rows.reduce((s, r) => s + r[0], 0) === 50_00_000 && rows.reduce((s, r) => s + r[1], 0) === rupees(figures[1]) && rows.at(-1)[2] === 0)
  await check('the split is labelled in text, not colour alone', /Principal\s*₹50 L · \d+%/.test(await page.locator('figure').innerText()) && Boolean(await page.locator('figure [role="img"]').getAttribute('aria-label')))

  // ── Invalid input ─────────────────────────────────────────────────────
  await price.fill('62.5 lakh')
  await check('a price that is not a number is reported, with what to type', await page.getByText('Enter a whole number of rupees, for example 62,50,000').isVisible() && (await price.getAttribute('aria-invalid')) === 'true')
  await check('and no stale EMI is shown while it is wrong', (await page.locator('.calc-hero').count()) === 0 && await page.getByText(/Correct the highlighted figure/).first().isVisible())
  await check('the URL keeps the last valid calculation', (await settledUrl(page)) === '/calculators/emi?price=6250000&down=1250000')
  await price.fill('10,00,000')
  await check('a down payment at or above the price is an error', await page.getByText('The down payment must be less than the property price').isVisible())

  // ── The lender-limit warning ─────────────────────────────────────────
  await price.fill('20,00,000')
  await down.fill('1,00,000')
  await check('a loan above the RBI loan-to-value limit is flagged, with the minimum down payment',
    /at most 90% of a ₹20 L home \(₹18 L\).*at least ₹2,00,000/s.test(await page.locator('.calc-warning').innerText()))
  await down.fill('2,00,000')
  await check('and the warning goes once the down payment meets it', (await page.locator('.calc-warning').count()) === 0)

  // ── The pinned result on a phone ─────────────────────────────────────
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  const peek = page.locator('.calc-peek')
  await check('while the result is below the screen, it is pinned above the bottom bar',
    (await peek.getAttribute('data-hidden')) === null && (await peek.innerText()).includes('a month') &&
    await peek.evaluate((el) => el.getBoundingClientRect().bottom <= document.querySelector('nav.fixed[aria-label="Primary"]').getBoundingClientRect().top))
  await page.locator('#emi-result').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await check('and it steps aside once the result itself is on screen', (await peek.getAttribute('data-hidden')) !== null)

  // ── Into search ──────────────────────────────────────────────────────
  await page.getByRole('link', { name: /^See homes up to/ }).click()
  await page.waitForURL((url) => url.pathname === '/buy/kolkata')
  await check('"See homes up to" opens sale results capped at that price', new URL(page.url()).searchParams.get('pmax') === '2000000' && (await resultCount(page)) !== null)
  await page.context().close()

  // ── Without JavaScript ───────────────────────────────────────────────
  const noJs = await open(390, 844, { javaScriptEnabled: false })
  await noJs.goto(`${base}/calculators/emi?price=6250000&down=1250000`)
  await check('without JavaScript a shared link still shows its answer', (await hero(noJs)) === '₹43,391 a month')
  await noJs.getByLabel('Property price').fill('80,00,000')
  await noJs.getByRole('button', { name: 'Calculate EMI' }).click()
  await noJs.waitForURL((url) => url.searchParams.get('price') === '80,00,000')
  await check('and the form submits and computes the same way: ₹80 lakh less ₹12.5 lakh down gives ₹58,578', (await hero(noJs)) === '₹58,578 a month', await hero(noJs))
  await noJs.goto(`${base}/calculators/emi?price=abc&years=45`)
  await check('a bad shared link shows its errors, not a guess', (await noJs.locator('[aria-invalid="true"]').count()) === 2 && (await noJs.locator('.calc-hero').count()) === 0)
  await noJs.context().close()

  // ── Budget ───────────────────────────────────────────────────────────
  const budget = await open()
  await budget.goto(`${base}/calculators/budget`)
  await check('the default budget is ₹50 lakh, set by the down payment', (await hero(budget)) === 'up to ₹50 L' && (await budget.locator('.calc-reason').innerText()).includes('Your down payment.'))
  await budget.getByLabel('Savings for the down payment').fill('50,00,000')
  const reason = await budget.locator('.calc-reason').innerText()
  const parts = await budget.locator('.calc-figures dd').allInnerTexts()
  await check('with ample savings, repayments set it, and the parts add up',
    reason.includes('Your repayments.') && rupees(parts[0]) + rupees(parts[1]) === rupees(await budget.locator('.calc-hero + p').innerText()) && rupees(parts[2]) === 40_000, `${reason} | ${parts}`)
  await budget.getByLabel('Existing EMIs per month').fill('40,000')
  await check('existing EMIs that use the whole share leave no room for a loan, and it says so',
    (await budget.locator('.calc-reason').innerText()).includes('no room for a home-loan EMI') && (await hero(budget)) === 'up to ₹50 L')
  await budget.getByLabel('Existing EMIs per month').fill('1,00,000')
  await check('existing EMIs at or above income are an error', await budget.getByText('Existing EMIs must be less than your monthly income').isVisible())
  await budget.getByLabel('Existing EMIs per month').fill('10,000')
  const budgetText = await budget.locator('.calc-hero + p').innerText()
  await budget.getByRole('link', { name: /^See homes up to/ }).click()
  await budget.waitForURL((url) => url.pathname === '/buy/kolkata')
  await check('the budget opens sale results capped at exactly that budget', Number(new URL(budget.url()).searchParams.get('pmax')) === rupees(budgetText) && (await resultCount(budget)) !== null)
  await budget.context().close()

  // ── From a listing ───────────────────────────────────────────────────
  const listing = await open(1280, 900)
  await listing.goto(`${base}/buy/kolkata`)
  const first = await listing.locator('article h3 a[href^="/property/"]').first().getAttribute('href')
  await listing.goto(base + first)
  const listed = rupees(await listing.locator('header p.tabular').first().getAttribute('title') ?? '')
  await listing.getByRole('link', { name: 'Estimate the monthly EMI' }).click()
  await listing.waitForURL((url) => url.pathname === '/calculators/emi')
  const share = listed <= 30_00_000 ? 0.9 : listed <= 75_00_000 ? 0.8 : 0.75
  const prefilled = { price: rupees(await listing.getByLabel('Property price').inputValue()), down: rupees(await listing.getByLabel('Down payment').inputValue()) }
  await check('a listing opens the EMI calculator with its price and the smallest down payment lenders allow',
    listed > 0 && prefilled.price === listed && prefilled.down === listed - Math.floor(listed * share), `${listed} → ${JSON.stringify(prefilled)}`)
  await check('on a wide screen the result is a sticky column and the pinned bar is not shown',
    await listing.locator('.calc-result').evaluate((el) => getComputedStyle(el).position === 'sticky') &&
    await listing.locator('.calc-peek').evaluate((el) => getComputedStyle(el).display === 'none'))
  await listing.context().close()

  // ── Keyboard and the index ───────────────────────────────────────────
  const keys = await open(1280, 900)
  await keys.goto(`${base}/calculators`)
  const cards = await keys.locator('main ul a').evaluateAll((links) => links.map((l) => l.getAttribute('href')))
  await check('the index lists both calculators', JSON.stringify(cards) === JSON.stringify(['/calculators/budget', '/calculators/emi']))
  await keys.goto(`${base}/calculators/emi`)
  await keys.getByLabel('Property price').focus()
  await keys.keyboard.press('Tab')
  await check('Tab goes from field to field; the sliders are not extra stops',
    await keys.evaluate(() => document.activeElement === document.querySelectorAll('.calc-field input:not([type="range"])')[1]))
  await check('every slider stays out of the tab order and away from screen readers', await keys.locator('input[type="range"]').evaluateAll((rs) => rs.every((r) => r.tabIndex === -1 && r.getAttribute('aria-hidden') === 'true')))
  await keys.context().close()

  // ── Every width ──────────────────────────────────────────────────────
  for (const width of [390, 412, 768, 1280]) {
    const p = await open(width, 900)
    for (const path of ['/calculators', '/calculators/emi?price=125000000&down=25000000&years=30', '/calculators/budget?income=2500000&savings=90000000']) {
      await p.goto(base + path)
      if (path.includes('emi')) await p.locator('.calc-schedule summary').click()
      await check(`${width}px ${path.split('?')[0]}: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
    }
    await p.context().close()
  }

  await check('no script errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}

console.log(`${passed} passed, 0 failed`)
