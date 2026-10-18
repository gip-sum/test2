// Browser assertions for the homepage (app/page.tsx).
//
// Measures what a screenshot can only suggest: that the whole search — the
// hero's inline panel since UI-14 — sits on a phone's first screen, clear of
// the header and the bottom bar; that
// More filters and the locality picker build the right results URL; that
// the listing rails swipe and snap with the next card in view; that the
// header and bottom bar stay opaque and on top while the page scrolls under
// them; that every count on a tile is the count its results page shows; that
// every link on the page resolves; and that sample data stays labelled and
// nothing is claimed that the product cannot back.
//
// Usage: npm run build && npm run start, then npm run home-check
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
const foreign = []
async function open(width, height, { phone = width < 768 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(base) && !url.startsWith('data:') && !url.startsWith('blob:')) foreign.push(url)
  })
  return page
}
async function home(page, path = '/') {
  await page.goto(base + path, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  // The save hearts settle once the saved-state request answers.
  await page.waitForFunction(() => !document.querySelector('button[aria-label="Checking saved status"]'))
  // The hero search is server-rendered, so its buttons exist before React
  // owns them; the tabs mark their measured indicator after hydration.
  await page.waitForFunction(() => document.querySelector('form[aria-label="Search properties"] [role=tablist][data-indicator]'))
}
/** The results count the way search-check reads it: "59 properties" under the h1. */
const resultCount = async (page) => {
  const text = (await page.locator('h1 + p').first().innerText()).replace(/,/g, '')
  const match = text.match(/(\d+)\s+propert/)
  return match ? Number(match[1]) : /No properties/.test(text) ? 0 : null
}
const focusRing = (page) => page.evaluate(() => {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return null
  const style = getComputedStyle(el)
  return { text: el.textContent?.trim() ?? '', label: el.getAttribute('aria-label') ?? '', visible: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2 }
})

try {
  // ── The first screen, on phones of four sizes ───────────────────────
  // 390×664 is a 390px phone with its browser toolbars showing, which is
  // how most visits actually see the page; 360×640 is a small Android.
  for (const [width, height, name] of [[390, 844, '390×844'], [412, 915, '412×915'], [390, 664, '390×664 (toolbars showing)'], [360, 640, '360×640']]) {
    const page = await open(width, height)
    await home(page)
    const m = await page.evaluate(() => {
      const box = (el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), height: Math.round(r.height) }
      }
      const form = document.querySelector('form[aria-label="Search properties"]')
      return {
        header: box(document.querySelector('header')),
        bar: box(document.querySelector('nav.fixed[aria-label="Primary"]')),
        // The whole search, inline in the hero (UI-14): intent, place, More
        // filters and the Search action. It used to be one launcher button.
        controls: {
          'Buy / Rent tabs': box(form.querySelector('[role=tablist]')),
          'locality field': box([...form.querySelectorAll('button')].find((b) => /Search a locality/.test(b.textContent))),
          'More filters': box([...form.querySelectorAll('button')].find((b) => /^More filters/.test(b.textContent.trim()))),
          'Search button': box(form.querySelector('button[type="submit"]')),
        },
        headline: box(document.querySelector('#home-title')),
        firstRailHeading: box(document.querySelector('#rail-new-sale')),
        firstCard: box(document.querySelector('.home-rail article')),
      }
    })
    await check(`${name}: the headline is on the first screen`, m.headline && m.headline.top >= m.header.bottom && m.headline.bottom <= m.bar.top)
    for (const [control, box] of Object.entries(m.controls)) {
      await check(`${name}: ${control} is on the first screen, clear of the header and the bottom bar`,
        box && box.top >= m.header.bottom && box.bottom <= m.bar.top && box.left >= 0 && box.right <= width && box.height >= 40, JSON.stringify(box))
    }
    // The owner's UI-14 review shortened the phone hero so the first
    // listings section reaches the first screen: its heading is there on a
    // 390×844 phone, and on a taller one the first card begins there too.
    if (height >= 844) {
      await check(`${name}: the first listings section's heading is on the first screen`, m.firstRailHeading && m.firstRailHeading.bottom <= m.bar.top, `heading ends at ${m.firstRailHeading?.bottom}px, bar at ${m.bar.top}px`)
    }
    if (height >= 915) {
      await check(`${name}: the first listings begin on the first screen`, m.firstCard && m.firstCard.top < m.bar.top, `first card at ${m.firstCard?.top}px, bar at ${m.bar.top}px`)
    }
    await check(`${name}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
    await page.context().close()
  }

  const page = await open(390, 844)
  await home(page)
  const form = page.getByRole('form', { name: 'Search properties' })

  // ── The header and bottom bar are opaque, and on top, while scrolling ─
  await page.evaluate(() => window.scrollTo(0, 1200))
  await page.waitForTimeout(150)
  const chrome = await page.evaluate(() => ['header.app-bar', 'nav.fixed[aria-label="Primary"]'].map((selector) => {
    const el = document.querySelector(selector)
    const style = getComputedStyle(el)
    let opacity = 1
    for (let n = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity)
    const r = el.getBoundingClientRect()
    return { selector, background: style.backgroundColor, backdrop: style.backdropFilter, opacity, top: r.top, bottom: r.bottom }
  }))
  for (const bar of chrome) {
    const name = bar.selector === 'header.app-bar' ? 'the header' : 'the bottom bar'
    await check(`${name} paints a solid background over the scrolled page`, /^rgb\(\d+, \d+, \d+\)$/.test(bar.background) && (bar.backdrop === 'none' || bar.backdrop === '') && bar.opacity === 1, JSON.stringify(bar))
  }
  await check('the header stays pinned to the top after scrolling', chrome[0].top === 0)
  await check('the bottom bar stays pinned to the bottom after scrolling', Math.round(chrome[1].bottom) === 844)
  // A save heart carries its own z-index; slide one under each bar and make
  // sure the bar, not the heart, is what a tap at that point reaches. The
  // rent rail's heart is used for the bottom bar: the first rail's sits too
  // near the top of the page to be scrolled down underneath it.
  for (const where of ['header', 'bar']) {
    const covered = await page.evaluate((where) => {
      const heart = document.querySelectorAll('.home-rail')[where === 'header' ? 0 : 1].querySelector('article button[aria-label^="Save"]')
      const header = document.querySelector('header.app-bar').getBoundingClientRect()
      const bar = document.querySelector('nav.fixed[aria-label="Primary"]')
      const target = where === 'header' ? header.top + header.height / 2 : bar.getBoundingClientRect().top + 20
      const r = heart.getBoundingClientRect()
      window.scrollBy(0, r.top + r.height / 2 - target)
      const now = heart.getBoundingClientRect()
      const hit = document.elementFromPoint(now.left + now.width / 2, now.top + now.height / 2)
      return where === 'header' ? Boolean(hit?.closest('header.app-bar')) : Boolean(hit?.closest('nav.fixed'))
    }, where)
    await check(`a save button scrolled under the ${where === 'header' ? 'header' : 'bottom bar'} stays underneath it`, covered)
  }

  // ── More filters: a sheet, echoed as chips, then the results URL ─────
  await home(page)
  const more = form.getByRole('button', { name: /^More filters/ })
  await check('More filters announces that it opens a dialog', (await more.getAttribute('aria-haspopup')) === 'dialog')
  await more.click()
  let sheet = page.getByRole('dialog', { name: 'More filters' })
  await sheet.waitFor()
  // The sheet rises 24px into place (UI-04 motion layer); measure where it
  // rests, not a frame of its entrance.
  await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
  const sheetBox = await sheet.boundingBox()
  await check('on a phone the filters open full screen', sheetBox.width === 390 && sheetBox.height === 844, JSON.stringify(sheetBox))
  const legends = await sheet.locator('legend').allInnerTexts()
  await check('the sheet offers property type, budget and bedrooms', legends.join('|') === 'Property type|Budget|Bedrooms', legends.join('|'))
  for (const option of ['Flat / Apartment', '₹50 L – ₹75 L', '2 BHK', '3 BHK']) await sheet.getByRole('button', { name: option, exact: true }).click()
  await check('chosen options are pressed', (await sheet.locator('button[aria-pressed="true"]').count()) === 4)
  await sheet.getByRole('button', { name: '₹75 L – ₹1 Cr', exact: true }).click()
  await check('budget is a single choice: picking another band releases the first',
    (await sheet.getByRole('button', { name: '₹50 L – ₹75 L', exact: true }).getAttribute('aria-pressed')) === 'false' &&
    (await sheet.getByRole('button', { name: '₹75 L – ₹1 Cr', exact: true }).getAttribute('aria-pressed')) === 'true')
  await sheet.getByRole('button', { name: '₹50 L – ₹75 L', exact: true }).click()
  await page.keyboard.press('Escape')
  await sheet.waitFor({ state: 'hidden' })
  // Radix returns focus in a setTimeout after the sheet unmounts, so wait
  // (bounded) for it rather than checking the instant the sheet is hidden.
  await check('Escape closes the sheet and returns focus to More filters', await page.waitForFunction(() => /More filters/.test(document.activeElement?.textContent ?? ''), null, { timeout: 2000 }).then(() => true, () => false))
  const chips = form.getByRole('list', { name: 'Selected filters' }).getByRole('listitem')
  await check('every chosen filter is echoed on the form as a chip', (await chips.allInnerTexts()).map((t) => t.trim()).join('|') === 'Flat / Apartment|₹50 L – ₹75 L|2 BHK|3 BHK', (await chips.allInnerTexts()).join('|'))
  await check('More filters states how many are chosen', /More filters\s*4 selected/.test((await more.textContent()) ?? ''))
  await form.getByRole('button', { name: 'Remove filter: 3 BHK' }).click()
  await check('a chip removes its filter', (await chips.count()) === 3 && /3 selected/.test((await more.textContent()) ?? ''))
  await form.getByRole('button', { name: 'Search properties for sale' }).click()
  await page.waitForURL((url) => url.pathname === '/buy/kolkata')
  let url = new URL(page.url())
  await check('Search opens the results with exactly those filters',
    url.searchParams.get('type') === 'APARTMENT' && url.searchParams.get('bhk') === '2' && url.searchParams.get('pmin') === '5000000' && url.searchParams.get('pmax') === '7500000' && [...url.searchParams.keys()].length === 4, url.search)
  await page.locator('h1 + p').first().waitFor()
  // On the results page a chip's remove control is a link to the URL without
  // that filter (UI-06), so it works without JavaScript.
  await check('the results page shows them as its own filters', (await page.getByRole('link', { name: /^Remove filter/ }).count()) >= 3)

  // Switching intent keeps type and bedrooms, drops a purchase budget, and
  // the sheet's own button is a second way to the results.
  await home(page)
  await more.click()
  sheet = page.getByRole('dialog', { name: 'More filters' })
  for (const option of ['Independent house', '₹1 Cr – ₹2 Cr', '4 BHK']) await sheet.getByRole('button', { name: option, exact: true }).click()
  await page.keyboard.press('Escape')
  await form.getByRole('tab', { name: 'Rent' }).click()
  await check('switching to Rent drops the purchase budget and keeps the rest', (await chips.allInnerTexts()).map((t) => t.trim()).join('|') === 'Independent house|4 BHK', (await chips.allInnerTexts()).join('|'))
  await more.click()
  await check('for renting, the budget becomes monthly rent', (await sheet.locator('legend').allInnerTexts()).includes('Monthly rent'))
  await sheet.getByRole('button', { name: '₹20,000 – ₹35,000', exact: true }).click()
  await sheet.getByRole('button', { name: 'Show properties for rent' }).click()
  await page.waitForURL((url) => url.pathname === '/rent/kolkata')
  url = new URL(page.url())
  await check('Show properties opens the rent results with those filters',
    url.searchParams.get('type') === 'INDEPENDENT_HOUSE' && url.searchParams.get('bhk') === '4' && url.searchParams.get('pmin') === '20000' && url.searchParams.get('pmax') === '35000', url.search)

  await home(page)
  await more.click()
  // Unavailable, but never natively disabled: Clear all empties itself, and
  // disabling it under the keyboard sent focus out of this sheet into the
  // dialog behind, where the next Escape closed neither (UI-13: the cause of
  // this check's long-standing local failure at the picker below).
  const clearAll = sheet.getByRole('button', { name: 'Clear all' })
  await check('Clear all is unavailable while nothing is chosen, and still focusable', await clearAll.getAttribute('aria-disabled') === 'true' && await clearAll.getAttribute('disabled') === null)
  await sheet.getByRole('button', { name: 'Villa', exact: true }).click()
  await clearAll.focus()
  await page.keyboard.press('Enter')
  await check('Clear all releases every option', (await sheet.locator('button[aria-pressed="true"]').count()) === 0)
  await check('focus stays on Clear all, inside the filters sheet', await clearAll.evaluate((el) => el === document.activeElement))
  await page.keyboard.press('Escape')

  // ── The locality picker ──────────────────────────────────────────────
  await form.getByRole('button', { name: /Search a locality in Kolkata/ }).click()
  const picker = page.getByRole('dialog', { name: 'Where are you looking?' })
  await picker.getByRole('combobox', { name: 'Search localities' }).fill('Salt')
  await picker.getByRole('option', { name: /Salt Lake/ }).first().click()
  await picker.getByRole('button', { name: /Done · 1 locality/ }).click()
  // The picker plays a 200ms exit (UI-04) and, like any modal, keeps the page
  // behind it aria-hidden until it unmounts; read the field once it has gone.
  await picker.waitFor({ state: 'detached' })
  await check('the chosen locality shows in the search field', (await form.getByRole('button', { name: /Salt Lake/ }).count()) === 1)
  await form.getByRole('button', { name: 'Search properties for sale' }).click()
  await page.waitForURL((url) => url.pathname === '/buy/kolkata/salt-lake')
  await check('Search with one locality opens its results page', (await resultCount(page)) > 0)

  // ── UI-13: the locality picker by keyboard and screen reader ─────────
  // Phone: the sheet holds the same combobox as desktop. Options are not
  // tab stops; arrows move the active option, Enter toggles it, and each
  // change is said in words.
  await home(page)
  await form.getByRole('button', { name: /Search a locality in Kolkata/ }).click()
  const box = page.getByRole('dialog', { name: 'Where are you looking?' }).getByRole('combobox', { name: 'Search localities' })
  // The sheet hands focus over once its entrance starts; wait for that
  // rather than reading the first frame.
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'combobox', null, { timeout: 3000 }).catch(() => {})
  await check('phone: the picker field is a 16px combobox with focus', await box.evaluate((el) => getComputedStyle(el).fontSize === '16px' && el === document.activeElement), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)))
  await check('phone: browser autofill stays out of the suggestions', await box.getAttribute('autocomplete') === 'off')
  const said = () => page.locator('[data-sheet] [role="status"]').last().innerText()
  await box.fill('zzzz')
  await check('phone: no match is shown and said', /No locality matches/.test(await page.locator('[data-sheet]').last().innerText()) && /No locality matches zzzz/.test(await said()))
  await box.fill('Salt')
  await check('phone: the number of matches is said', /\d+ localit(y|ies) found/.test(await said()), await said())
  await check('phone: suggestions are options, not tab stops', await page.locator('[role="option"]').count() > 0 && await page.locator('button[role="option"], [role="option"][tabindex]').count() === 0)
  await check('phone: nothing looks active before the arrows move', await box.getAttribute('aria-activedescendant') === null)
  await page.keyboard.press('ArrowDown')
  const activeId = await box.getAttribute('aria-activedescendant')
  await check('phone: ArrowDown makes the first suggestion active', !!activeId && await page.locator(`[id="${activeId}"]`).getAttribute('role') === 'option')
  await page.keyboard.press('Enter')
  await check('phone: Enter chooses it, and the choice is said', await page.locator(`[id="${activeId}"]`).getAttribute('aria-selected') === 'true' && /added\. 1 locality chosen\./.test(await said()), await said())
  await check('phone: focus stays in the field after choosing', await box.evaluate((el) => el === document.activeElement))
  const removeChosen = page.locator('[data-sheet]').last().getByRole('button', { name: /^Remove / })
  await removeChosen.focus()
  await page.keyboard.press('Enter')
  await check('phone: removing the last chosen locality hands focus back to the field', await box.evaluate((el) => el === document.activeElement) && await removeChosen.count() === 0)
  await box.fill('Uttarpara')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await check('phone: a long locality name fits without sideways scrolling', await page.evaluate(() => [...document.querySelectorAll('[data-sheet]')].every((s) => s.scrollWidth <= s.clientWidth + 1) && document.documentElement.scrollWidth <= innerWidth + 1))
  await page.keyboard.press('Escape')
  await check('phone: Escape first clears the search, leaving the picker open', await box.inputValue() === '' && await box.getAttribute('aria-expanded') === 'false' && await page.getByRole('dialog', { name: 'Where are you looking?' }).isVisible())
  await page.keyboard.press('Escape')
  await page.getByRole('dialog', { name: 'Where are you looking?' }).waitFor({ state: 'detached' })
  await page.waitForTimeout(100)
  await check('phone: Escape closes the picker and focus returns to the field that opened it', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')?.startsWith('Localities: ') ?? false))

  // Desktop: the combobox inline in the hero's search (UI-14; it used to
  // sit in a search sheet). Escape closes the suggestions first, then
  // clears the text; focus never leaves the field.
  {
    const desk = await open(1280, 900)
    await home(desk)
    const deskForm = desk.getByRole('form', { name: 'Search properties' })
    const inline = deskForm.getByRole('combobox', { name: 'Search localities in Kolkata' })
    await inline.waitFor()
    await inline.click()
    await inline.fill('New')
    await check('desktop: typing opens the suggestions', await inline.getAttribute('aria-expanded') === 'true' && !!(await inline.getAttribute('aria-activedescendant')))
    await desk.keyboard.press('ArrowDown')
    await desk.keyboard.press('ArrowUp')
    await desk.keyboard.press('Enter')
    await check('desktop: Enter adds the active suggestion as a chip and clears the text', await deskForm.locator('ul[aria-label="Chosen localities"] li').count() === 1 && await inline.inputValue() === '')
    await inline.fill('Sal')
    await desk.keyboard.press('Escape')
    await check('desktop: Escape closes the suggestions and keeps focus in the field', await inline.getAttribute('aria-expanded') === 'false' && await inline.evaluate((el) => el === document.activeElement) && await inline.inputValue() === 'Sal')
    await desk.keyboard.press('Escape')
    await check('desktop: a second Escape clears the text', await inline.inputValue() === '')
    await desk.keyboard.press('Backspace')
    await check('desktop: Backspace in the empty field removes the last chip', await deskForm.locator('ul[aria-label="Chosen localities"]').count() === 0)
    await desk.context().close()
  }

  // Without JavaScript the panel cannot work (its tabs and picker are
  // scripts), so the hero swaps it for links to the results pages, where
  // search works without JavaScript (UI-06), at a phone's width and a
  // desktop's.
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: width < 768, javaScriptEnabled: false })
    const nojs = await ctx.newPage()
    await nojs.goto(base + '/', { waitUntil: 'load' })
    const card = nojs.locator('.home-search-card')
    const buy = card.getByRole('link', { name: 'Search homes for sale in Kolkata' })
    const rent = card.getByRole('link', { name: 'Homes to rent in Kolkata' })
    await check(`no JavaScript (${width}px): the hero offers links to sale and rent results in place of the form`,
      await buy.isVisible() && await buy.getAttribute('href') === '/buy/kolkata' && await rent.isVisible() && await rent.getAttribute('href') === '/rent/kolkata' &&
      !(await nojs.locator('form[aria-label="Search properties"]').isVisible()) && await card.locator('button:visible').count() === 0)
    const sizes = [await buy.boundingBox(), await rent.boundingBox()]
    await check(`no JavaScript (${width}px): both links are 44px targets inside the screen`, sizes.every((b) => b.height >= 44 && b.x >= 0 && b.x + b.width <= width), JSON.stringify(sizes))
    await buy.click()
    await nojs.waitForURL((url) => url.pathname === '/buy/kolkata')
    await check(`no JavaScript (${width}px): it opens the results page`, await nojs.locator('article').count() > 0)
    await ctx.close()
  }

  // ── Listing rails: swipe, snap, peek, and an honest end card ─────────
  await home(page)
  // Phase B: the collections the data supports, in page order. With the
  // fixture that is all four; a collection with nothing in it would not
  // render (unit-tested in lib/home/discovery.test.ts).
  const railIds = await page.locator('ul.home-rail').evaluateAll((uls) => uls.map((ul) => ul.getAttribute('aria-labelledby')))
  await check(`the collections, in order: ${railIds.join(', ')}`, JSON.stringify(railIds) === JSON.stringify(['rail-new-sale', 'rail-new-rent', 'rail-reduced', 'rail-under-construction']))
  const railListings = await page.locator('ul.home-rail').evaluateAll((uls) => uls.map((ul) => [...ul.querySelectorAll('article')].map((a) => ({ href: a.querySelector('a').getAttribute('href'), cover: a.querySelector('img')?.getAttribute('src') ?? '' }))))
  const everyListing = railListings.flat().map((c) => c.href)
  await check('no listing appears in two collections', new Set(everyListing).size === everyListing.length, JSON.stringify(everyListing))
  await check('no collection repeats a cover photo', railListings.every((cards) => new Set(cards.map((c) => c.cover)).size === cards.length))
  const client = await page.context().newCDPSession(page)
  for (const [index, id] of railIds.entries()) {
    const rail = page.locator('ul.home-rail').nth(index)
    const section = page.locator(`section[aria-labelledby="${id}"]`)
    await rail.evaluate((ul) => ul.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const m = await rail.evaluate((ul) => {
      const items = [...ul.children].map((li) => li.getBoundingClientRect())
      const cards = [...ul.querySelectorAll('article')].map((a) => a.getBoundingClientRect())
      const style = getComputedStyle(ul)
      return {
        scrolls: ul.scrollWidth > ul.clientWidth,
        snap: style.scrollSnapType,
        // The page gutter: where the section's heading starts.
        gutter: document.getElementById(ul.getAttribute('aria-labelledby')).getBoundingClientRect().left,
        first: { left: items[0].left, right: items[0].right },
        second: { left: items[1].left, right: items[1].right, width: items[1].width },
        widths: [...new Set(cards.map((c) => Math.round(c.width)))],
        heights: [...new Set(cards.map((c) => Math.round(c.height)))],
        cards: cards.length,
      }
    })
    await check(`${id}: scrolls sideways and snaps`, m.scrolls && m.snap.includes('x') && m.snap.includes('mandatory'), m.snap)
    // Chrome snaps a mandatory scroller on load, so the first card rests at
    // the snap position: on the gutter, never flush with the screen edge.
    await check(`${id}: the first card rests on the page gutter, in line with the heading, wholly on screen`, Math.abs(m.first.left - m.gutter) <= 1 && m.first.right <= 390, `card at ${m.first.left}px, heading at ${m.gutter}px`)
    const peek = (390 - m.second.left) / m.second.width
    await check(`${id}: the next card shows at the edge`, peek > 0.2 && peek < 0.8, `${Math.round(peek * 100)}% visible`)
    await check(`${id}: every card is the same size`, m.widths.length === 1 && m.heights.length === 1, `widths ${m.widths}, heights ${m.heights}`)

    // A real touch swipe — finger down on the first card's photo, dragged
    // 170px to the left, lifted — through the browser's own gesture
    // handling, so scrolling and snapping happen as they do on a phone.
    const box = await rail.boundingBox()
    const y = Math.round(box.y + 80)
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y }] })
    for (let step = 1; step <= 10; step++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300 - step * 17, y }] })
      await page.waitForTimeout(16)
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(700)
    const landed = await rail.evaluate((ul, gutter) => ({ scrollLeft: ul.scrollLeft, offsets: [...ul.children].map((li) => Math.round(li.getBoundingClientRect().left - gutter)) }), m.gutter)
    await check(`${id}: a swipe moves on and lands a later card cleanly on the gutter`, landed.scrollLeft > 0 && landed.offsets.slice(1).some((o) => Math.abs(o) <= 1), JSON.stringify(landed))
    await rail.evaluate((ul) => ul.scrollTo({ left: 0, behavior: 'instant' }))

    // Each card: one link to its listing, a named save button, a price, and
    // the sample label on the photo.
    const cards = await rail.locator('article').evaluateAll((articles) => articles.map((a) => ({
      links: [...a.querySelectorAll('a')].map((l) => l.getAttribute('href')),
      save: a.querySelector('button')?.getAttribute('aria-label') ?? '',
      price: /₹/.test(a.textContent ?? ''),
      sample: [...a.querySelectorAll('span')].some((s) => s.textContent === 'Sample'),
    })))
    await check(`${id}: each card is one link to its listing, with a price, a save button and the sample label`,
      cards.length > 0 && cards.every((c) => c.links.length === 1 && c.links[0].startsWith('/property/') && /^Save /.test(c.save) && c.price && c.sample), JSON.stringify(cards[0]))

    const end = rail.locator('li.home-rail-end a')
    const endText = (await end.innerText()).replace(/\s+/g, ' ')
    const claimed = Number(endText.match(/(\d+) listings? in Kolkata/)?.[1])
    const endHref = await end.getAttribute('href')
    const headHref = await section.getByRole('link', { name: /^View all homes / }).getAttribute('href')
    await check(`${id}: ends in a "see all" card that goes where the heading's View all goes (${endHref})`, endHref === headHref && /See all homes /.test(endText) && await rail.evaluate((ul) => ul.lastElementChild.classList.contains('home-rail-end')), endText)
    const results = await open(390, 844)
    await results.goto(base + endHref)
    await check(`${id}: the end card's count (${claimed}) is the count its results page shows`, claimed === (await resultCount(results)), `${claimed} claimed`)
    await results.context().close()
  }
  await check('the first two collections are the newest for sale and to rent',
    await page.locator('section[aria-labelledby="rail-new-sale"] li.home-rail-end a').getAttribute('href') === '/buy/kolkata?sort=newest' &&
    await page.locator('section[aria-labelledby="rail-new-rent"] li.home-rail-end a').getAttribute('href') === '/rent/kolkata?sort=newest')
  const reducedBadges = await page.locator('section[aria-labelledby="rail-reduced"] article').evaluateAll((as) => as.map((a) => a.textContent.includes('Price reduced')))
  const buildingBadges = await page.locator('section[aria-labelledby="rail-under-construction"] article').evaluateAll((as) => as.map((a) => a.textContent.includes('Under construction')))
  await check('every card in the price-reduced and under-construction collections says so on its photo', reducedBadges.every(Boolean) && buildingBadges.every(Boolean) && reducedBadges.length > 0 && buildingBadges.length > 0)

  // ── Save, signed out ─────────────────────────────────────────────────
  await home(page)
  await page.locator('.home-rail article').first().getByRole('button', { name: /^Save / }).click()
  await page.waitForURL((url) => url.pathname === '/login')
  await check('saving while signed out asks you to sign in, then returns here', new URL(page.url()).searchParams.get('next') === '/')

  // ── Quick routes ─────────────────────────────────────────────────────
  await home(page)
  const quick = page.getByRole('navigation', { name: 'Quick routes' })
  const routes = await quick.getByRole('link').evaluateAll((links) => links.map((l) => [l.querySelector('span:not([aria-hidden]):not(.sr-only)').textContent, l.getAttribute('href'), l.getBoundingClientRect().height]))
  await check('quick routes go to Buy, Rent, Localities and Post property',
    JSON.stringify(routes.map(([label, href]) => [label, href])) === JSON.stringify([['Buy', '/buy/kolkata'], ['Rent', '/rent/kolkata'], ['Videos', '/videos'], ['Tools', '/calculators'], ['Localities', '/#localities'], ['Post property', '/post']]), JSON.stringify(routes))
  await check('every quick route is a 44px target', routes.every(([, , h]) => h >= 44))
  await quick.getByRole('link', { name: /Localities/ }).click()
  await page.waitForFunction(() => location.hash === '#localities')
  await page.waitForTimeout(400)
  // The band lands just below the header (its scroll margin), so its own
  // padding is the gap between the header and the section's heading.
  const landing = await page.evaluate(() => ({
    section: Math.round(document.querySelector('#localities').getBoundingClientRect().top),
    heading: Math.round(document.querySelector('#localities p').getBoundingClientRect().top),
    header: Math.round(document.querySelector('header').getBoundingClientRect().bottom),
  }))
  await check('Localities scrolls to the localities, not underneath the header', landing.section >= landing.header && landing.section <= landing.header + 24 && landing.heading >= landing.header + 32 && landing.heading <= landing.header + 72, JSON.stringify(landing))
  for (const [name, path] of [['Buy', '/buy/kolkata'], ['Rent', '/rent/kolkata']]) {
    await home(page)
    await quick.getByRole('link', { name: new RegExp(`^${name}`) }).click()
    await page.waitForURL((url) => url.pathname === path)
    await check(`the ${name} route opens its results`, (await resultCount(page)) > 0)
  }
  await home(page)
  await check('on a phone, posting is reachable in the header and bottom bar',
    (await page.locator('header').getByRole('link', { name: 'Post property' }).isVisible()) &&
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Sell/Rent' }).isVisible())
  const headerLines = await page.locator('header a').evaluateAll((links) => links.filter((l) => l.offsetParent).map((l) => [l.textContent.trim(), Math.round(l.getBoundingClientRect().height)]))
  await check('header controls keep to one line', headerLines.every(([, h]) => h <= 48), JSON.stringify(headerLines))

  // ── Every count on the page: a real link, and the number its page shows ──
  // The hero's shortcuts, neighbourhoods, property types, budgets, sizes,
  // sellers and possession (Phase B; UI-14 layout). Each figure is read off
  // the page and checked against the results page it opens.
  const localityTiles = await page.locator('#localities ul[aria-label^="Popular localities"] > li').evaluateAll((lis) => lis.map((li) => ({
    name: li.querySelector('h3').textContent.trim(),
    box: (({ top, left, right }) => ({ top: Math.round(top), left: Math.round(left), right: Math.round(right) }))(li.getBoundingClientRect()),
    links: [...li.querySelectorAll('a')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() })),
  })))
  await check('eight neighbourhoods, each offering its sale and rent results', localityTiles.length === 8 &&
    localityTiles.every((t) => t.links.length >= 1 && t.links.every((l) => /^\/(buy|rent)\/kolkata\/[a-z-]+$/.test(l.href))), JSON.stringify(localityTiles[0]))
  await check('each locality link names its place for a screen reader', localityTiles.every((t) => t.links.every((l) => l.text.includes(t.name))))
  await check('some localities offer homes to rent as well as for sale', localityTiles.some((t) => t.links.some((l) => l.href.startsWith('/rent/'))))
  const [one, two, three] = localityTiles.map((t) => t.box)
  await check('on a phone the neighbourhoods sit two to a row, inside the screen', one.top === two.top && three.top > one.top && localityTiles.every((t) => t.box.left >= 16 && t.box.right <= 374), JSON.stringify([one, two, three]))
  const typeLinks = await page.locator('ul.home-type-rail a').evaluateAll((links) => links.map((l) => l.getAttribute('href')))
  await check('property types link to their landing pages, for sale and to rent',
    typeLinks.length >= 5 && typeLinks.every((h) => /^\/(buy|rent)\/kolkata\/(flats|independent-houses|builder-floors|villas|studio-apartments)$/.test(h)) && typeLinks.includes('/buy/kolkata/flats') && typeLinks.includes('/rent/kolkata/flats'), JSON.stringify(typeLinks))
  // A count link's figure is its last tabular number: a budget pill shows
  // its band ("Up to ₹25 L") before the count.
  const countLinks = await page.locator('nav[aria-label="Browse Kolkata"] a, #localities ul[aria-label^="Popular localities"] a, ul.home-type-rail a, section[aria-labelledby="browse-your-way"] li a').evaluateAll((links) => links.map((l) => ({
    href: l.getAttribute('href'),
    text: l.textContent.replace(/\s+/g, ' ').trim(),
    count: [...l.querySelectorAll('.tabular')].map((n) => parseInt(n.textContent.replace(/,/g, ''), 10)).filter(Number.isFinite).at(-1) ?? null,
    height: l.getBoundingClientRect().height,
    width: l.getBoundingClientRect().width,
  })))
  await check(`every count link is at least 44px tall (${countLinks.length} links)`, countLinks.every((l) => l.height >= 44), JSON.stringify(countLinks.filter((l) => l.height < 44).slice(0, 3)))
  const panels = await page.locator('section[aria-labelledby="browse-your-way"] h3').evaluateAll((hs) => hs.map((h) => [h.textContent.trim(), [...h.parentElement.querySelectorAll('p')].map((p) => p.textContent.trim())]))
  await check('budget and bedrooms each cover buying and renting; seller and possession follow', JSON.stringify(panels) === JSON.stringify([
    ['Your budget', ['To buy', 'To rent, per month']], ['Bedrooms', ['To buy', 'To rent']], ['Seller and possession', ['Posted by', 'When you can move in']],
  ]), JSON.stringify(panels))
  await check('"Up to ₹25 L" goes to its landing page, not a query string', await page.locator('section[aria-labelledby="browse-your-way"] a', { hasText: 'Up to ₹25 L' }).getAttribute('href') === '/buy/kolkata/under-25-lakh')
  const checker = await open(390, 844)
  let matched = 0
  for (const link of countLinks) {
    if (link.count === null) continue
    await checker.goto(base + link.href)
    const shown = await resultCount(checker)
    if (link.count !== shown) await check(`"${link.text}" matches its results page (${link.href})`, false, `${shown} on the page`)
    matched++
  }
  await check(`every count on the homepage matches its results page (${matched} counts checked)`, matched >= 40 && matched === countLinks.filter((l) => !/^Explore/.test(l.text)).length)
  await checker.context().close()
  await check('nothing says 0: an empty place, type, band or size is left out, or says Explore', countLinks.every((l) => l.count !== 0))

  const all = page.locator('#localities details')
  await check('the full locality index starts closed', !(await all.evaluate((d) => d.open)))
  await all.locator('summary').click()
  const index = await all.locator('ul a').evaluateAll((links) => links.map((l) => [l.getAttribute('href'), l.getBoundingClientRect().height]))
  const promised = Number((await all.locator('summary').innerText()).match(/All (\d+) localities/)?.[1])
  await check('opening it lists every locality it promises, as 44px links', index.length === promised && promised >= 30 && index.every(([href, h]) => href.startsWith('/buy/kolkata/') && h >= 44), `${index.length} of ${promised}`)

  // ── Every link on the page resolves ──────────────────────────────────
  const hrefs = [...new Set(await page.locator('a[href^="/"]').evaluateAll((links) => links.map((l) => l.getAttribute('href').split('#')[0] || '/')))]
  const broken = []
  for (const href of hrefs) {
    const response = await page.request.get(base + href)
    if (response.status() !== 200) broken.push(`${href} → ${response.status()}`)
  }
  await check(`all ${hrefs.length} links on the homepage resolve`, broken.length === 0, broken.join(', '))

  // ── Honesty: sample data is labelled; nothing is invented ────────────
  await check('the sample-data notice is on the page', await page.getByText('Listings shown are sample data.').isVisible())
  const body = await page.locator('main').innerText()
  const invented = ['RERA', 'Recommended', 'Offer', 'Demand', 'FREE', 'Verified', 'Trending', 'Trusted', 'rated', 'reviews?', 'customers', 'users', 'happy', 'No\\.? ?1', '#1', 'projects?'].filter((word) => new RegExp(`\\b${word}`, 'i').test(body))
  await check('no projects, RERA badges, offers, ratings, user counts or demand figures the product cannot back', invented.length === 0, invented.join(', '))
  // The discovery hierarchy, in order, below the search (UI-14 zones).
  const order = await page.locator('main h2').evaluateAll((hs) => hs.map((h) => h.id).filter(Boolean))
  await check(`the homepage sections, in order: ${order.join(' › ')}`, JSON.stringify(order) === JSON.stringify([
    'rail-new-sale', 'rail-new-rent', 'popular-localities', 'browse-type', 'rail-reduced', 'rail-under-construction',
    'browse-your-way', 'plan-purchase', 'why-us', 'post-cta',
  ]))
  // The calculators are real (Phase 40A), so the homepage may point at them.
  const plan = await page.locator('section[aria-labelledby="plan-purchase"] a').evaluateAll((links) => links.map((l) => l.getAttribute('href')))
  await check('the plan-your-purchase section links to both working calculators', JSON.stringify(plan) === JSON.stringify(['/calculators', '/calculators/budget', '/calculators/emi']), JSON.stringify(plan))
  await page.context().close()

  // ── Desktop ──────────────────────────────────────────────────────────
  const desk = await open(1280, 900)
  await home(desk)
  await check('desktop: the quick routes give way to the header', !(await desk.getByRole('navigation', { name: 'Quick routes' }).isVisible()) &&
    JSON.stringify(await desk.locator('header nav .nav-top').allInnerTexts()) === JSON.stringify(['Buy', 'Rent', 'Localities', 'Home loans']) &&
    await desk.locator('header').getByRole('link', { name: 'Post property' }).isVisible())
  const grid = await desk.locator('ul.home-rail').evaluateAll((uls) => uls.map((ul) => {
    const shown = [...ul.children].filter((li) => li.offsetParent)
    return {
      display: getComputedStyle(ul).display,
      scrolls: ul.scrollWidth > ul.clientWidth,
      listings: shown.filter((li) => li.querySelector('article')).length,
      endLast: shown.at(-1)?.classList.contains('home-rail-end'),
      rows: new Set(shown.map((li) => Math.round(li.getBoundingClientRect().top))).size,
    }
  }))
  await check('desktop: each rail is one row of three listings and its See-all card, not a scroller', grid.every((g) => g.display === 'grid' && !g.scrolls && g.listings === 3 && g.endLast && g.rows === 1), JSON.stringify(grid))
  // The approved UI-14 composition: header, page and footer share one
  // 1400px frame, so their left edges line up at any desktop width.
  for (const width of [1280, 1440, 1920]) {
    await desk.setViewportSize({ width, height: 900 })
    const edges = await desk.evaluate(() => [
      document.querySelector('header a').getBoundingClientRect().left,
      document.querySelector('#rail-new-sale').getBoundingClientRect().left,
      document.querySelector('footer a').getBoundingClientRect().left,
    ].map(Math.round))
    await check(`desktop ${width}px: header, sections and footer start on one edge of a 1400px frame`, Math.max(...edges) - Math.min(...edges) <= 1 && edges[0] === Math.max(32, Math.round((width - 1400) / 2) + 32), JSON.stringify(edges))
  }
  await desk.setViewportSize({ width: 1280, height: 900 })

  // Localities has no page of its own yet (Phases 29–30): from anywhere,
  // the header link opens the homepage's localities, below the header.
  await desk.goto(base + '/buy/kolkata', { waitUntil: 'load' })
  await desk.locator('header nav').getByRole('link', { name: 'Localities' }).click()
  await desk.waitForURL((url) => url.pathname === '/' && url.hash === '#localities')
  await desk.locator('#localities').waitFor()
  await desk.waitForTimeout(500)
  const landed = await desk.evaluate(() => ({
    section: Math.round(document.querySelector('#localities').getBoundingClientRect().top),
    heading: Math.round(document.querySelector('#localities p').getBoundingClientRect().top),
    header: Math.round(document.querySelector('header').getBoundingClientRect().bottom),
  }))
  await check('desktop: Localities in the header opens the localities from another page, below the header', landed.section >= landed.header && landed.section <= landed.header + 32 && landed.heading >= landed.header + 48 && landed.heading <= landed.header + 112, JSON.stringify(landed))
  await home(desk)

  // The locality dropdown hangs out of the hero's search card, over the
  // shortcuts and the page below it: it must paint on top.
  const combo = desk.getByRole('form', { name: 'Search properties' }).getByRole('combobox', { name: 'Search localities in Kolkata' })
  await combo.click()
  await combo.fill('sa')
  const listbox = desk.getByRole('listbox')
  await listbox.waitFor()
  const reach = await listbox.evaluate((list) => {
    const r = list.getBoundingClientRect()
    return {
      cardBottom: document.querySelector('.home-search-card').getBoundingClientRect().bottom, listBottom: r.bottom,
      points: [0.25, 0.5, 0.9].map((f) => list.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height * f))),
    }
  })
  await check('desktop: the open locality list paints over the page below the search card', reach.listBottom > reach.cardBottom && reach.points.every(Boolean), JSON.stringify(reach))
  await combo.fill('')

  // Keyboard: from the search field onward, every stop is visibly focused.
  await combo.focus()
  await desk.keyboard.press('Tab')
  let ring = await focusRing(desk)
  await check('desktop: Tab reaches More filters with a visible focus ring', /More filters/.test(ring?.text) && ring.visible, JSON.stringify(ring))
  await desk.keyboard.press('Tab')
  ring = await focusRing(desk)
  await check('desktop: then Search, with a visible focus ring', /^Search/.test(ring?.text) && ring.visible, JSON.stringify(ring))
  // The search is part of the page now (UI-14), not a modal: the next stop
  // is the first shortcut under it, focused visibly on the photograph.
  await desk.keyboard.press('Tab')
  ring = await focusRing(desk)
  await check('desktop: then the first hero shortcut, with a visible focus ring', /^Homes for sale\s*\d+/.test(ring?.text) && ring.visible && await desk.evaluate(() => !!document.activeElement?.closest('nav[aria-label="Browse Kolkata"]')), JSON.stringify(ring))
  await desk.getByRole('form', { name: 'Search properties' }).getByRole('button', { name: /^More filters/ }).click()
  // Measure the dialog at rest, after its 0.97 → 1 entrance (UI-04).
  await desk.getByRole('dialog', { name: 'More filters' }).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
  const dialog = await desk.getByRole('dialog', { name: 'More filters' }).boundingBox()
  await check('desktop: More filters opens as a centred dialog, not a full-screen sheet', dialog.width < 600 && dialog.height < 900 && Math.abs(dialog.x + dialog.width / 2 - 640) <= 2, JSON.stringify(dialog))
  await desk.context().close()

  // Tablet and desktop dialogs are sized by their content: every group is in
  // view without scrolling inside the dialog (it was once fixed at half the
  // viewport, which hid Bedrooms below an inner scroll).
  for (const [width, height] of [[768, 1024], [1280, 900]]) {
    const p = await open(width, height)
    await home(p)
    await p.getByRole('form', { name: 'Search properties' }).getByRole('button', { name: /^More filters/ }).click()
    const fit = await p.getByRole('dialog', { name: 'More filters' }).evaluate((d) => {
      const body = d.querySelector('fieldset').parentElement.parentElement
      const bottom = d.getBoundingClientRect().bottom
      return { inner: body.scrollHeight - body.clientHeight, legends: [...d.querySelectorAll('legend')].map((l) => l.getBoundingClientRect().bottom <= bottom).every(Boolean) }
    })
    await check(`${width}px: the filter dialog shows every group without an inner scroll`, fit.inner <= 1 && fit.legends, JSON.stringify(fit))
    await p.context().close()
  }

  // ── No horizontal overflow at any target width ───────────────────────
  // Measured after scrolling the whole page, and with layout shift recorded
  // throughout: tiles, rails and images are sized before they paint.
  for (const width of [390, 412, 768, 1024, 1280]) {
    const p = await open(width, 900)
    await p.addInitScript(() => {
      window.__cls = 0
      new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
    })
    await home(p)
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) } })
    await p.waitForTimeout(300)
    await check(`${width}px: no horizontal overflow, top to bottom`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
    const cls = await p.evaluate(() => window.__cls)
    await check(`${width}px: no layout shift while the page loads and scrolls (CLS ${cls.toFixed(4)})`, cls < 0.01)
    await p.context().close()
  }

  await check('nothing is fetched from another origin', foreign.length === 0, foreign.slice(0, 3).join(', '))
  await check('no script errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}

console.log(`${passed} passed, 0 failed`)
