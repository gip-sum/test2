// Browser assertions for the homepage (app/page.tsx).
//
// Measures what a screenshot can only suggest: that the whole search sits
// on a phone's first screen, clear of the header and the bottom bar; that
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
      const buttons = [...form.querySelectorAll('button')]
      return {
        header: box(document.querySelector('header')),
        bar: box(document.querySelector('nav.fixed[aria-label="Primary"]')),
        controls: {
          'the Buy tab': box(form.querySelector('[role="tab"]')),
          'the Rent tab': box(form.querySelectorAll('[role="tab"]')[1]),
          'the locality search': box(buttons.find((b) => /Search a locality/.test(b.textContent))),
          'More filters': box(buttons.find((b) => /More filters/.test(b.textContent))),
          'the Search button': box(form.querySelector('button[type="submit"]')),
        },
        headline: box(document.querySelector('#home-title')),
        firstCard: box(document.querySelector('.listing-rail article')),
      }
    })
    await check(`${name}: the headline is on the first screen`, m.headline && m.headline.top >= m.header.bottom && m.headline.bottom <= m.bar.top)
    for (const [control, box] of Object.entries(m.controls)) {
      await check(`${name}: ${control} is on the first screen, clear of the header and the bottom bar`,
        box && box.top >= m.header.bottom && box.bottom <= m.bar.top && box.left >= 0 && box.right <= width && box.height >= 40, JSON.stringify(box))
    }
    if (height >= 844) {
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
  const chrome = await page.evaluate(() => ['header', 'nav.fixed[aria-label="Primary"]'].map((selector) => {
    const el = document.querySelector(selector)
    const style = getComputedStyle(el)
    let opacity = 1
    for (let n = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity)
    const r = el.getBoundingClientRect()
    return { selector, background: style.backgroundColor, backdrop: style.backdropFilter, opacity, top: r.top, bottom: r.bottom }
  }))
  for (const bar of chrome) {
    const name = bar.selector === 'header' ? 'the header' : 'the bottom bar'
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
      const heart = document.querySelectorAll('.listing-rail')[where === 'header' ? 0 : 1].querySelector('article button[aria-label^="Save"]')
      const header = document.querySelector('header').getBoundingClientRect()
      const bar = document.querySelector('nav.fixed[aria-label="Primary"]')
      const target = where === 'header' ? header.top + header.height / 2 : bar.getBoundingClientRect().top + 20
      const r = heart.getBoundingClientRect()
      window.scrollBy(0, r.top + r.height / 2 - target)
      const now = heart.getBoundingClientRect()
      const hit = document.elementFromPoint(now.left + now.width / 2, now.top + now.height / 2)
      return where === 'header' ? Boolean(hit?.closest('header')) : Boolean(hit?.closest('nav.fixed'))
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
  await check('Escape closes the sheet and returns focus to More filters', await page.evaluate(() => /More filters/.test(document.activeElement?.textContent ?? '')))
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
  await check('the results page shows them as its own filters', (await page.getByRole('button', { name: /^Remove filter/ }).count()) >= 3)

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
  await check('Clear all is disabled while nothing is chosen', await sheet.getByRole('button', { name: 'Clear all' }).isDisabled())
  await sheet.getByRole('button', { name: 'Villa', exact: true }).click()
  await sheet.getByRole('button', { name: 'Clear all' }).click()
  await check('Clear all releases every option', (await sheet.locator('button[aria-pressed="true"]').count()) === 0)
  await page.keyboard.press('Escape')

  // ── The locality picker ──────────────────────────────────────────────
  await form.getByRole('button', { name: /Search a locality in Kolkata/ }).click()
  const picker = page.getByRole('dialog', { name: 'Where are you looking?' })
  await picker.getByRole('textbox', { name: 'Search localities' }).fill('Salt')
  await picker.getByRole('option', { name: /Salt Lake/ }).first().click()
  await picker.getByRole('button', { name: /Done · 1 locality/ }).click()
  await check('the chosen locality shows in the search field', (await form.getByRole('button', { name: /Salt Lake/ }).count()) === 1)
  await form.getByRole('button', { name: 'Search properties for sale' }).click()
  await page.waitForURL((url) => url.pathname === '/buy/kolkata/salt-lake')
  await check('Search with one locality opens its results page', (await resultCount(page)) > 0)

  // ── Listing rails: swipe, snap, peek, and an honest end card ─────────
  await home(page)
  const rails = await page.locator('ul.listing-rail').count()
  await check('there is a rail for sale and a rail to rent', rails === 2)
  const client = await page.context().newCDPSession(page)
  for (const [index, intent] of [[0, 'buy'], [1, 'rent']]) {
    const rail = page.locator('ul.listing-rail').nth(index)
    await rail.evaluate((ul) => ul.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const m = await rail.evaluate((ul) => {
      const items = [...ul.children].map((li) => li.getBoundingClientRect())
      const cards = [...ul.querySelectorAll('article')].map((a) => a.getBoundingClientRect())
      const style = getComputedStyle(ul)
      return {
        scrolls: ul.scrollWidth > ul.clientWidth,
        snap: style.scrollSnapType,
        first: { left: items[0].left, right: items[0].right },
        second: { left: items[1].left, right: items[1].right, width: items[1].width },
        widths: [...new Set(cards.map((c) => Math.round(c.width)))],
        heights: [...new Set(cards.map((c) => Math.round(c.height)))],
        cards: cards.length,
      }
    })
    await check(`${intent} rail: scrolls sideways and snaps`, m.scrolls && m.snap.includes('x') && m.snap.includes('mandatory'), m.snap)
    await check(`${intent} rail: the first card is wholly on screen`, m.first.left >= 0 && m.first.right <= 390)
    const peek = (390 - m.second.left) / m.second.width
    await check(`${intent} rail: the next card shows at the edge`, peek > 0.2 && peek < 0.8, `${Math.round(peek * 100)}% visible`)
    await check(`${intent} rail: every card is the same size`, m.widths.length === 1 && m.heights.length === 1, `widths ${m.widths}, heights ${m.heights}`)

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
    const landed = await rail.evaluate((ul) => {
      const edge = ul.getBoundingClientRect().left + parseFloat(getComputedStyle(ul).scrollPaddingLeft || '0')
      return { scrollLeft: ul.scrollLeft, offsets: [...ul.children].map((li) => Math.round(li.getBoundingClientRect().left - edge)) }
    })
    await check(`${intent} rail: a swipe moves on and lands a card cleanly at the edge`, landed.scrollLeft > 0 && landed.offsets.some((o) => Math.abs(o) <= 1), JSON.stringify(landed))
    await rail.evaluate((ul) => ul.scrollTo({ left: 0, behavior: 'instant' }))

    // Each card: one link to its listing, a named save button, a price, and
    // the sample label on the photo.
    const cards = await rail.locator('article').evaluateAll((articles) => articles.map((a) => ({
      links: [...a.querySelectorAll('a')].map((l) => l.getAttribute('href')),
      save: a.querySelector('button')?.getAttribute('aria-label') ?? '',
      price: /₹/.test(a.textContent ?? ''),
      sample: [...a.querySelectorAll('span')].some((s) => s.textContent === 'Sample'),
    })))
    await check(`${intent} rail: each card is one link to its listing, with a price, a save button and the sample label`,
      cards.length > 0 && cards.every((c) => c.links.length === 1 && c.links[0].startsWith('/property/') && /^Save /.test(c.save) && c.price && c.sample), JSON.stringify(cards[0]))

    const end = rail.locator('li.listing-rail-end a')
    const endText = (await end.innerText()).replace(/\s+/g, ' ')
    const claimed = Number(endText.match(/(\d+) listings?/)?.[1])
    await check(`${intent} rail: ends in a "see all" card`, (await end.getAttribute('href')) === `/${intent}/kolkata?sort=newest` && endText.includes(`See all homes ${intent === 'buy' ? 'for sale' : 'to rent'}`), endText)
    const results = await open(390, 844)
    await results.goto(base + `/${intent}/kolkata?sort=newest`)
    await check(`${intent} rail: the end card's count is the count its results page shows`, claimed === (await resultCount(results)), `${claimed} claimed`)
    await results.context().close()
  }

  // ── Save, signed out ─────────────────────────────────────────────────
  await home(page)
  await page.locator('.listing-rail article').first().getByRole('button', { name: /^Save / }).click()
  await page.waitForURL((url) => url.pathname === '/login')
  await check('saving while signed out asks you to sign in, then returns here', new URL(page.url()).searchParams.get('next') === '/')

  // ── Quick routes ─────────────────────────────────────────────────────
  await home(page)
  const quick = page.getByRole('navigation', { name: 'Quick routes' })
  const routes = await quick.getByRole('link').evaluateAll((links) => links.map((l) => [l.querySelector('.quick-label').textContent, l.getAttribute('href'), l.getBoundingClientRect().height]))
  await check('quick routes go to Buy, Rent, Localities and Post property',
    JSON.stringify(routes.map(([label, href]) => [label, href])) === JSON.stringify([['Buy', '/buy/kolkata'], ['Rent', '/rent/kolkata'], ['Localities', '/#localities'], ['Post property', '/post']]), JSON.stringify(routes))
  await check('every quick route is a 44px target', routes.every(([, , h]) => h >= 44))
  await quick.getByRole('link', { name: /Localities/ }).click()
  await page.waitForFunction(() => location.hash === '#localities')
  await page.waitForTimeout(400)
  const landing = await page.evaluate(() => ({
    section: document.querySelector('#localities').getBoundingClientRect().top,
    header: document.querySelector('header').getBoundingClientRect().bottom,
  }))
  await check('Localities scrolls to the localities, not underneath the header', landing.section >= landing.header - 1 && landing.section <= landing.header + 32, JSON.stringify(landing))
  for (const [name, path] of [['Buy', '/buy/kolkata'], ['Rent', '/rent/kolkata']]) {
    await home(page)
    await quick.getByRole('link', { name: new RegExp(`^${name}`) }).click()
    await page.waitForURL((url) => url.pathname === path)
    await check(`the ${name} route opens its results`, (await resultCount(page)) > 0)
  }
  await home(page)
  await check('on a phone, posting lives in the bottom bar, not a squeezed header button',
    !(await page.locator('header').getByRole('link', { name: 'Post property' }).isVisible()) &&
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Post' }).isVisible())
  const headerLines = await page.locator('header a').evaluateAll((links) => links.filter((l) => l.offsetParent).map((l) => [l.textContent.trim(), Math.round(l.getBoundingClientRect().height)]))
  await check('header controls keep to one line', headerLines.every(([, h]) => h <= 48), JSON.stringify(headerLines))

  // ── Localities and property types: real counts, real pages ───────────
  const localityTiles = await page.locator('ul.locality-tiles a').evaluateAll((links) => links.map((l) => ({
    href: l.getAttribute('href'), text: l.textContent, top: Math.round(l.getBoundingClientRect().top), height: l.getBoundingClientRect().height,
  })))
  await check('twelve popular localities, each a link to its results', localityTiles.length === 12 && localityTiles.every((t) => /^\/buy\/kolkata\/[a-z-]+$/.test(t.href)))
  await check('on a phone they sit in two rows that scroll together', new Set(localityTiles.map((t) => t.top)).size === 2 && await page.locator('ul.locality-tiles').evaluate((ul) => ul.scrollWidth > ul.clientWidth))
  await check('every locality tile is at least 44px tall', localityTiles.every((t) => t.height >= 44))
  const typeTiles = await page.locator('ul.type-tiles a').evaluateAll((links) => links.map((l) => ({ href: l.getAttribute('href'), text: l.textContent })))
  await check('five property types, each a link to its landing page',
    JSON.stringify(typeTiles.map((t) => t.href)) === JSON.stringify(['/buy/kolkata/flats', '/buy/kolkata/independent-houses', '/buy/kolkata/builder-floors', '/buy/kolkata/villas', '/buy/kolkata/studio-apartments']))
  const counted = [...localityTiles, ...typeTiles].filter((t) => /\d+ for sale/.test(t.text))
  const checker = await open(390, 844)
  for (const tile of counted) {
    const claimed = Number(tile.text.match(/(\d+) for sale/)[1])
    await checker.goto(base + tile.href)
    const shown = await resultCount(checker)
    await check(`"${tile.text.replace(/(\d+ for sale)/, ' — $1')}" matches its results page`, claimed === shown, `${shown} on the page`)
  }
  await checker.context().close()
  await check('a place or type with nothing listed says Explore, never 0', [...localityTiles, ...typeTiles].every((t) => !/\b0 for sale/.test(t.text)))

  const all = page.locator('details.all-localities')
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
  const invented = ['RERA', 'Recommended', 'Offer', 'Demand', 'FREE', 'Verified', 'Trending'].filter((word) => new RegExp(`\\b${word}`, 'i').test(body))
  await check('no projects, RERA badges, offers or demand figures the product cannot back', invented.length === 0, invented.join(', '))
  // The calculators are real (Phase 40A), so the homepage may point at them.
  const plan = await page.locator('section[aria-labelledby="plan-purchase"] a').evaluateAll((links) => links.map((l) => l.getAttribute('href')))
  await check('the plan-your-purchase section links to both working calculators', JSON.stringify(plan) === JSON.stringify(['/calculators/budget', '/calculators/emi']), JSON.stringify(plan))
  await page.context().close()

  // ── Desktop ──────────────────────────────────────────────────────────
  const desk = await open(1280, 900)
  await home(desk)
  await check('desktop: the quick routes give way to the header', !(await desk.getByRole('navigation', { name: 'Quick routes' }).isVisible()) &&
    JSON.stringify(await desk.locator('header nav a').allInnerTexts()) === JSON.stringify(['Home', 'Buy', 'Rent', 'Localities']) &&
    await desk.locator('header').getByRole('link', { name: 'Post property' }).isVisible())
  const grid = await desk.locator('ul.listing-rail').evaluateAll((uls) => uls.map((ul) => ({
    display: getComputedStyle(ul).display,
    scrolls: ul.scrollWidth > ul.clientWidth,
    shown: [...ul.children].filter((li) => li.offsetParent).length,
    rows: new Set([...ul.children].filter((li) => li.offsetParent).map((li) => Math.round(li.getBoundingClientRect().top))).size,
  })))
  await check('desktop: each rail is a single row of four, not a scroller', grid.every((g) => g.display === 'grid' && !g.scrolls && g.shown === 4 && g.rows === 1), JSON.stringify(grid))

  // Localities has no page of its own yet (Phases 29–30): from anywhere,
  // the header link opens the homepage's localities, below the header.
  await desk.goto(base + '/buy/kolkata', { waitUntil: 'load' })
  await desk.locator('header nav').getByRole('link', { name: 'Localities' }).click()
  await desk.waitForURL((url) => url.pathname === '/' && url.hash === '#localities')
  await desk.locator('#localities').waitFor()
  await desk.waitForTimeout(500)
  const landed = await desk.evaluate(() => ({
    section: Math.round(document.querySelector('#localities').getBoundingClientRect().top),
    header: Math.round(document.querySelector('header').getBoundingClientRect().bottom),
  }))
  await check('desktop: Localities in the header opens the localities from another page, below the header', landed.section >= landed.header - 1 && landed.section <= landed.header + 32, JSON.stringify(landed))
  await home(desk)

  // The locality dropdown hangs over the first rail: it must paint on top.
  const combo = desk.getByRole('combobox')
  await combo.click()
  await combo.fill('sa')
  const listbox = desk.getByRole('listbox')
  await listbox.waitFor()
  const reach = await listbox.evaluate((list) => {
    const r = list.getBoundingClientRect()
    const rail = document.querySelector('.listing-rail').getBoundingClientRect()
    return {
      overlapsContent: r.bottom > document.querySelector('.home-content').getBoundingClientRect().top,
      points: [0.25, 0.5, 0.9].map((f) => list.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height * f))),
      railTop: rail.top, listBottom: r.bottom,
    }
  })
  await check('desktop: the open locality list paints over the page below it', reach.overlapsContent && reach.points.every(Boolean), JSON.stringify(reach))
  await combo.fill('')

  // Keyboard: from the search field onward, every stop is visibly focused.
  await combo.focus()
  await desk.keyboard.press('Tab')
  let ring = await focusRing(desk)
  await check('desktop: Tab reaches More filters with a visible focus ring', /More filters/.test(ring?.text) && ring.visible, JSON.stringify(ring))
  await desk.keyboard.press('Tab')
  ring = await focusRing(desk)
  await check('desktop: then Search, with a visible focus ring', /^Search/.test(ring?.text) && ring.visible, JSON.stringify(ring))
  await desk.keyboard.press('Tab')
  await desk.keyboard.press('Tab')
  const cardFocus = await desk.evaluate(() => {
    const a = document.activeElement
    const card = a?.closest('article')
    return { href: a?.getAttribute('href'), outline: card ? getComputedStyle(card).outlineStyle : null }
  })
  await check('desktop: then the first listing, whose whole card shows the focus', cardFocus.href?.startsWith('/property/') && cardFocus.outline === 'solid', JSON.stringify(cardFocus))
  await desk.getByRole('form', { name: 'Search properties' }).getByRole('button', { name: /^More filters/ }).click()
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
  for (const width of [390, 412, 768, 1280]) {
    const p = await open(width, 900)
    await home(p)
    await check(`${width}px: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
    await p.context().close()
  }

  await check('nothing is fetched from another origin', foreign.length === 0, foreign.slice(0, 3).join(', '))
  await check('no script errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}

console.log(`${passed} passed, 0 failed`)
