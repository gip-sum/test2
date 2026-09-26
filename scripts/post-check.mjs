import { chromium } from 'playwright-core'

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
let passed = 0

async function check(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`)
  passed++
  console.log(`ok ${label}`)
}

const DETAILS = 'Tell us about the property.'
const REVIEW = 'Check the property details.'
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
const params = (page) => new URL(page.url()).searchParams

/** Kolkata calendar date, offset by whole days — matches the server's `today`. */
function kolkataDate(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

async function chip(page, legend, label) {
  // Click the visible chip, as a person would; the radio inside is visually hidden.
  await page.getByRole('group', { name: legend }).locator('label.post-chip').filter({ has: page.getByRole('radio', { name: label, exact: true }) }).click()
}

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  // ── Phase 11 entry ───────────────────────────────────────────────────
  await page.goto(`${base}/post`)
  await check('starts with three seller roles', await page.getByRole('heading', { name: 'First, tell us about you.' }).isVisible() && await page.locator('main .post-choice').count() === 3)
  // No bottom bar here, so the header is the way out: the logo goes home
  // and the menu reaches everything else.
  await check('mobile way out stays visible: the home logo and the menu',
    await page.locator('header').getByRole('link', { name: /home$/ }).isVisible() && await page.locator('header').getByRole('button', { name: 'Menu' }).isVisible())
  await check('current progress is announced', await page.locator('nav[aria-label="Posting progress"] [aria-current="step"]').count() === 1)
  await check('progress shows five stages', await page.locator('nav[aria-label="Posting progress"] li').count() === 5)

  await page.getByRole('link', { name: /I own the property/ }).click()
  await page.getByRole('heading', { name: 'What would you like to do?' }).waitFor()
  await check('owner selection appears in URL', params(page).get('role') === 'OWNER')
  await page.getByRole('link', { name: /Sell a property/ }).click()
  await page.getByRole('heading', { name: 'What kind of place is it?' }).waitFor()
  await check('sell selection appears in URL', params(page).get('intent') === 'buy')
  await check('all supported property types are offered', await page.locator('main .post-choice').count() === 5)
  await page.locator('main .post-choice').filter({ hasText: 'Flat / Apartment' }).click()

  // ── Phase 12 details form ────────────────────────────────────────────
  await page.getByRole('heading', { name: DETAILS }).waitFor()
  await check('choosing a type opens an empty details form', new URL(page.url()).search === '?role=OWNER&intent=buy&type=APARTMENT' && await page.locator('.post-error-summary').count() === 0)
  await check('a flat is asked for BHK and its floor', await page.getByRole('group', { name: 'Bedrooms (BHK)' }).isVisible() && await page.getByLabel('Which floor is it on?').isVisible())
  await check('follow-ups stay hidden until status is chosen', !(await page.getByLabel('Age of the property, in years').isVisible()) && !(await page.getByLabel('Expected possession').isVisible()))

  await page.getByRole('button', { name: 'Continue to review' }).click()
  await page.locator('.post-error-summary').waitFor()
  await check('an empty submission stays on the form with a summary', await page.getByRole('heading', { name: 'There is a problem' }).isVisible() && await page.getByRole('heading', { name: DETAILS }).isVisible())
  await check('the error summary takes focus', await page.evaluate(() => document.activeElement?.classList.contains('post-error-summary') === true))
  await check('every required answer is reported', await page.locator('.post-error-summary li').count() === 7)
  await check('invalid text inputs are marked and described', await page.getByLabel('Carpet area').getAttribute('aria-invalid') === 'true' && (await page.getByLabel('Carpet area').getAttribute('aria-describedby')).includes('carpet-error'))
  await page.locator('.post-error-summary a', { hasText: 'carpet area' }).click()
  await check('summary links move focus to the field', await page.evaluate(() => document.activeElement?.id === 'field-carpet'))

  await chip(page, 'Bedrooms (BHK)', '3')
  await page.getByRole('group', { name: 'Bathrooms' }).locator('input[value="1"]').focus()
  await page.keyboard.press('ArrowRight')
  await check('arrow keys move between radio chips', await page.getByRole('group', { name: 'Bathrooms' }).locator('input[value="2"]').isChecked())
  await check('a focused chip shows a focus ring', await page.getByRole('group', { name: 'Bathrooms' }).locator('label.post-chip').nth(1).evaluate((el) => getComputedStyle(el).outlineStyle !== 'none'))
  await page.getByLabel('Carpet area').fill('1,240')
  await page.getByLabel('Super built-up area').fill('1,100')
  await chip(page, 'How is it furnished?', 'Semi-furnished')
  await page.getByLabel('Which floor is it on?').fill('12')
  await page.getByLabel('Total floors in the building').fill('12')
  await chip(page, 'Is it ready to move in?', 'Ready to move')
  await check('choosing ready reveals age only', await page.getByLabel('Age of the property, in years').isVisible() && !(await page.getByLabel('Expected possession').isVisible()))
  await page.getByLabel('Age of the property, in years').fill('6')
  await page.getByRole('button', { name: 'Continue to review' }).click()
  await page.locator('.post-error-summary').waitFor()
  await check('typed values survive a failed submission', await page.getByLabel('Carpet area').inputValue() === '1,240' && await page.getByRole('group', { name: 'Bedrooms (BHK)' }).locator('input[value="3"]').isChecked())
  await check('area bases out of order are rejected on the larger basis', await page.locator('#super-error').isVisible() && await page.locator('.post-error-summary li').count() === 2)
  await check('a floor above the top floor is rejected', (await page.locator('#floor-error').textContent()).includes('floors 0 to 11'))

  await page.getByLabel('Super built-up area').fill('1,650')
  await page.getByLabel('Which floor is it on?').fill('4')
  await page.getByRole('button', { name: 'Continue to review' }).click()
  await page.getByRole('heading', { name: REVIEW }).waitFor()
  const review = page.url()
  await check('a valid submission lands on a canonical review link', new URL(review).search === '?role=OWNER&intent=buy&type=APARTMENT&bhk=3&baths=2&unit=sqft&carpet=1240&super=1650&furnishing=SEMI_FURNISHED&floor=4&floors=12&status=READY&age=6')
  await check('review states every fact with its area basis', await page.getByText('3 BHK · 2 Baths').isVisible() && await page.getByText('1,240 sqft carpet').isVisible() && await page.getByText('1,650 sqft super built-up').isVisible() && await page.getByText('Floor 4 of 12 floors').isVisible() && await page.getByText('6 years old').isVisible())
  await check('an unstated basis says so', await page.getByText('Not stated').count() === 1)
  await check('review says nothing was posted or saved', (await page.getByText(/no property has been posted/).count()) === 1)
  await page.reload()
  await check('refresh keeps the review', page.url() === review && await page.getByRole('heading', { name: REVIEW }).isVisible())

  await page.getByRole('link', { name: 'Change Carpet area' }).click()
  await page.getByRole('heading', { name: DETAILS }).waitFor()
  await check('changing a fact returns to a filled form without errors', params(page).get('edit') === '1' && await page.getByLabel('Carpet area').inputValue() === '1240' && await page.locator('.post-error-summary').count() === 0)
  await page.goBack()
  await page.getByRole('heading', { name: REVIEW }).waitFor()
  await check('back restores the review', page.url() === review)

  await page.getByRole('link', { name: 'Change Property type' }).click()
  await page.getByRole('heading', { name: 'What kind of place is it?' }).waitFor()
  await page.locator('main .post-choice').filter({ hasText: 'Villa' }).click()
  await page.getByRole('heading', { name: DETAILS }).waitFor()
  await check('changing type to villa keeps areas and drops the unit floor', params(page).get('type') === 'VILLA' && !params(page).has('floor') && await page.getByLabel('Carpet area').inputValue() === '1240' && await page.getByLabel('Which floor is it on?').count() === 0 && await page.getByLabel('Floors in the house').isVisible())
  await page.getByLabel('Floors in the house').fill('2')
  await page.getByRole('button', { name: 'Continue to review' }).click()
  await page.getByRole('heading', { name: REVIEW }).waitFor()
  await check('villa review shows storeys, not a floor', await page.getByText('2 floors in the house').isVisible())

  // ── Rent: availability dates ─────────────────────────────────────────
  const rentBase = `${base}/post?role=AGENT&intent=rent&type=STUDIO`
  await page.goto(rentBase)
  await check('a studio has no BHK question and a rental no construction question', await page.getByRole('group', { name: 'Bedrooms (BHK)' }).count() === 0 && await page.getByRole('group', { name: 'Is it ready to move in?' }).count() === 0)
  await page.goto(`${rentBase}&baths=1&unit=sqft&carpet=420&furnishing=FURNISHED&floor=2&floors=5&age=3&available=date&from=${kolkataDate(-2)}`)
  await check('a past available-from date is rejected', (await page.locator('#from-error').textContent()).includes('has passed') && await page.getByLabel('Available from').isVisible())
  await page.getByLabel('Available from').fill(kolkataDate(10))
  await page.getByRole('button', { name: 'Continue to review' }).click()
  await page.getByRole('heading', { name: REVIEW }).waitFor()
  await check('a studio review never claims a BHK', await page.getByText('Studio · 1 Bath').isVisible() && await page.getByText(/^Available from /).isVisible())

  // ── Hostile and malformed links ──────────────────────────────────────
  await page.goto(`${base}/post?role=OWNER&intent=invalid&type=VILLA&unknown=123`)
  await check('invalid entry links discard unsafe answers and extras', new URL(page.url()).search === '?role=OWNER' && await page.getByRole('heading', { name: 'What would you like to do?' }).isVisible())
  await page.goto(`${base}/post?role=OWNER&role=AGENT&intent=buy`)
  await check('duplicate values do not select a role', new URL(page.url()).search === '' && await page.getByRole('heading', { name: 'First, tell us about you.' }).isVisible())
  await page.goto(`${base}/post?role=OWNER&intent=buy&type=APARTMENT&carpet=%3Cscript%3Ealert(1)%3C%2Fscript%3E&bhk=2&bhk=3&junk=1`)
  await check('script-like input is reported, never executed, and extras are dropped', !params(page).has('junk') && !params(page).has('bhk') && await page.getByLabel('Carpet area').inputValue() === '<script>alert(1)</script>' && await page.locator('#carpet-error').isVisible())

  // ── Widths ───────────────────────────────────────────────────────────
  const failed = `${base}/post?role=OWNER&intent=buy&type=APARTMENT&carpet=`
  for (const width of [390, 412, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [name, url] of [['review', review], ['entry choices', `${base}/post?role=BUILDER&intent=rent`], ['empty form', `${base}/post?role=OWNER&intent=buy&type=APARTMENT`], ['failed form', failed]]) {
      await page.goto(url)
      await check(`${width}px ${name} has no horizontal overflow`, await noOverflow(page))
    }
    const button = await page.getByRole('button', { name: 'Continue to review' }).boundingBox()
    await check(`${width}px submit button is at least 44px tall`, button && button.height >= 44)
  }
  await page.goto(`${base}/post`)
  await page.keyboard.press('Tab')
  await check('keyboard focus is visible', await page.evaluate(() => {
    const element = document.activeElement
    return element instanceof HTMLElement && getComputedStyle(element).outlineStyle !== 'none'
  }))

  // ── Without JavaScript, start to finish ──────────────────────────────
  const noJs = await browser.newPage({ javaScriptEnabled: false })
  await noJs.goto(`${base}/post`)
  await noJs.getByRole('link', { name: /I am an agent/ }).click()
  await noJs.getByRole('heading', { name: 'What would you like to do?' }).waitFor()
  await noJs.getByRole('link', { name: /Sell a property/ }).click()
  await noJs.getByRole('heading', { name: 'What kind of place is it?' }).waitFor()
  await noJs.locator('main .post-choice').filter({ hasText: 'Builder floor' }).click()
  await noJs.getByRole('heading', { name: DETAILS }).waitFor()
  await chip(noJs, 'Bedrooms (BHK)', '2')
  await chip(noJs, 'Bathrooms', '2')
  await noJs.getByLabel('Carpet area').fill('900')
  await chip(noJs, 'How is it furnished?', 'Unfurnished')
  await noJs.getByLabel('Which floor is it on?').fill('0')
  await noJs.getByLabel('Total floors in the building').fill('4')
  await chip(noJs, 'Is it ready to move in?', 'Under construction')
  await check('without JavaScript the CSS reveals the possession question', await noJs.getByLabel('Expected possession').isVisible() && !(await noJs.getByLabel('Age of the property, in years').isVisible()))
  await noJs.getByLabel('Expected possession').fill(kolkataDate(400).slice(0, 7))
  await noJs.getByRole('button', { name: 'Continue to review' }).click()
  await noJs.getByRole('heading', { name: REVIEW }).waitFor()
  await check('the whole flow works without JavaScript', params(noJs).get('type') === 'BUILDER_FLOOR' && await noJs.getByText('Ground floor of 4 floors').isVisible() && await noJs.getByText(/possession by/).isVisible())
  await noJs.close()
  await page.close()
} finally {
  await browser.close()
}

console.log(`${passed} passed, 0 failed`)
