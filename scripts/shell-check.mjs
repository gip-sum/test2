// Browser assertions for the marketplace shell (Phase A: components/navigation,
// the quick routes, lib/navigation/marketplace.ts).
//
// Measures what the screenshots can only suggest:
//  • each header tier at its widths — phone (logo, account, menu), tablet
//    (condensed nav), desktop (panels, Post property) — on one row, with no
//    overflow and no label broken over two lines;
//  • Post property once per screen (header from 1024px, bottom bar below);
//  • 44px targets and a visible focus ring on every shell control;
//  • the disclosure panels by keyboard: Enter opens, Escape closes and
//    returns focus, focus leaving closes, another panel replaces it, a click
//    outside closes it;
//  • the menu sheet from both of its triggers: modal, focus kept inside,
//    Escape returns focus, a link closes it;
//  • where-you-are by aria-current and by shape and weight, never colour
//    alone — in the header, the bottom bar and the menu;
//  • every navigation link resolves, and nothing links to a destination the
//    product does not have (projects, agents, builders, insights).
//
// Phase C, the discovery hub (components/navigation/hub.tsx), in both of
// its forms — the phone and tablet menu and the desktop "Explore all" panel:
//  • its groups and heading levels, in order, and no empty Resources group;
//  • posting set apart in the supply accent, on the menu's first screen;
//  • pills named in full for a screen reader, and 44px targets throughout;
//  • the desktop panel's keyboard and pointer behaviour, and that it fits
//    beneath the header at 1024×768 without overflowing the page;
//  • nothing unbuilt offered — commercial, plots, comparison, guides, FAQs
//    as well as Phase A's list;
//  • every hub link resolves, and the page it opens names that same URL as
//    its canonical, so the navigation never links a duplicate address.
//
// Usage: npm run build && npm run start, then npm run shell-check
import { chromium } from 'playwright-core'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
let passed = 0
function check(label, condition, detail = '') {
  if (!condition) throw new Error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  passed++
  console.log(`ok ${label}`)
}
async function open(width, height, path = '/') {
  const phone = width < 768
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone })
  const page = await context.newPage()
  await page.goto(base + path, { waitUntil: 'load' })
  // Results pages stream in behind a loading skeleton that has no header.
  await page.locator('header.app-bar').waitFor()
  await page.evaluate(() => document.fonts.ready)
  return page
}

/** Everything interactive in the shell that is on screen, with its box. */
const shellControls = (page) => page.evaluate(() => {
  const roots = ['header.app-bar', 'nav.fixed[aria-label="Primary"]', 'nav[aria-label="Quick routes"]']
  return roots.flatMap((sel) => [...document.querySelectorAll(`${sel} a, ${sel} button`)])
    .filter((el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden')
    .map((el) => { const r = el.getBoundingClientRect(); return { name: (el.getAttribute('aria-label') || el.textContent).trim().replace(/\s+/g, ' '), w: r.width, h: r.height, top: r.top, bottom: r.bottom } })
})
const visibleText = (page, sel) => page.locator(sel).evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.textContent.trim()))

