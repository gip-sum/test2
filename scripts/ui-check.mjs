// UI-05 core components in the browser: the Kokonut-derived SmoothTabs
// (Buy / Rent), the 44px touch targets, and the migrated Buttons. UI-06:
// search without JavaScript, one responsive card per result, card focus. Reduced
// motion for the tabs is in motion-check. Every assertion reads geometry,
// hit-testing or ARIA state; nothing trusts a screenshot.
import { chromium } from 'playwright-core'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
let passed = 0
function check(label, ok, detail = '') { if (!ok) throw new Error(`FAIL ${label}: ${detail}`); passed++; console.log(`ok ${label}`) }
const errors = []
const WIDTHS = [320, 360, 375, 390, 412, 430, 768, 1280]

async function open(path, { width = 390, touch = false, js = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: touch, isMobile: touch, javaScriptEnabled: js })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base + path, { waitUntil: 'load' })
  return page
}
const settled = (locator) => locator.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished)))

// Opens the home search sheet and returns its Buy / Rent tab list, at rest.
async function intentTabs(page) {
  await page.locator('.reference-search-trigger').click()
  const dialog = page.getByRole('dialog', { name: 'Find your home' })
  await dialog.waitFor()
  await settled(dialog)
  const list = dialog.getByRole('tablist', { name: 'Search intent' })
  await page.waitForFunction(() => document.querySelector('[role=tablist][data-indicator]'))
  return list
}
// Where the indicator is, relative to the tabs: which tab it covers, and
// whether its pill and the clipped label layer agree with that tab exactly.
const indicator = (list) => list.evaluate((el) => {
  const box = el.getBoundingClientRect()
  const tabs = [...el.querySelectorAll('[role=tab]')].map((t) => t.getBoundingClientRect())
  const pill = el.querySelector('span[aria-hidden]').getBoundingClientRect()
  const clip = getComputedStyle(el.querySelector('div[aria-hidden]')).clipPath
  const covered = tabs.findIndex((t) => Math.abs(t.left - pill.left) < 1 && Math.abs(t.width - pill.width) < 1 && Math.abs(t.top - pill.top) < 1 && Math.abs(t.height - pill.height) < 1)
  const inset = /inset\(([\d.]+)px ([\d.]+)px ([\d.]+)px ([\d.]+)px/.exec(clip)?.slice(1).map(Number)
  const clipMatches = inset && covered >= 0 && Math.abs(inset[3] - (tabs[covered].left - box.left)) < 1 && Math.abs(box.width - inset[1] - inset[3] - tabs[covered].width) < 1
  const inside = pill.left >= box.left - 0.5 && pill.right <= box.right + 0.5 && pill.top >= box.top - 0.5 && pill.bottom <= box.bottom + 0.5
  return { covered, clipMatches: !!clipMatches, inside, selected: [...el.querySelectorAll('[role=tab]')].findIndex((t) => t.getAttribute('aria-selected') === 'true') }
})

// A control is a real 44×44 target: its box is at least 44px each way and a
// tap anywhere in a 44px square around its centre lands on it.
const target = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2
  const points = [[cx - 20, cy - 20], [cx + 20, cy - 20], [cx - 20, cy + 20], [cx + 20, cy + 20], [cx, cy]]
  const hits = points.filter(([x, y]) => { const hit = document.elementFromPoint(x, y); return hit === el || el.contains(hit) }).length
  return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, hits, total: points.length }
})
const isTarget = (t) => t.w >= 43.5 && t.h >= 43.5 && t.hits === t.total

