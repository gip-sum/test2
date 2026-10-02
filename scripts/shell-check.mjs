// Phase E shell: six-item reference bar, split menu, public guest Activity,
// keyboard/focus safety, truthful links, responsive sizing and desktop panels.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
let passed = 0
function check(label, ok, detail = '') { if (!ok) throw new Error(`FAIL ${label}: ${detail}`); passed++; console.log(`ok ${label}`) }
const links = new Set()
const errors = []
const FUTURE = /\b(commercial|plots?|land|projects?|agents?|builders?(?! floors?)|insights?|price trends?|compare|comparison|guides?|faqs?|my properties)\b/i
async function open(width, height, path) {
  const context = await browser.newContext({ viewport: { width, height } })
  const page = await context.newPage()
  await page.goto(base + path)
  await page.locator('header.app-bar').waitFor()
  await page.evaluate(() => document.fonts.ready)
  return page
}
const out = process.env.PHASE_E_SHOTS ?? '/tmp/gharbazaar-phase-e'
mkdirSync(out, { recursive: true })
try {
  for (const width of [360, 390, 412, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(base, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `${out}/home-${width}.png` })
    check(`${width}: no page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right > innerWidth+1 && getComputedStyle(e).position !== 'absolute').map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width})).slice(0,12))))
    check(`${width}: single h1`, await page.locator('h1').count() === 1)
    await page.screenshot({ path: `${out}/home-${width}.png` })
    const controls = await page.locator('header.app-bar a, header.app-bar button, .bar-item').evaluateAll(es => es.filter(e => e.getBoundingClientRect().width > 0).map(e => ({ n: e.textContent, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })))
    check(`${width}: shell touch targets`, controls.every(c => c.w >= 43.5 && c.h >= 43.5), JSON.stringify(controls))
    if (width < 1024) {
      const bar = page.getByRole('navigation', { name: 'Primary', exact: true })
      check(`${width}: bar order`, (await bar.locator('.bar-label').allTextContents()).join('|') === 'Home|Search|Sell/Rent|Videos|Activity|Menu')
      check(`${width}: home current`, await bar.getByRole('link', { name: 'Home', exact: true }).getAttribute('aria-current') === 'page')
      const trigger = bar.getByRole('button', { name: 'Menu', exact: true })
      await trigger.click()
      const dialog = page.getByRole('dialog', { name: 'All Categories' })
      await dialog.waitFor()
      await page.waitForFunction(() => document.querySelector('[data-app-root]')?.inert === true)
      check(`${width}: modal and inert background`, await page.locator('[data-app-root]').evaluate(e => e.inert) && await dialog.getAttribute('aria-modal') === 'true')
      check(`${width}: split menu proportions`, await dialog.locator('.reference-menu').evaluate(e => { const side = e.firstElementChild.getBoundingClientRect().width; return Math.abs(side / e.getBoundingClientRect().width - .29) < .02 }))
      await page.screenshot({ path: `${out}/menu-${width}.png` })
      for (const name of ['Buy Residential', 'Rent a home', 'Localities', 'Budget & EMI', 'Activity & Account']) {
        const category = dialog.getByRole('button', { name, exact: true })
        await category.click()
        check(`${width}: ${name} selected`, await category.getAttribute('aria-pressed') === 'true')
        check(`${width}: ${name} has destinations`, await dialog.locator('#menu-category-content a').count() > 1)
        for (const href of await dialog.locator('a').evaluateAll(es => es.map(e => e.getAttribute('href')))) links.add(href)
        const small = await dialog.locator('a, button').evaluateAll(es => es.filter(e => e.getBoundingClientRect().width > 0).map(e => ({ text: e.textContent, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })).filter(e => e.w < 43.5 || e.h < 43.5))
        check(`${width}: ${name} menu touch targets`, small.length === 0, JSON.stringify(small))
        check(`${width}: ${name} no overflow`, await dialog.evaluate(e => e.scrollWidth <= e.clientWidth + 1))
      }
      await dialog.getByRole('button', { name: 'Buy Residential', exact: true }).click()
      await dialog.locator('.reference-menu-content').evaluate(e => e.scrollTop = e.scrollHeight)
      await page.screenshot({ path: `${out}/menu-scrolled-${width}.png` })
      for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); check(`${width}: focus stays inside menu`, await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))) }
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Menu' && !document.querySelector('[data-app-root]').inert)
      check(`${width}: Escape restores trigger`, await trigger.evaluate(e => e === document.activeElement))
      await trigger.click()
      await page.getByRole('dialog').getByRole('link', { name: 'Videos', exact: true }).first().click()
      await page.waitForURL('**/videos')
      check(`${width}: navigation closes menu`, await page.getByRole('dialog').count() === 0)
    } else {
      check('desktop hides phone bar', !await page.getByRole('navigation', { name: 'Primary', exact: true }).isVisible())
      for (const name of ['Buy', 'Rent', 'Localities', 'Home loans']) {
        const trigger = page.getByRole('button', { name: `More in ${name}`, exact: true })
        await trigger.focus(); await page.keyboard.press('Enter')
        check(`desktop ${name} panel opens`, await trigger.getAttribute('aria-expanded') === 'true')
        for (const href of await page.locator('.nav-panel a:visible').evaluateAll(es => es.map(e => e.getAttribute('href')))) links.add(href)
        await page.keyboard.press('Escape')
        check(`desktop ${name} closes and restores focus`, await trigger.evaluate(e => e === document.activeElement && e.getAttribute('aria-expanded') === 'false'))
      }
      await page.getByRole('button', { name: 'Explore all', exact: true }).click()
      check('desktop discovery panel opens', await page.locator('.nav-panel-hub').isVisible())
      for (const href of await page.locator('.nav-panel-hub a').evaluateAll(es => es.map(e => e.getAttribute('href')))) links.add(href)
    }
    await page.goto(base + '/account/activity', { waitUntil: 'load' })
    check(`${width}: guest Activity is public`, new URL(page.url()).pathname === '/account/activity' && await page.getByRole('heading', { name: 'Hello' }).isVisible())
    check(`${width}: guest login returns to Activity`, await page.getByRole('link', { name: 'Login/Register' }).getAttribute('href') === '/login?next=%2Faccount%2Factivity')
    check(`${width}: missing history is not zero`, !(await page.locator('.activity-summary').innerText()).includes('0'))
    check(`${width}: guest Activity no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.screenshot({ path: `${out}/activity-${width}.png` })
    await page.close()
  }
  // ── Desktop panels, by keyboard and pointer ──────────────────────────
  const panelHrefs = links
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

  }

  const hubHrefs = links
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

  const page = await browser.newPage()
  for (const path of ['/account', '/account/saved', '/account/enquiries', '/dashboard/enquiries', '/account/activity/private']) {
    await page.goto(base + path)
    const u = new URL(page.url())
    check(`${path} stays protected`, u.pathname === '/login' && u.searchParams.get('next') === path)
  }
  for (const href of links) {
    if (!href?.startsWith('/')) continue
    const response = await page.request.get(base + href)
    check(`destination ${href}`, response.status() < 400, String(response.status()))
    if (/^\/(buy|rent)\//.test(href)) {
      const html = await response.text()
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
      const url = canonical && new URL(canonical)
      check(`canonical destination ${href}`, url && url.pathname + url.search === href && !/<meta name="robots" content="noindex/.test(html))
    }
  }
  check('no browser errors', errors.length === 0, errors.join('\n'))
  console.log(`\n${passed} shell checks passed. Screenshots: ${out}`)
} finally { await browser.close() }