try {
  // Destinations with no page yet. "Builder floors" is a property type, not a builder directory.
  const FUTURE = /\b(commercial|plots?|land|projects?|agents?|builders?(?! floors?)|insights?|price trends?|compare|comparison|guides?|faqs?|my properties)\b/i

  // ── The tiers, at every width ─────────────────────────────────────────
  for (const [width, height] of [[360, 740], [390, 844], [412, 915], [768, 1024], [1024, 768], [1280, 900]]) {
    const w = `${width}px`
    for (const path of ['/', '/buy/kolkata']) {
      const page = await open(width, height, path)
      const where = `${w} ${path}`
      const layout = await page.evaluate(() => {
        const header = document.querySelector('header.app-bar')
        const kids = [...header.querySelectorAll('a, button')].filter((el) => el.offsetParent !== null)
        const centres = kids.map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2 })
        const wrapped = [...header.querySelectorAll('.nav-top, a, button')].filter((el) => el.offsetParent !== null && el.textContent.trim())
          // Text lines only: an icon beside a label (Explore all) has a box
          // of its own at a different top, which is not a wrapped label.
          .filter((el) => {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
            const tops = new Set()
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              if (!node.textContent.trim() || node.parentElement.closest('.sr-only')) continue
              const range = document.createRange(); range.selectNodeContents(node)
              for (const r of range.getClientRects()) tops.add(Math.round(r.top))
            }
            return tops.size > 1
          })
          .map((el) => el.textContent.trim())
        return {
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          headerHeight: header.getBoundingClientRect().height,
          spread: Math.max(...centres) - Math.min(...centres),
          wrapped,
        }
      })
      check(`${where}: no horizontal overflow`, !layout.overflow)
      check(`${where}: the header is one row (${Math.round(layout.headerHeight)}px), no label broken over two lines`,
        layout.headerHeight <= 82 && layout.spread < 2 && layout.wrapped.length === 0, JSON.stringify(layout))

      const header = page.locator('header.app-bar')
      const navVisible = await header.getByRole('navigation', { name: 'Marketplace' }).isVisible()
      const menu = await header.getByRole('button', { name: 'Menu' }).isVisible()
      const headerPost = await header.getByRole('link', { name: 'Post property' }).isVisible()
      const barPost = await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Post' }).isVisible()
      const tops = await visibleText(page, 'header.app-bar .nav-top')
      const toggles = await header.getByRole('button', { name: /^More in / }).evaluateAll((els) => els.filter((e) => e.offsetParent !== null).length)
      const hubToggle = await header.getByRole('button', { name: 'Explore all' }).isVisible()
      if (width < 768) {
        check(`${where}: phone header is logo, account and menu — no row of text links`,
          !navVisible && menu && await header.getByRole('link', { name: /home$/ }).isVisible() && await header.getByRole('link', { name: /^(Log in|Account)$/ }).isVisible())
      } else if (width < 1024) {
        check(`${where}: tablet header is a condensed nav (${tops.join(', ')}) plus account and menu, no panels`,
          navVisible && JSON.stringify(tops) === JSON.stringify(['Buy', 'Rent', 'Localities']) && toggles === 0 && !hubToggle && menu)
      } else {
        check(`${where}: desktop header has the four sections with their panels, Explore all, and no menu button`,
          navVisible && JSON.stringify(tops) === JSON.stringify(['Buy', 'Rent', 'Localities', 'Home loans']) && toggles === 4 && hubToggle && !menu)
      }
      check(`${where}: Post property appears once (${headerPost ? 'header' : 'bottom bar'})`, headerPost !== barPost)
      if (path === '/buy/kolkata' || width >= 1024) {
        // The results page has no quick routes; the homepage's are hidden from 1024px.
      }

      const controls = await shellControls(page)
      const small = controls.filter((c) => c.w < 44 - 0.5 || c.h < 44 - 0.5)
      check(`${where}: every shell control is at least 44×44 (${controls.length} checked)`, small.length === 0, JSON.stringify(small))
      const names = await page.evaluate(() => [...document.querySelectorAll('header.app-bar a, header.app-bar button, nav a, nav button')].filter((el) => el.offsetParent !== null).map((el) => el.getAttribute('aria-label') || el.textContent))
      check(`${where}: nothing offers a destination the product has not built`, !names.some((n) => FUTURE.test(n ?? '')), JSON.stringify(names.filter((n) => FUTURE.test(n ?? ''))))
      const landmarks = await page.evaluate(() => [...document.querySelectorAll('nav')].filter((n) => n.offsetParent !== null || getComputedStyle(n).position === 'fixed' && n.getBoundingClientRect().height > 0).map((n) => n.getAttribute('aria-label')))
      check(`${where}: navigation landmarks have unique names (${landmarks.join(', ')})`, landmarks.every(Boolean) && new Set(landmarks).size === landmarks.length)
      await page.context().close()
    }
  }

  // ── Quick routes: the same four, one look, and View all ──────────────
  {
    const page = await open(390, 844)
    const quick = page.getByRole('navigation', { name: 'Quick routes' })
    const tiles = await quick.locator('.quick-route').evaluateAll((els) => els.map((el) => {
      const icon = el.querySelector('.quick-icon').getBoundingClientRect()
      return { label: el.querySelector('.quick-label').textContent, bg: getComputedStyle(el.querySelector('.quick-icon')).backgroundColor, iconTop: Math.round(icon.top), card: getComputedStyle(el).backgroundColor }
    }))
    check('390px quick routes keep Buy, Rent, Localities, Post property', JSON.stringify(tiles.map((t) => t.label)) === JSON.stringify(['Buy', 'Rent', 'Localities', 'Post property']))
    check('390px the three ways to find a home share one look; Post keeps the supply tint',
      new Set(tiles.slice(0, 3).map((t) => t.bg)).size === 1 && tiles[3].bg !== tiles[0].bg && new Set(tiles.map((t) => t.card)).size === 1, JSON.stringify(tiles))
    check('390px the tiles\' icons line up, even where a label wraps', new Set(tiles.map((t) => t.iconTop)).size === 1, JSON.stringify(tiles.map((t) => t.iconTop)))
    const viewAll = quick.getByRole('button', { name: 'View all destinations' })
    await viewAll.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: /^Explore / })
    await dialog.waitFor()
    check('390px View all opens the marketplace menu', await dialog.getByRole('navigation', { name: 'All destinations' }).isVisible())
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    check('390px Escape closes it and returns focus to View all', await viewAll.evaluate((el) => el === document.activeElement))
    await page.context().close()
    const desk = await open(1280, 900)
    check('1280px the quick routes give way to the header', !(await desk.getByRole('navigation', { name: 'Quick routes' }).isVisible()))
    await desk.context().close()
  }

  // ── The menu sheet ────────────────────────────────────────────────────
  const menuHrefs = new Set()
  {
    const page = await open(390, 844, '/calculators/emi')
    const trigger = page.locator('header.app-bar').getByRole('button', { name: 'Menu' })
    check('390px the menu button says it opens a dialog', await trigger.getAttribute('aria-haspopup') === 'dialog' && await trigger.getAttribute('aria-expanded') === 'false')
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: /^Explore / })
    await dialog.waitFor()
    // Modal without aria-modal: the page behind is inert (components/ui/Sheet
    // explains why Radix's aria-hidden alone left it readable).
    check('390px the menu is modal and titled: the page behind is inert while it is open',
      await page.locator('[data-app-root]').evaluate((el) => el.inert === true) && /^Explore \S/.test(await dialog.getAttribute('aria-label') ?? await page.evaluate(() => document.getElementById(document.querySelector('[role="dialog"]').getAttribute('aria-labelledby'))?.textContent ?? '')))
    for (const a of await dialog.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) menuHrefs.add(a)
    const current = await dialog.locator('a[aria-current="page"]').evaluateAll((els) => els.map((e) => e.textContent))
    check('390px on the EMI calculator, the menu marks that calculator "You are here" — in words, not only colour',
      current.length === 1 && /EMI calculator/.test(current[0]) && /You are here/.test(current[0]), JSON.stringify(current))
    let escaped = false
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab')
      if (!(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))) { escaped = true; break }
    }
    check('390px Tab stays inside the open menu', !escaped)
    const names = await dialog.locator('a').evaluateAll((els) => els.map((e) => e.textContent.trim()))
    check('390px the menu reaches every part of the marketplace', ['Home', 'Buy', 'Rent', 'Post a property', 'Enquiries on your listings', 'Localities in', 'How much home', 'Home loan EMI', 'Saved homes', 'Your enquiries', 'Profile and preferences']
      .every((n) => names.some((x) => x.startsWith(n))), JSON.stringify(names.slice(0, 14)))
    check('390px the menu offers nothing the product does not have', !names.some((n) => FUTURE.test(n)))
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    check('390px Escape returns focus to the menu button, and the page is no longer inert',
      await trigger.evaluate((el) => el === document.activeElement) && await page.locator('[data-app-root]').evaluate((el) => el.inert === false))
    await page.context().close()

    const home = await open(390, 844, '/')
    await home.locator('header.app-bar').getByRole('button', { name: 'Menu' }).click()
    await home.getByRole('dialog').getByRole('link', { name: /^Localities in/ }).click()
    await home.waitForFunction(() => location.hash === '#localities')
    await home.waitForTimeout(300)
    check('390px a menu link closes the menu as it goes (Localities, in place on the homepage)', await home.getByRole('dialog').count() === 0)
    await home.context().close()

    const post = await open(390, 844, '/post')
    check('390px where the bottom bar is hidden (/post), the header menu still reaches everything',
      !(await post.getByRole('navigation', { name: 'Primary' }).isVisible()) && await post.locator('header.app-bar').getByRole('button', { name: 'Menu' }).isVisible())
    await post.context().close()
  }

  // ── Desktop panels, by keyboard and pointer ──────────────────────────
  const panelHrefs = new Set()
  {
    const page = await open(1280, 900, '/buy/kolkata')
    const nav = page.locator('header.app-bar').getByRole('navigation', { name: 'Marketplace' })
    const toggle = (name) => nav.getByRole('button', { name: `More in ${name}` })
    for (const name of ['Buy', 'Rent', 'Localities', 'Home loans']) {
      const t = toggle(name)
      const id = await t.getAttribute('aria-controls')
      check(`1280px "More in ${name}" controls a panel that is hidden while closed`,
        await t.getAttribute('aria-expanded') === 'false' && await page.locator(`#${id}`).evaluate((el) => el.hidden && el.offsetParent === null))
    }
    // Keyboard: from the Buy link, Tab to its toggle, Enter opens, Tab goes into the panel.
    await nav.getByRole('link', { name: 'Buy', exact: true }).focus()
    await page.keyboard.press('Tab')
    check('1280px Tab from Buy reaches its toggle next', await toggle('Buy').evaluate((el) => el === document.activeElement))
    const ring = await toggle('Buy').evaluate((el) => getComputedStyle(el).outlineStyle)
    check('1280px the focused toggle shows a focus ring', ring !== 'none', ring)
    await page.keyboard.press('Enter')
    const buyPanel = page.locator('#nav-panel-buy')
    check('1280px Enter opens the Buy panel', await toggle('Buy').getAttribute('aria-expanded') === 'true' && await buyPanel.isVisible())
    await page.keyboard.press('Tab')
    check('1280px Tab moves into the open panel, to its lead link', await page.evaluate(() => document.activeElement?.closest('#nav-panel-buy') !== null && /All homes for sale/.test(document.activeElement.textContent)))
    for (const a of await buyPanel.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) panelHrefs.add(a)
    await page.keyboard.press('Escape')
    check('1280px Escape closes it and returns focus to its toggle', !(await buyPanel.isVisible()) && await toggle('Buy').evaluate((el) => el === document.activeElement))
    // Another panel replaces the open one.
    await toggle('Rent').click()
    await toggle('Localities').click()
    check('1280px opening Localities closes Rent', !(await page.locator('#nav-panel-rent').isVisible()) && await page.locator('#nav-panel-localities').isVisible())
    for (const a of await page.locator('#nav-panel-localities a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) panelHrefs.add(a)
    const pills = await page.locator('#nav-panel-localities .nav-pill').evaluateAll((els) => els.map((e) => e.textContent))
    check('1280px each locality\'s Buy and Rent links say which locality to a screen reader', pills.length > 0 && pills.every((t) => / in \S/.test(t)), JSON.stringify(pills.slice(0, 4)))
    // A click outside closes.
    await page.mouse.click(640, 700)
    check('1280px a click outside closes the panel', !(await page.locator('#nav-panel-localities').isVisible()))
    // Focus leaving the navigation closes.
    await toggle('Home loans').click()
    for (const a of await page.locator('#nav-panel-loans a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) panelHrefs.add(a)
    await page.locator('header.app-bar').getByRole('link', { name: 'Post property' }).focus()
    check('1280px focus leaving the navigation closes the panel', !(await page.locator('#nav-panel-loans').isVisible()))
    await toggle('Rent').click()
    for (const a of await page.locator('#nav-panel-rent a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) panelHrefs.add(a)
    // A panel link navigates and the panel is gone on the new page.
    await page.locator('#nav-panel-rent').getByRole('link', { name: /^All homes to rent/ }).click()
    await page.waitForURL((url) => url.pathname === '/rent/kolkata')
    check('1280px a panel link navigates, and the panel does not stay open on the new page', !(await page.locator('#nav-panel-rent').isVisible()))
    const texts = await page.locator('header.app-bar nav a, header.app-bar nav button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.textContent))
    check('1280px the panels offer nothing the product does not have', !texts.some((t) => FUTURE.test(t ?? '')))
    await page.context().close()
  }

  // ── Where you are: aria-current, and a shape and a weight ───────────
  {
    const page = await open(1280, 900, '/buy/kolkata')
    const mark = (name) => page.locator('header.app-bar .nav-top', { hasText: name }).evaluate((el) => ({
      current: el.getAttribute('aria-current'),
      bar: getComputedStyle(el, '::after').content !== 'none' ? getComputedStyle(el, '::after').height : null,
      weight: Number(getComputedStyle(el).fontWeight),
    }))
    const buy = await mark('Buy')
    const rent = await mark('Rent')
    check('1280px on /buy/kolkata, Buy is the current page — with an underline bar and a heavier weight, not only colour',
      buy.current === 'page' && buy.bar === '2px' && buy.weight > rent.weight && rent.current === null && rent.bar === null, JSON.stringify({ buy, rent }))
    await page.goto(`${base}/buy/kolkata/2-bhk`)
    await page.locator('header.app-bar').waitFor()
    check('1280px deeper in the section (/buy/kolkata/2-bhk), Buy is marked as the current section', (await mark('Buy')).current === 'true')
    await page.goto(`${base}/calculators/emi`)
    await page.locator('header.app-bar').waitFor()
    check('1280px on a calculator, Home loans is marked', (await mark('Home loans')).current === 'true')
    await page.context().close()

    const phone = await open(390, 844, '/')
    const items = await phone.getByRole('navigation', { name: 'Primary' }).getByRole('link').evaluateAll((els) => els.map((el) => {
      const pill = el.querySelector('span.rounded-full')
      const label = el.lastElementChild
      return { name: el.textContent.trim(), current: el.getAttribute('aria-current'), pill: pill ? getComputedStyle(pill).backgroundColor : null, weight: Number(getComputedStyle(label).fontWeight) }
    }))
    const homeItem = items.find((i) => i.name === 'Home')
    const others = items.filter((i) => i.name !== 'Home' && i.name !== 'Post')
    check('390px bottom bar: the six items, in order', JSON.stringify(items.map((i) => i.name)) === JSON.stringify(['Home', 'Search', 'Saved', 'Post', 'Enquiries', 'Account']))
    check('390px bottom bar: Home is current by a filled pill and a bold label, not only colour',
      homeItem.current === 'page' && homeItem.pill !== 'rgba(0, 0, 0, 0)' && homeItem.weight >= 700 &&
      others.every((i) => i.current === null && i.pill === 'rgba(0, 0, 0, 0)' && i.weight < 700), JSON.stringify(items))
    await phone.context().close()
  }

  // ── The discovery hub: the phone and tablet menu ────────────────────
  const hubHrefs = new Set()
  for (const [width, height] of [[390, 844], [412, 915], [768, 1024]]) {
    const w = `${width}px`
    const page = await open(width, height, '/')
    await page.locator('header.app-bar').getByRole('button', { name: 'Menu' }).click()
    const dialog = page.getByRole('dialog', { name: /^Explore / })
    await dialog.waitFor()
    const shape = await dialog.evaluate((d) => {
      const scroller = d.querySelector('.overflow-y-auto')
      const rect = (el) => el.getBoundingClientRect()
      const post = d.querySelector('.hub-post')
      return {
        title: d.querySelector('h2')?.textContent,
        h3: [...d.querySelectorAll('h3')].map((h) => h.textContent),
        h4: [...d.querySelectorAll('h4')].map((h) => h.textContent),
        other: d.querySelectorAll('h1, h5, h6').length,
        overflow: scroller.scrollWidth > scroller.clientWidth || d.scrollWidth > d.clientWidth,
        fullScreen: Math.round(rect(d).width) === innerWidth && Math.round(rect(d).height) === innerHeight,
        postTop: rect(post).top,
        postFill: getComputedStyle(post.querySelector('.hub-post-icon')).backgroundColor,
        rowFill: getComputedStyle(d.querySelector('.hub-link .hub-icon, .hub-tile .hub-icon')).backgroundColor,
        supply: getComputedStyle(document.documentElement).getPropertyValue('--color-supply-600').trim(),
        columns: new Set([...d.querySelectorAll('.hub-col')].map((c) => Math.round(rect(c).left))).size,
      }
    })
    check(`${w} menu: titled h2, then the groups as h3 in order, popular localities an h4 — no level skipped`,
      /^Explore \S/.test(shape.title) && shape.other === 0 && JSON.stringify(shape.h3) === JSON.stringify(['Explore property', 'Sell or let out', 'Property types', 'Discover', 'Home loan tools', 'Your account'])
      && JSON.stringify(shape.h4) === JSON.stringify(['Popular localities']), JSON.stringify(shape))
    check(`${w} menu: no Resources group while there is nothing real to put in it`, !shape.h3.some((h) => /resources|guides|faq/i.test(h)))
    check(`${w} menu: no horizontal overflow inside it`, !shape.overflow)
    if (width < 640) check(`${w} menu: fills the screen`, shape.fullScreen, JSON.stringify(shape))
    if (width >= 768) check(`${w} menu: two columns`, shape.columns === 2, String(shape.columns))
    check(`${w} menu: posting is on the first screen, in the supply fill, unlike every buyer row`,
      shape.postTop + 64 <= height && shape.postFill !== shape.rowFill && shape.postFill !== 'rgba(0, 0, 0, 0)', JSON.stringify(shape))
    const targets = await dialog.locator('a, button').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect(); return { name: el.textContent.trim().slice(0, 30) || el.getAttribute('aria-label'), w: r.width, h: r.height }
    }).filter((t) => t.w < 43.5 || t.h < 43.5))
    check(`${w} menu: every row, tile, pill and button is at least 44×44`, targets.length === 0, JSON.stringify(targets))
    const pills = await dialog.locator('.hub-pill').evaluateAll((els) => els.map((e) => e.textContent.trim()))
    check(`${w} menu: each pill is named in full ("Buy flats", "Rent in Salt Lake"), never a bare "Buy" (${pills.length})`,
      pills.length > 10 && pills.every((t) => /^(Buy|Rent|Explore) \S/.test(t)), JSON.stringify(pills.slice(0, 6)))
    for (const a of await dialog.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) hubHrefs.add(a)
    await page.context().close()
  }
  {
    // Where you are, inside the hub: a section, a pill, a whole-row link.
    const page = await open(390, 844, '/rent/kolkata/flats')
    await page.locator('header.app-bar').getByRole('button', { name: 'Menu' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    const marks = await dialog.locator('[aria-current]').evaluateAll((els) => els.map((e) => ({ v: e.getAttribute('aria-current'), t: e.textContent.trim(), bg: getComputedStyle(e.querySelector('.hub-pill-face') ?? e).backgroundColor })))
    const pill = marks.find((m) => m.t === 'Rent flats')
    const tile = marks.find((m) => m.t.startsWith('Rent'))
    check('390px on /rent/kolkata/flats the menu marks the Rent tile as the section and the "Rent flats" pill as the page, each by more than colour',
      marks.length === 2 && tile?.v === 'true' && /You are here/.test(tile.t) && pill?.v === 'page' && pill.bg !== 'rgb(255, 255, 255)', JSON.stringify(marks))
    await page.context().close()
  }

  // ── The discovery hub: desktop "Explore all" ─────────────────────────
  for (const [width, height] of [[1024, 768], [1280, 800]]) {
    const w = `${width}px`
    const page = await open(width, height, '/buy/kolkata/2-bhk')
    const nav = page.locator('header.app-bar').getByRole('navigation', { name: 'Marketplace' })
    const toggle = nav.getByRole('button', { name: 'Explore all' })
    const panel = page.locator('#nav-panel-hub')
    check(`${w} Explore all controls a panel that is hidden while closed`,
      await toggle.getAttribute('aria-expanded') === 'false' && await toggle.getAttribute('aria-controls') === 'nav-panel-hub' && await panel.evaluate((el) => el.hidden))
    await toggle.focus()
    await page.keyboard.press('Enter')
    check(`${w} Enter opens it`, await toggle.getAttribute('aria-expanded') === 'true' && await panel.isVisible())
    const box = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return {
        top: r.top, bottom: r.bottom, left: r.left, right: r.right, inner: el.scrollHeight > el.clientHeight,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        headerBottom: document.querySelector('header.app-bar').getBoundingClientRect().bottom,
        h2: [...el.querySelectorAll('h2')].map((h) => h.textContent), other: el.querySelectorAll('h1, h3, h4').length,
      }
    })
    check(`${w} the panel fits under the header, within the screen, with no inner scroll and no page overflow (${Math.round(box.bottom - box.top)}px tall)`,
      box.top <= box.headerBottom && box.bottom <= height && box.left >= 0 && box.right <= width && !box.inner && !box.overflow, JSON.stringify(box))
    check(`${w} the panel's groups are h2, in the page's own outline, in order`,
      box.other === 0 && JSON.stringify(box.h2) === JSON.stringify(['Explore property', 'Discover', 'Property types', 'Home loan tools', 'Popular localities', 'Sell or let out', 'Your account']), JSON.stringify(box.h2))
    await page.keyboard.press('Tab')
    check(`${w} Tab moves into the panel, to Buy`, await page.evaluate(() => document.activeElement?.closest('#nav-panel-hub') !== null && /^Buy/.test(document.activeElement.textContent)))
    const small = await panel.locator('a').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { t: el.textContent.trim().slice(0, 24), w: r.width, h: r.height } }).filter((t) => t.w < 43.5 || t.h < 43.5))
    check(`${w} every link in the panel is at least 44×44`, small.length === 0, JSON.stringify(small))
    const buyRow = await panel.locator('a.hub-link', { hasText: /^Buy/ }).evaluate((el) => ({ v: el.getAttribute('aria-current'), t: el.textContent }))
    check(`${w} deep in Buy (/buy/kolkata/2-bhk), the panel marks Buy as the section, in words`, buyRow.v === 'true' && /You are here/.test(buyRow.t), JSON.stringify(buyRow))
    const texts = await panel.locator('a, h2').evaluateAll((els) => els.map((e) => e.textContent))
    check(`${w} the panel offers nothing the product has not built`, !texts.some((t) => FUTURE.test(t)), JSON.stringify(texts.filter((t) => FUTURE.test(t))))
    for (const a of await panel.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) hubHrefs.add(a)
    await page.keyboard.press('Escape')
    check(`${w} Escape closes it and returns focus to Explore all`, !(await panel.isVisible()) && await toggle.evaluate((el) => el === document.activeElement))
    await nav.getByRole('button', { name: 'More in Buy' }).click()
    await toggle.click()
    check(`${w} opening Explore all closes the Buy panel`, await panel.isVisible() && !(await page.locator('#nav-panel-buy').isVisible()))
    await toggle.click()
    check(`${w} Explore all toggles closed`, !(await panel.isVisible()))
    await toggle.click()
    await page.mouse.click(width / 2, height - 10)
    check(`${w} a click outside closes it`, !(await panel.isVisible()))
    await toggle.click()
    await page.locator('header.app-bar').getByRole('link', { name: 'Post property' }).focus()
    check(`${w} focus leaving the navigation closes it`, !(await panel.isVisible()))
    await toggle.click()
    await panel.getByRole('link', { name: 'Rent flats' }).click()
    await page.waitForURL((url) => url.pathname === '/rent/kolkata/flats')
    check(`${w} a hub link navigates, and the panel does not stay open on the new page`, !(await panel.isVisible()))
    await page.context().close()
  }

  // ── Every navigation link resolves ───────────────────────────────────
  {
    const all = [...new Set([...menuHrefs, ...panelHrefs, ...hubHrefs])]
    const bad = []
    const duplicate = []
    let searches = 0
    for (const href of all) {
      const url = new URL(href, base)
      const res = await fetch(url, { redirect: 'follow' })
      if (res.status !== 200) bad.push(`${href} → ${res.status}`)
      const html = await res.text()
      if (url.hash === '#localities' && !html.includes('id="localities"')) bad.push(`${href} → no #localities`)
      // A results page names its canonical URL; the navigation must link
      // that one, or it mints a second address for the same page.
      if (/^\/(buy|rent)\//.test(url.pathname)) {
        searches++
        const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
        const at = canonical && new URL(canonical)
        if (!at || at.pathname + at.search !== href) duplicate.push(`${href} → canonical ${canonical}`)
        if (/<meta name="robots" content="noindex/.test(html)) duplicate.push(`${href} → noindex`)
      }
    }
    check(`every navigation link resolves (${all.length} from the panels, the menu and the hub)`, bad.length === 0 && all.length > 40, bad.join(', '))
    check(`every search link is its page's own canonical URL, and indexable (${searches})`, duplicate.length === 0 && searches > 30, duplicate.join(', '))
  }

  console.log(`\n${passed} passed, 0 failed`)
} finally {
  await browser.close()
}