try {
  // ── Tabs: fit, indicator and state at every width ─────────────────────
  for (const width of WIDTHS) {
    const page = await open('/', { width })
    const list = await intentTabs(page)
    const tabs = list.getByRole('tab')
    check(`${width}: two tabs, Buy selected, roving tabindex`, await tabs.count() === 2 &&
      await tabs.nth(0).getAttribute('aria-selected') === 'true' && await tabs.nth(0).getAttribute('tabindex') === '0' && await tabs.nth(1).getAttribute('tabindex') === '-1')
    const sizes = await tabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    check(`${width}: tabs are 44px tall`, sizes.every((h) => h >= 43.5), JSON.stringify(sizes))
    const at = await indicator(list)
    check(`${width}: indicator sits exactly on the selected tab, label layer clipped to it`, at.covered === at.selected && at.selected === 0 && at.clipMatches, JSON.stringify(at))
    check(`${width}: indicator is not clipped by the tab list`, at.inside, JSON.stringify(at))
    check(`${width}: tab list inside the viewport, no horizontal overflow`, await list.evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5 }) &&
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.context().close()
  }

  // ── Tabs: keyboard ────────────────────────────────────────────────────
  for (const width of [390, 1280]) {
    const page = await open('/', { width })
    const list = await intentTabs(page)
    const tab = (name) => list.getByRole('tab', { name, exact: true })
    const state = () => list.evaluate((el) => [...el.querySelectorAll('[role=tab]')].map((t) => `${t.textContent}:${t.getAttribute('aria-selected')}:${t.tabIndex}:${t === document.activeElement}`).join(' '))
    await tab('Buy').focus()
    await page.keyboard.press('ArrowRight')
    check(`${width}: ArrowRight moves focus and selection to Rent`, await state() === 'Buy:false:-1:false Rent:true:0:true', await state())
    await settled(list)
    const at = await indicator(list)
    check(`${width}: the indicator follows to Rent`, at.covered === 1 && at.clipMatches, JSON.stringify(at))
    await page.keyboard.press('ArrowRight')
    check(`${width}: ArrowRight wraps from the last tab to the first`, await state() === 'Buy:true:0:true Rent:false:-1:false', await state())
    await page.keyboard.press('End')
    check(`${width}: End selects the last tab`, await state() === 'Buy:false:-1:false Rent:true:0:true', await state())
    await page.keyboard.press('Home')
    check(`${width}: Home selects the first tab`, await state() === 'Buy:true:0:true Rent:false:-1:false', await state())
    await page.keyboard.press('ArrowLeft')
    check(`${width}: ArrowLeft wraps backwards`, await state() === 'Buy:false:-1:false Rent:true:0:true', await state())
    await page.keyboard.press('Tab')
    check(`${width}: Tab leaves the tab list in one stop`, await page.evaluate(() => document.activeElement?.getAttribute('role') !== 'tab'))
    check(`${width}: switching to Rent changes the form to rent`, await page.getByRole('dialog', { name: 'Find your home' }).getByRole('button', { name: /^Search properties for rent/ }).count() === 1)
    await page.context().close()
  }

  // ── Tabs: touch ───────────────────────────────────────────────────────
  {
    const page = await open('/', { width: 390, touch: true })
    const list = await intentTabs(page)
    await list.getByRole('tab', { name: 'Rent', exact: true }).tap()
    await settled(list)
    const at = await indicator(list)
    check('touch: a tap selects Rent and the indicator moves there', at.selected === 1 && at.covered === 1, JSON.stringify(at))
    check('touch: the tab left behind keeps no hover background', await list.getByRole('tab', { name: 'Buy', exact: true }).evaluate((el) => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)'))
    check('touch: the indicator glides after a user change (transform, width, clip-path)', await list.evaluate((el) => getComputedStyle(el.querySelector('span[aria-hidden]')).transitionProperty.includes('transform')))
    await page.context().close()
  }

  // ── Touch targets ─────────────────────────────────────────────────────
  for (const width of [320, 390]) {
    const page = await open('/buy/kolkata?bhk=2,3&type=APARTMENT', { width, touch: true })
    // Links on the results page (UI-06): removing a filter is navigation.
    const removes = page.getByRole('link', { name: /^Remove filter:/ })
    await removes.first().waitFor()
    const chips = await removes.evaluateAll((els) => els.length)
    for (let i = 0; i < chips; i++) {
      const t = await target(removes.nth(i))
      check(`${width}: filter-chip remove button ${i + 1} is a 44px target`, isTarget(t), JSON.stringify(t))
    }
    check(`${width}: chips themselves stay 32px tall`, (await removes.evaluateAll((els) => els.map((e) => e.parentElement.getBoundingClientRect().height))).every((h) => Math.abs(h - 32) < 0.5))
    // A link beside the chips (UI-06: it navigates to the unfiltered URL).
    const clear = page.getByRole('link', { name: 'Clear all', exact: true }).first()
    const ct = await target(clear)
    check(`${width}: Clear all is a 44px-tall target`, ct.h >= 43.5 && ct.hits >= 3, JSON.stringify(ct))
    await page.getByRole('button', { name: /^Filters/ }).first().click()
    const sheet = page.locator('[data-sheet]')
    await sheet.waitFor(); await settled(sheet)
    const sheetClear = sheet.getByRole('button', { name: 'Clear all', exact: true })
    check(`${width}: the filter sheet's Clear all is 44px tall`, (await sheetClear.boundingBox()).height >= 43.5)
    check(`${width}: the sheet's Show button (a shared Button) is 44px tall`, (await sheet.getByRole('button', { name: /^Show / }).boundingBox()).height >= 43.5)
    await page.context().close()
  }
  {
    const page = await open('/', { width: 390, touch: true })
    await page.locator('.reference-search-trigger').click()
    const parent = page.getByRole('dialog', { name: 'Find your home' })
    await parent.waitFor()
    await parent.getByRole('button', { name: 'Search a locality in Kolkata' }).click()
    const picker = page.getByRole('dialog', { name: 'Where are you looking?' })
    await picker.getByRole('textbox', { name: 'Search localities' }).fill('Salt')
    await picker.getByRole('option', { name: /Salt Lake/ }).first().click()
    await settled(picker)
    const t = await target(picker.getByRole('button', { name: /^Remove Salt Lake/ }))
    check('390: locality chip remove button is a 44px target', isTarget(t), JSON.stringify(t))
    check('390: the migrated Done button is 48px tall', (await picker.getByRole('button', { name: /^Done/ }).boundingBox()).height >= 47.5)
    await page.context().close()
  }
  for (const width of [320, 390]) {
    const page = await open('/calculators/emi', { width, touch: true })
    const input = page.getByRole('textbox').first()
    const box = await input.boundingBox()
    check(`${width}: calculator input fills its 48px field (a 44px+ target)`, box.height >= 44, JSON.stringify(box))
    const slider = await page.locator('.calc-slider').first().boundingBox()
    check(`${width}: calculator slider is a 44px-tall target`, slider.height >= 43.5, JSON.stringify(slider))
    await page.context().close()
  }
  {
    const page = await open('/calculators/emi', { width: 390, js: false })
    check('no JavaScript: the migrated Calculate EMI button is 48px tall', (await page.getByRole('button', { name: 'Calculate EMI' }).boundingBox()).height >= 47.5)
    await page.context().close()
  }
  {
    const html = await (await fetch(base + '/buy/kolkata')).text()
    const property = html.match(/href="(\/property\/[^"]+)"/)[1]
    for (const [label, path] of [['calculators', '/calculators'], ['property', property]]) {
      for (const width of [320, 390]) {
        const page = await open(path, { width, touch: true })
        const links = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link')
        const rects = await links.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height } }))
        check(`${width} ${label}: breadcrumb links are 44px tall`, rects.length > 0 && rects.every((r) => r.h >= 43.5), JSON.stringify(rects))
        const overlap = rects.some((a, i) => rects.some((b, j) => j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom))
        check(`${width} ${label}: no two breadcrumb targets overlap`, !overlap, JSON.stringify(rects))
        await page.context().close()
      }
    }
  }

  // ── Search without JavaScript (UI-06) ────────────────────────────────
  {
    const page = await open('/buy/kolkata?bhk=2,3', { width: 390, js: false })
    check('no JavaScript: the search page shows its heading and results, not the skeleton', await page.locator('h1').first().isVisible() &&
      !(await page.locator('[data-search-fallback]').isVisible()) && await page.locator('article.property-card:visible').count() > 0)
    const before = await page.locator('article.property-card:visible').count()
    await page.getByRole('link', { name: 'Remove filter: 3 BHK' }).click()
    await page.waitForLoadState('load')
    check('no JavaScript: removing a filter chip navigates to the URL without it', new URL(page.url()).search === '?bhk=2' && await page.locator('article.property-card:visible').count() !== before, page.url())
    await page.locator('select[aria-label="Sort results"]').selectOption('price_asc')
    await page.getByRole('button', { name: 'Sort', exact: true }).click()
    await page.waitForLoadState('load')
    check('no JavaScript: Sort submits the current search with the new order', new URL(page.url()).search === '?bhk=2&sort=price_asc' && await page.locator('select[aria-label="Sort results"]').inputValue() === 'price_asc', page.url())
    await page.goto(base + '/buy/kolkata', { waitUntil: 'load' })
    await page.getByRole('navigation', { name: 'Pagination' }).getByRole('link').last().click()
    await page.waitForLoadState('load')
    check('no JavaScript: pagination links work', new URL(page.url()).searchParams.get('page') === '2' && await page.locator('article.property-card:visible').count() > 0, page.url())
    await page.context().close()
  }
  {
    const page = await open('/buy/kolkata', { width: 390 })
    check('with JavaScript the Sort button does not exist (the select applies on change)', await page.getByRole('button', { name: 'Sort', exact: true }).count() === 0)
    await page.context().close()
  }

  // ── Results: one card per listing, responsive (UI-06) ──────────────────
  for (const width of WIDTHS) {
    const page = await open('/buy/kolkata', { width })
    await page.waitForFunction(() => document.querySelector('article.property-card')?.getBoundingClientRect().width > 0)
    const cards = await page.locator('article.property-card').evaluateAll((els) => ({
      all: els.length,
      visible: els.filter((e) => e.getBoundingClientRect().width > 0).length,
      unique: new Set(els.map((e) => e.querySelector('h3 a').getAttribute('href'))).size,
      direction: [...new Set(els.map((e) => getComputedStyle(e).flexDirection))],
    }))
    check(`${width}: every result is rendered once, and visible`, cards.all === cards.unique && cards.all === cards.visible, JSON.stringify(cards))
    check(`${width}: the card is ${width < 768 ? 'horizontal' : 'vertical'}`, cards.direction.length === 1 && cards.direction[0] === (width < 768 ? 'row' : 'column'), JSON.stringify(cards))
    const save = await target(page.locator('article.property-card').first().getByRole('button'))
    check(`${width}: the card's save heart is a 44px target`, isTarget(save), JSON.stringify(save))
    check(`${width}: no horizontal overflow on the results page`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.context().close()
  }
  {
    const page = await open('/buy/kolkata', { width: 1280 })
    const card = page.locator('article.property-card').first()
    const ring = () => card.evaluate((el) => getComputedStyle(el).outlineStyle)
    // After hydration (which would move focus), and a key press first so the
    // programmatic focus counts as keyboard focus.
    await page.waitForFunction(() => document.querySelector('[data-enter]'))
    await page.keyboard.press('Shift')
    await card.locator('h3 a').focus()
    check('the card draws its focus ring when its link has keyboard focus', await ring() === 'solid', await ring())
    await page.keyboard.press('Tab')
    check('…and focus moves to its save heart next, which lights only itself', await card.getByRole('button').evaluate((el) => el === document.activeElement) && await ring() === 'none', await ring())
    await page.context().close()
  }

  check('no page errors', errors.length === 0, errors.join('\n'))
  console.log(`\n${passed} UI checks passed`)
} finally {
  await browser.close()
}
