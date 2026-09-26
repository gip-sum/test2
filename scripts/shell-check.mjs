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
  const FUTURE = /\b(projects?|agents?|builders?(?! floors?)|insights?|price trends?)\b/i

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
          .filter((el) => { const range = document.createRange(); range.selectNodeContents(el); return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1 })
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
      if (width < 768) {
        check(`${where}: phone header is logo, account and menu — no row of text links`,
          !navVisible && menu && await header.getByRole('link', { name: /home$/ }).isVisible() && await header.getByRole('link', { name: /^(Log in|Account)$/ }).isVisible())
      } else if (width < 1024) {
        check(`${where}: tablet header is a condensed nav (${tops.join(', ')}) plus account and menu, no panels`,
          navVisible && JSON.stringify(tops) === JSON.stringify(['Buy', 'Rent', 'Localities']) && toggles === 0 && menu)
      } else {
        check(`${where}: desktop header has the four sections with their panels, and no menu button`,
          navVisible && JSON.stringify(tops) === JSON.stringify(['Buy', 'Rent', 'Localities', 'Home loans']) && toggles === 4 && !menu)
      }
      check(`${where}: Post property appears once (${headerPost ? 'header' : 'bottom bar'})`, headerPost !== barPost)
      if (path === '/buy/kolkata' || width >= 1024) {
        // The results page has no quick routes; the homepage's are hidden from 1024px.
      }

      const controls = await shellControls(page)
      const small = controls.filter((c) => c.w < 44 - 0.5 || c.h < 44 - 0.5)
      check(`${where}: every shell control is at least 44×44 (${controls.length} checked)`, small.length === 0, JSON.stringify(small))
      const names = await page.evaluate(() => [...document.querySelectorAll('header.app-bar a, header.app-bar button, nav a, nav button')].filter((el) => el.offsetParent !== null).map((el) => el.getAttribute('aria-label') || el.textContent))
      check(`${where}: nothing offers projects, agents, builders or insights`, !names.some((n) => FUTURE.test(n ?? '')), JSON.stringify(names.filter((n) => FUTURE.test(n ?? ''))))
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
    check('390px on the EMI calculator, the menu marks Home loans "You are here" — in words, not only colour',
      current.length === 1 && /Home loans/.test(current[0]) && /You are here/.test(current[0]), JSON.stringify(current))
    let escaped = false
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab')
      if (!(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))) { escaped = true; break }
    }
    check('390px Tab stays inside the open menu', !escaped)
    const names = await dialog.locator('a').evaluateAll((els) => els.map((e) => e.textContent.trim()))
    check('390px the menu reaches every part of the marketplace', ['Home', 'Buy', 'Rent', 'Localities', 'Home loans', 'Post a property', 'Saved homes', 'Your enquiries', 'Account']
      .every((n) => names.some((x) => x.startsWith(n))), JSON.stringify(names.slice(0, 14)))
    check('390px the menu offers nothing the product does not have', !names.some((n) => FUTURE.test(n)))
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    check('390px Escape returns focus to the menu button, and the page is no longer inert',
      await trigger.evaluate((el) => el === document.activeElement) && await page.locator('[data-app-root]').evaluate((el) => el.inert === false))
    await page.context().close()

    const home = await open(390, 844, '/')
    await home.locator('header.app-bar').getByRole('button', { name: 'Menu' }).click()
    await home.getByRole('dialog').getByRole('link', { name: /^Localities/ }).click()
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

  // ── Every navigation link resolves ───────────────────────────────────
  {
    const all = [...new Set([...menuHrefs, ...panelHrefs])]
    const bad = []
    for (const href of all) {
      const url = new URL(href, base)
      const res = await fetch(url, { redirect: 'follow' })
      if (res.status !== 200) bad.push(`${href} → ${res.status}`)
      if (url.hash === '#localities' && !(await res.text()).includes('id="localities"')) bad.push(`${href} → no #localities`)
    }
    check(`every navigation link resolves (${all.length} from the panels and the menu)`, bad.length === 0 && all.length > 20, bad.join(', '))
  }

  console.log(`\n${passed} passed, 0 failed`)
} finally {
  await browser.close()
}
