import { chromium } from 'playwright-core'

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
let passed = 0

async function check(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`)
  passed++
  console.log(`ok ${label}`)
}

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(`${base}/post`)
  await check('starts with three seller roles', await page.getByRole('heading', { name: 'First, tell us about you.' }).isVisible() && await page.locator('main .post-choice').count() === 3)
  await check('mobile Home link stays visible', await page.getByRole('link', { name: 'Home', exact: true }).first().isVisible())
  await check('current progress is announced', await page.locator('nav[aria-label="Posting progress"] [aria-current="step"]').count() === 1)

  await page.getByRole('link', { name: /I own the property/ }).click()
  await check('owner selection appears in URL', new URL(page.url()).searchParams.get('role') === 'OWNER' && await page.getByRole('heading', { name: 'What would you like to do?' }).isVisible())
  await page.getByRole('link', { name: /Sell a property/ }).click()
  await check('sell selection appears in URL', new URL(page.url()).searchParams.get('intent') === 'buy' && await page.getByRole('heading', { name: 'What kind of place is it?' }).isVisible())
  await check('all supported property types are offered', await page.locator('main .post-choice').count() === 5)
  await page.locator('main .post-choice').filter({ hasText: 'Flat / Apartment' }).click()
  await check('selection review has all three answers', await page.getByRole('heading', { name: 'Your starting point is set.' }).isVisible() && await page.getByText('Owner', { exact: true }).isVisible() && await page.getByText('Flat / Apartment', { exact: true }).isVisible())
  await check('review says nothing was posted or saved', (await page.getByText(/no property has been posted/).count()) === 1)
  const review = page.url()
  await page.reload()
  await check('refresh keeps the review state', page.url() === review && await page.getByRole('heading', { name: 'Your starting point is set.' }).isVisible())
  await page.getByRole('link', { name: 'Change You are posting as' }).click()
  await check('editing role discards dependent choices', new URL(page.url()).search === '' && await page.getByRole('heading', { name: 'First, tell us about you.' }).isVisible())
  await page.goBack()
  await check('back restores review', await page.getByRole('heading', { name: 'Your starting point is set.' }).isVisible())

  await page.goto(`${base}/post?role=OWNER&intent=invalid&type=VILLA&unknown=123`)
  await check('invalid links discard unsafe answers and extras', new URL(page.url()).search === '?role=OWNER' && await page.getByRole('heading', { name: 'What would you like to do?' }).isVisible())
  await page.goto(`${base}/post?role=OWNER&role=AGENT&intent=buy`)
  await check('duplicate values do not select a role', new URL(page.url()).search === '' && await page.getByRole('heading', { name: 'First, tell us about you.' }).isVisible())

  for (const width of [390, 412, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(review)
    await check(`${width}px review has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
    await page.goto(`${base}/post?role=BUILDER&intent=rent`)
    await check(`${width}px choice cards have no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
  }
  await page.goto(`${base}/post`)
  await page.keyboard.press('Tab')
  await check('keyboard focus is visible', await page.evaluate(() => {
    const element = document.activeElement
    return element instanceof HTMLElement && getComputedStyle(element).outlineStyle !== 'none'
  }))

  const noJs = await browser.newPage({ javaScriptEnabled: false })
  await noJs.goto(`${base}/post`)
  await noJs.getByRole('link', { name: /I am an agent/ }).click()
  await noJs.getByRole('link', { name: /Rent out a property/ }).click()
  await noJs.locator('main .post-choice').filter({ hasText: 'Builder floor' }).click()
  await check('links work without JavaScript', new URL(noJs.url()).search === '?role=AGENT&intent=rent&type=BUILDER_FLOOR' && await noJs.getByRole('heading', { name: 'Your starting point is set.' }).isVisible())
  await noJs.close()
  await page.close()
} finally {
  await browser.close()
}

console.log(`${passed} passed, 0 failed`)
