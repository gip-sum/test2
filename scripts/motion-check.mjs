// UI-04 animation system: the motion layer behaves, gets out of the way, and
// switches off for people who ask the OS for less motion. Every assertion
// reads computed style or the DOM; nothing here trusts a screenshot.
//
//   Sheet          enter/exit keyframes by width, focus trap, Escape, focus
//                  return, outside click, no overflow while it moves
//   Header panels  short entrance, instant exit, focus back to the toggle
//   Nested sheets  Escape during a child's exit reaches the parent
//   Lightbox       fade in and out, focus in and back
//   Tabs           indicator glides after a user change only (UI-05)
//   Results        enter after a filter change, never on server render (UI-06)
//   Gallery        a new photo fades into the frame; the old one never lingers
//   Property card  no hover lift on touch (Android stuck hover), press
//                  feedback, nothing left transformed after Back; lift kept
//                  for a real mouse
//   Skeleton       shimmer runs on a stable box (provoked by holding the
//                  route's RSC response)
//   Photos         fade into the reserved box (provoked by holding
//                  /_next/image), no layout shift, server HTML unmarked,
//                  visible with JavaScript off
//   Reduced motion all of the above with prefers-reduced-motion: reduce
import { chromium } from 'playwright-core'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
let passed = 0
function check(label, ok, detail = '') { if (!ok) throw new Error(`FAIL ${label}: ${detail}`); passed++; console.log(`ok ${label}`) }
const errors = []
const SEARCH = '/buy/kolkata'

async function open(path, options = {}) {
  const context = await browser.newContext({ viewport: { width: options.width ?? 390, height: 844 }, ...options.context })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  page.prefetched = new Set()
  // Next cancels a prefetch's stream once it holds the loading boundary, so
  // a completed prefetch usually ends as a failed request, not a finished one.
  const settled = (r) => { if (r.headers()['next-router-prefetch']) page.prefetched.add(new URL(r.url()).pathname) }
  page.on('requestfinished', settled)
  page.on('requestfailed', settled)
  if (options.before) await options.before(page)
  await page.goto(base + path, { waitUntil: options.waitUntil ?? 'load' })
  return page
}

// Watches document width on every frame from now until stop() — catches an
// overflow that exists only while something is moving.
const startOverflowWatch = (page) => page.evaluate(() => {
  window.__overflow = 0
  window.__watching = true
  const tick = () => {
    window.__overflow = Math.max(window.__overflow, document.documentElement.scrollWidth - innerWidth)
    if (window.__watching) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
const stopOverflowWatch = (page) => page.evaluate(() => { window.__watching = false; return window.__overflow })

const anim = (page, selector) => page.evaluate((s) => {
  const el = document.querySelector(s)
  if (!el) return null
  const cs = getComputedStyle(el)
  return { name: cs.animationName, duration: parseFloat(cs.animationDuration) * 1000, timing: cs.animationTimingFunction, opacity: cs.opacity }
}, selector)

const filtersButton = (page) => page.getByRole('button', { name: /^Filters/ }).first()
// Headless Chromium never sets :active from a synthetic touch (measured with
// Input.dispatchTouchEvent and Input.synthesizeTapGesture, on this page and
// on a bare <a>), so the pressed state is forced through DevTools. That still
// runs the real cascade — the (hover: none) gate, the reduced-motion
// override — which is what this check is for.
async function pressedTransform(page, selector) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
  await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] })
  const el = page.locator(selector).first()
  await el.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)))
  const transform = await el.evaluate((e) => getComputedStyle(e).transform)
  await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] })
  await el.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)))
  const released = await el.evaluate((e) => getComputedStyle(e).transform)
  await cdp.detach()
  return { transform, released }
}
// Next shows a route's loading.tsx at once only when the link was
// prefetched; the navigation's own RSC request is then held by the caller's
// route handler, so the skeleton stays up for as long as the check needs.
async function provokeLoading(page) {
  const path = '/buy/kolkata/2-bhk'
  const link = page.locator(`a[href="${path}"]:visible`).first()
  await link.scrollIntoViewIfNeeded()
  await link.hover()
  // Settled, not merely answered: the prefetch body streams, and the loading
  // boundary is usable only once that stream has ended.
  for (let i = 0; i < 100 && !page.prefetched.has(path); i++) await page.waitForTimeout(50)
  if (!page.prefetched.has(path)) throw new Error(`FAIL ${path} was never prefetched, so its skeleton cannot be provoked`)
  await link.click()
}
// The Buy / Rent tabs (components/ui/SmoothTabs.tsx, UI-05) inside the home
// search sheet, once the sheet has settled and the indicator is measured.
async function intentTabs(page) {
  await page.locator('.reference-search-trigger').click()
  const dialog = page.getByRole('dialog', { name: 'Find your home' })
  await dialog.waitFor()
  await dialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
  await page.waitForFunction(() => document.querySelector('[role=tablist][data-indicator]'))
  return dialog.getByRole('tablist', { name: 'Search intent' })
}
// Which tab the indicator pill covers right now (-1 for none).
const pillOver = (list) => list.evaluate((el) => {
  const pill = el.querySelector('span[aria-hidden]').getBoundingClientRect()
  return [...el.querySelectorAll('[role=tab]')].findIndex((t) => Math.abs(t.getBoundingClientRect().left - pill.left) < 1 && Math.abs(t.getBoundingClientRect().width - pill.width) < 1)
})
const focusInDialog = (page) => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))

try {
  // ── Sheet ─────────────────────────────────────────────────────────────
  for (const width of [320, 390, 768]) {
    const page = await open(SEARCH, { width })
    const trigger = filtersButton(page)
    await startOverflowWatch(page)
    await trigger.click()
    await page.waitForSelector('[data-sheet][data-state="open"]')
    const enter = await anim(page, '[data-sheet][data-state="open"]')
    const overlay = await anim(page, '.sheet-overlay[data-state="open"]')
    const expected = width >= 640 ? 'motion-pop-in' : 'motion-sheet-in'
    check(`${width}: Sheet enters with ${expected}, 300ms`, enter?.name === expected && Math.abs(enter.duration - 300) < 1, JSON.stringify(enter))
    check(`${width}: Sheet overlay fades in`, overlay?.name === 'motion-fade-in', JSON.stringify(overlay))
    await page.waitForFunction(() => document.querySelector('[data-sheet]')?.getAnimations().every((a) => a.playState === 'finished') ?? false)
    check(`${width}: Sheet settles fully opaque and in place`, await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('[data-sheet]'))
      return cs.opacity === '1' && cs.transform === 'none'
    }))
    check(`${width}: focus moves into the Sheet`, await focusInDialog(page))
    if (width >= 640) {
      // Centred dialog: the keyframe scale must not fight the -50% centring.
      const box = await page.locator('[data-sheet]').boundingBox()
      check(`${width}: Sheet is centred after its entrance`, Math.abs(box.x + box.width / 2 - width / 2) < 2, JSON.stringify(box))
    }
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
    check(`${width}: Tab stays inside the Sheet`, await focusInDialog(page))
    check(`${width}: page behind the Sheet is inert`, await page.evaluate(() => document.querySelector('[data-app-root]').inert))
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => document.querySelector('[data-sheet]')?.dataset.state === 'closed', null, { polling: 'raf' })
    const exit = await anim(page, '[data-sheet][data-state="closed"]')
    const exitName = width >= 640 ? 'motion-pop-out' : 'motion-sheet-out'
    check(`${width}: Escape plays ${exitName}, 200ms`, exit?.name === exitName && Math.abs(exit.duration - 200) < 1, JSON.stringify(exit))
    check(`${width}: a closing Sheet lets clicks through`, await page.evaluate(() => getComputedStyle(document.querySelector('[data-sheet]')).pointerEvents === 'none'))
    await page.locator('[data-sheet]').waitFor({ state: 'detached' })
    await page.waitForFunction(() => !document.querySelector('[data-app-root]').inert)
    await page.waitForFunction(() => /^Filters/.test(document.activeElement?.textContent?.trim() ?? ''))
    check(`${width}: focus returns to Filters after the exit`, true)
    check(`${width}: no horizontal overflow while the Sheet moves`, await stopOverflowWatch(page) <= 1)
    if (width >= 640) {
      await trigger.click()
      await page.waitForSelector('[data-sheet][data-state="open"]')
      await page.mouse.click(8, 8)
      await page.locator('[data-sheet]').waitFor({ state: 'detached' })
      await page.waitForFunction(() => /^Filters/.test(document.activeElement?.textContent?.trim() ?? ''))
      check(`${width}: outside click closes the Sheet and returns focus`, true)
    }
    await page.context().close()
  }

  // ── Header panels ─────────────────────────────────────────────────────
  {
    const page = await open('/', { width: 1280 })
    const nav = page.locator('header.app-bar').getByRole('navigation', { name: 'Marketplace' })
    const toggle = nav.getByRole('button', { name: 'More in Buy' })
    const panel = page.locator('#nav-panel-buy')
    await toggle.click()
    await panel.waitFor()
    const entering = await panel.evaluate((el) => el.getAnimations().map((a) => ({ p: a.transitionProperty, d: a.effect.getTiming().duration })))
    check('1280: header panel arrives with a 150ms opacity and transform transition', ['opacity', 'transform'].every((p) => entering.some((a) => a.p === p && a.d === 150)), JSON.stringify(entering))
    await page.waitForFunction(() => document.querySelector('#nav-panel-buy').getAnimations().length === 0)
    check('1280: header panel settles opaque and in place', await panel.evaluate((el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none'))
    await page.keyboard.press('Escape')
    check('1280: Escape removes the panel at once, with no exit transition', await panel.evaluate((el) => el.hidden && el.offsetParent === null && el.getAnimations().length === 0))
    check('1280: focus returns to the toggle', await toggle.evaluate((el) => el === document.activeElement))
    await page.context().close()
  }

  // ── Nested sheets ─────────────────────────────────────────────────────
  // The home search sheet opens the locality picker on top of itself. A
  // closing child stays mounted for its 200ms exit; Escape during that time
  // must reach the parent, not the leaving child.
  {
    const page = await open('/')
    const hero = page.getByRole('button', { name: 'Search a locality in Kolkata' })
    await hero.click()
    const parent = page.getByRole('dialog', { name: 'Find your home' })
    await parent.waitFor()
    // The field inside the sheet carries the same words as the hero trigger.
    const picker = parent.getByRole('button', { name: 'Search a locality in Kolkata' })
    await picker.click()
    await page.getByRole('dialog', { name: 'Where are you looking?' }).waitFor()
    await page.waitForFunction(() => document.querySelectorAll('[data-sheet][data-state="open"]').length === 2)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => document.querySelectorAll('[data-sheet]').length === 1)
    await page.waitForFunction(() => document.activeElement?.closest('[role="dialog"]') !== null && /Search a locality/.test(document.activeElement.textContent))
    check('nested: Escape closes only the picker and returns focus to its field', await parent.isVisible())
    await picker.click()
    await page.waitForFunction(() => document.querySelectorAll('[data-sheet][data-state="open"]').length === 2)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => document.querySelectorAll('[data-sheet][data-state="open"]').length === 1, null, { polling: 'raf' })
    await page.keyboard.press('Escape')
    await page.locator('[data-sheet]').first().waitFor({ state: 'detached' })
    await page.waitForFunction(() => document.querySelectorAll('[data-sheet]').length === 0 && !document.querySelector('[data-app-root]').inert)
    await page.waitForFunction(() => /Search a locality/.test(document.activeElement?.textContent ?? ''))
    check('nested: a second Escape during the picker\'s exit closes the parent and focus returns to the page', true)
    await page.context().close()
  }

  // ── Photo lightbox ────────────────────────────────────────────────────
  {
    const html = await (await fetch(base + SEARCH)).text()
    const page = await open(html.match(/href="(\/property\/[^"]+)"/)[1])
    const trigger = page.getByRole('button', { name: 'View full-screen gallery' })
    await trigger.click()
    await page.waitForSelector('.lightbox-layer[data-state="open"]')
    const names = await page.locator('.lightbox-layer').evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName))
    check('lightbox: overlay and photo fade in', names.length === 2 && names.every((n) => n === 'motion-fade-in'), JSON.stringify(names))
    check('lightbox: focus moves into it', await focusInDialog(page))
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => [...document.querySelectorAll('.lightbox-layer')].some((e) => e.dataset.state === 'closed'), null, { polling: 'raf' })
    const out = await page.locator('.lightbox-layer').evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName))
    check('lightbox: Escape fades it out', out.every((n) => n === 'motion-fade-out'), JSON.stringify(out))
    await page.locator('.lightbox-layer').first().waitFor({ state: 'detached' })
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'View full-screen gallery')
    check('lightbox: focus returns to the photo that opened it', true)
    await page.context().close()
  }

  // ── Tabs ──────────────────────────────────────────────────────────────
  {
    const page = await open('/')
    const list = await intentTabs(page)
    check('tabs: the indicator does not animate into place on first paint', await list.evaluate((el) => el.querySelector('span[aria-hidden]').getAnimations().length === 0 && getComputedStyle(el.querySelector('span[aria-hidden]')).transitionProperty === 'all' && getComputedStyle(el.querySelector('span[aria-hidden]')).transitionDuration === '0s'))
    await list.getByRole('tab', { name: 'Rent', exact: true }).click()
    const glide = await list.evaluate((el) => el.querySelector('span[aria-hidden]').getAnimations().map((a) => ({ p: a.transitionProperty, d: a.effect.getTiming().duration, e: a.effect.getTiming().easing })))
    check('tabs: a user change glides the indicator for 200ms on the standard curve', glide.some((a) => a.p === 'transform' && a.d === 200 && /0\.2, 0, 0, 1/.test(a.e)), JSON.stringify(glide))
    await list.evaluate((el) => Promise.all(el.querySelectorAll('[aria-hidden]')[0].getAnimations().map((a) => a.finished)))
    check('tabs: the indicator ends on Rent', await pillOver(list) === 1)
    await page.context().close()
  }

  // ── Results entrance (UI-06) ───────────────────────────────────────────
  // Server-rendered results never animate; results that arrive after a
  // filter change fade in, staggered and capped; the new chip arrives too.
  {
    const page = await open(SEARCH, { width: 1280 })
    await page.waitForFunction(() => document.querySelector('[data-enter]'))
    check('entrance: server-rendered results do not animate', await page.evaluate(() => [...document.querySelectorAll('.results-list > li')].every((li) => li.getAnimations().length === 0 && getComputedStyle(li).opacity === '1')))
    await page.evaluate(() => {
      window.__arrived = []
      new MutationObserver((records) => {
        for (const r of records) for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue
          const found = n.matches('.results-list > li, .active-filters > .chip-enter') ? [n] : [...n.querySelectorAll('.results-list > li, .active-filters > .chip-enter')]
          for (const el of found) requestAnimationFrame(() => window.__arrived.push({ chip: el.tagName === 'SPAN', timing: el.getAnimations().map((a) => ({ p: a.transitionProperty, d: a.effect.getTiming().duration, delay: a.effect.getTiming().delay })) }))
        }
      }).observe(document.body, { childList: true, subtree: true })
    })
    await page.locator('aside[aria-label="Filters"] button[aria-pressed]:has-text("2 BHK")').first().click()
    await page.waitForURL('**bhk=2**')
    await page.waitForTimeout(500)
    const arrived = await page.evaluate(() => window.__arrived)
    const items = arrived.filter((a) => !a.chip), chips = arrived.filter((a) => a.chip)
    check('entrance: new results fade in for 200ms', items.length > 0 && items.every((a) => a.timing.some((t) => t.p === 'opacity' && t.d === 200)), JSON.stringify(items.slice(0, 3)))
    check('entrance: the stagger is capped at 180ms', items.every((a) => a.timing.every((t) => t.delay <= 180)), JSON.stringify(items.map((a) => a.timing[0]?.delay)))
    check('entrance: the new filter chip arrives with a short fade', chips.length === 1 && chips[0].timing.some((t) => t.p === 'opacity'), JSON.stringify(chips))
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished)))
    check('entrance: every result ends fully opaque and in place', await page.evaluate(() => [...document.querySelectorAll('.results-list > li')].every((li) => getComputedStyle(li).opacity === '1' && getComputedStyle(li).transform === 'none')))
    await page.context().close()
  }

  // ── Gallery photo change (UI-06) ───────────────────────────────────────
  // With photos held back, Next must not leave the previous photo on screen
  // under a counter that already names the next one.
  {
    // The first listing in the results with more than one photo.
    const html = await (await fetch(base + SEARCH)).text()
    const hrefs = [...new Set([...html.matchAll(/href="(\/property\/[^"]+)"/g)].map((m) => m[1]))]
    let page
    for (const href of hrefs) {
      page = await open(href, { width: 1280 })
      if (await page.getByRole('button', { name: 'Next photo' }).count()) break
      await page.context().close()
    }
    let release
    const held = new Promise((r) => { release = r })
    const frame = page.getByRole('group', { name: /^Photos of/ })
    await frame.locator('img').first().waitFor()
    const first = await frame.locator('img').first().getAttribute('src')
    await page.route('**/_next/image**', async (route) => { await held; await route.continue() })
    await page.getByRole('button', { name: 'Next photo' }).click()
    const shown = await frame.locator('img').evaluateAll((els) => els.map((e) => ({ src: e.getAttribute('src'), fade: e.dataset.fade ?? null, opacity: getComputedStyle(e).opacity })))
    check('gallery: the previous photo leaves at once; the next waits transparent in the frame', shown.length === 1 && shown[0].src !== first && shown[0].fade === 'pending' && shown[0].opacity === '0', JSON.stringify(shown))
    release()
    await page.waitForFunction(() => document.querySelector('[aria-roledescription="carousel"] img')?.dataset.fade === 'in')
    check('gallery: and fades in when it arrives', true)
    await page.context().close()
  }

  // ── Property card on touch ────────────────────────────────────────────
  {
    const page = await open(SEARCH, { context: { hasTouch: true, isMobile: true } })
    check('touch: the device reports no hover', await page.evaluate(() => matchMedia('(hover: none)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches))
    const card = page.locator('.property-card').first()
    await card.scrollIntoViewIfNeeded()
    const rest = await card.evaluate((el) => ({ shadow: getComputedStyle(el).boxShadow, top: el.getBoundingClientRect().top }))
    // A tap leaves :hover set on Android. Reproduce that state and require
    // that it moves nothing.
    const box = await card.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + 40)
    check('touch: :hover on a card applies no lift and no shadow change', await card.evaluate((el, r) => el.matches(':hover') && getComputedStyle(el).transform === 'none' && getComputedStyle(el).boxShadow === r.shadow && getComputedStyle(el.querySelector('img')).transform === 'none', rest))
    const press = await pressedTransform(page, '.property-card')
    check('touch: pressing a card scales it slightly (0.985)', /^matrix\(0\.985, 0, 0, 0\.985, 0, 0\)$/.test(press.transform), JSON.stringify(press))
    check('touch: releasing the press restores the card', press.released === 'none', JSON.stringify(press))
    const href = await card.locator('a[href^="/property/"]').first().getAttribute('href')
    await card.locator('a[href^="/property/"]').first().tap()
    await page.waitForURL('**' + href)
    await page.goBack()
    await page.waitForURL('**' + SEARCH)
    await page.locator('.property-card').first().waitFor()
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.transitionProperty).map((a) => a.finished)))
    check('touch: after Back no card is left transformed or lifted', await page.locator('.property-card').evaluateAll((els, r) => els.every((el) => getComputedStyle(el).transform === 'none' && getComputedStyle(el).boxShadow === r.shadow), rest))
    await page.context().close()
  }

  // ── Property card with a mouse ────────────────────────────────────────
  {
    const page = await open(SEARCH, { width: 1280 })
    const card = page.locator('.property-card:visible').first()
    await card.hover()
    await card.evaluate((el) => Promise.all([el, el.querySelector('img')].flatMap((e) => e.getAnimations()).map((a) => a.finished)))
    const hovered = await card.evaluate((el) => ({ card: getComputedStyle(el).transform, img: getComputedStyle(el.querySelector('img')).transform }))
    check('1280: mouse hover still lifts the card 3px', hovered.card === 'matrix(1, 0, 0, 1, 0, -3)', JSON.stringify(hovered))
    check('1280: mouse hover still zooms the photo', /^matrix\(1\.03/.test(hovered.img), JSON.stringify(hovered))
    await page.context().close()
  }

  // ── Skeleton ──────────────────────────────────────────────────────────
  {
    let release
    const held = new Promise((r) => { release = r })
    const page = await open('/', {
      before: (p) => p.route('**/buy/kolkata/2-bhk**', async (route) => {
        const h = route.request().headers()
        if (h.rsc && !h['next-router-prefetch']) await held
        await route.continue()
      }),
    })
    await provokeLoading(page)
    const skeleton = page.locator('.skeleton').first()
    await skeleton.waitFor()
    const shimmer = await skeleton.evaluate((el) => {
      const after = getComputedStyle(el, '::after')
      return { name: after.animationName, duration: parseFloat(after.animationDuration) * 1000, count: after.animationIterationCount, overflow: getComputedStyle(el).overflow }
    })
    check('skeleton: shimmer runs (1.6s loop, clipped to the block)', shimmer.name === 'motion-shimmer' && shimmer.duration === 1600 && shimmer.count === 'infinite' && shimmer.overflow === 'hidden', JSON.stringify(shimmer))
    const rects = () => page.locator('.skeleton').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join() }).join('|'))
    const before = await rects()
    await page.waitForTimeout(900)
    check('skeleton: no block changes size or position while it shimmers', (await rects()) === before)
    check('skeleton: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    release()
    await page.waitForURL('**/buy/kolkata/2-bhk')
    await page.locator('.property-card').first().waitFor()
    await page.context().close()
  }

  // ── Photos ────────────────────────────────────────────────────────────
  {
    const html = await (await fetch(base + SEARCH)).text()
    check('photos: server HTML carries no fade mark', !html.includes('data-fade'))
    let release
    const held = new Promise((r) => { release = r })
    const page = await open(SEARCH, {
      waitUntil: 'domcontentloaded',
      before: async (p) => {
        await p.addInitScript(() => {
          window.__cls = 0
          new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
        })
        await p.route('**/_next/image**', async (route) => { await held; await route.continue() })
      },
    })
    const img = page.locator('.property-card img[data-fade="pending"]').first()
    await img.waitFor({ state: 'attached' })
    check('photos: a still-loading photo is transparent in its reserved box', await img.evaluate((el) => getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().height > 0))
    const handle = await img.elementHandle()
    const box = await handle.boundingBox()
    release()
    await handle.evaluate((el) => new Promise((done) => {
      if (el.dataset.fade === 'in') return done()
      new MutationObserver((_, o) => { if (el.dataset.fade === 'in') { o.disconnect(); done() } }).observe(el, { attributes: true })
    }))
    const fade = await handle.evaluate((el) => ({ property: getComputedStyle(el).transitionProperty, duration: getComputedStyle(el).transitionDuration, timing: getComputedStyle(el).transitionTimingFunction }))
    check('photos: when it arrives it fades in over 200ms on the enter curve', fade.property === 'opacity' && fade.duration === '0.2s' && /^cubic-bezier/.test(fade.timing), JSON.stringify(fade))
    await handle.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
    check('photos: and ends fully opaque', await handle.evaluate((el) => getComputedStyle(el).opacity === '1'))
    const after = await handle.boundingBox()
    check('photos: the photo arrives in exactly the box it reserved', ['x', 'y', 'width', 'height'].every((k) => Math.abs(box[k] - after[k]) < 0.5), JSON.stringify({ box, after }))
    const cls = await page.evaluate(() => window.__cls)
    check('photos: no layout shift while photos arrive (CLS < 0.01)', cls < 0.01, String(cls))
    await page.context().close()

    // A failed photo still reaches its fallback; the fade mark must not hide
    // it. Search cards (PropertyImage) and the property gallery (MediaPhoto).
    const property = html.match(/href="(\/property\/[^"]+)"/)[1]
    for (const [label, path] of [['search card', SEARCH], ['property gallery', property]]) {
      const broken = await open(path, { before: (p) => p.route('**/_next/image**', (route) => route.fulfill({ status: 404, body: '' })) })
      const fallback = broken.getByText('Image could not load').first()
      await fallback.waitFor()
      check(`photos: a failed ${label} photo still shows its fallback text`, await fallback.isVisible())
      await broken.context().close()
    }

    // Home and a property page render without streaming. (The search routes
    // do not: their loading.tsx makes the page a Suspense boundary that React
    // swaps in with JavaScript — a pre-existing property of those routes,
    // recorded in UI-04's risks, not something the fade introduced.)
    for (const path of ['/', property]) {
      const noJs = await open(path, { context: { javaScriptEnabled: false } })
      const photos = await noJs.locator('main img').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height > 0).map((e) => ({ fade: e.dataset.fade ?? null, opacity: getComputedStyle(e).opacity, loaded: e.complete && e.naturalWidth > 0 })))
      check(`no JavaScript (${path === '/' ? 'home' : 'property'}): photos load and show at full opacity`, photos.length > 0 && photos.every((ph) => ph.fade === null && ph.opacity === '1' && ph.loaded), JSON.stringify(photos))
      check(`no JavaScript (${path === '/' ? 'home' : 'property'}): the heading is visible`, await noJs.locator('h1').isVisible())
      await noJs.context().close()
    }
  }

  // ── Reduced motion ────────────────────────────────────────────────────
  {
    const reduced = { reducedMotion: 'reduce' }
    const page = await open(SEARCH, { context: { ...reduced, hasTouch: true, isMobile: true } })
    await filtersButton(page).click()
    await page.waitForSelector('[data-sheet][data-state="open"]')
    const enter = await anim(page, '[data-sheet][data-state="open"]')
    check('reduced: Sheet appears without a perceptible animation', enter.duration <= 0.01, JSON.stringify(enter))
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-sheet]')).opacity === '1', null, { timeout: 200 })
    check('reduced: Sheet is opaque on its first frames', true)
    check('reduced: focus still moves into the Sheet', await focusInDialog(page))
    await page.keyboard.press('Escape')
    await page.locator('[data-sheet]').waitFor({ state: 'detached', timeout: 500 })
    await page.waitForFunction(() => /^Filters/.test(document.activeElement?.textContent?.trim() ?? ''))
    check('reduced: Escape closes at once and focus returns', true)
    const press = await pressedTransform(page, '.property-card')
    check('reduced: a pressed card is not scaled', press.transform === 'none', JSON.stringify(press))
    check('reduced: every running animation or transition on the page is near-instant', await page.evaluate(() => document.getAnimations().every((a) => Number(a.effect.getTiming().duration) <= 0.01)), JSON.stringify(await page.evaluate(() => document.getAnimations().map((a) => [a.animationName ?? a.transitionProperty, a.effect.getTiming().duration]))))
    await page.context().close()

    const desk = await open('/', { width: 1280, context: reduced })
    const toggle = desk.locator('header.app-bar').getByRole('navigation', { name: 'Marketplace' }).getByRole('button', { name: 'More in Buy' })
    await toggle.click()
    const t = await desk.locator('#nav-panel-buy').evaluate((el) => el.getAnimations().map((a) => a.effect.getTiming().duration))
    check('reduced: header panel opens without a perceptible transition', t.every((d) => d <= 0.01), JSON.stringify(t))
    await desk.context().close()

    // The tabs: no glide, nothing waiting on motion, keyboard intact.
    const tabsPage = await open('/', { context: reduced })
    const list = await intentTabs(tabsPage)
    check('reduced tabs: the active state is clear before any interaction', await list.getByRole('tab', { name: 'Buy', exact: true }).getAttribute('aria-selected') === 'true' && await pillOver(list) === 0)
    await list.getByRole('tab', { name: 'Rent', exact: true }).click()
    const moves = await list.evaluate((el) => [...el.querySelectorAll('[aria-hidden]')].flatMap((n) => n.getAnimations()).map((a) => a.effect.getTiming().duration))
    check('reduced tabs: the indicator moves without a perceptible transition', moves.every((d) => d <= 0.01), JSON.stringify(moves))
    await tabsPage.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    check('reduced tabs: the indicator is on Rent within two frames', await pillOver(list) === 1)
    await list.getByRole('tab', { name: 'Rent', exact: true }).focus()
    await tabsPage.keyboard.press('ArrowLeft')
    check('reduced tabs: the keyboard still moves focus and selection', await list.getByRole('tab', { name: 'Buy', exact: true }).evaluate((el) => el === document.activeElement && el.getAttribute('aria-selected') === 'true'))
    check('reduced tabs: the form behind the tabs is there and usable at once', await tabsPage.getByRole('dialog', { name: 'Find your home' }).getByRole('button', { name: /^Search properties for sale/ }).isEnabled())
    await tabsPage.context().close()

    // Results under reduced motion: a filter change brings results in at once.
    const rmSearch = await open(SEARCH, { width: 1280, context: reduced })
    await rmSearch.waitForFunction(() => document.querySelector('[data-enter]'))
    await rmSearch.evaluate(() => { window.__moved = 0; new MutationObserver((rs) => { for (const r of rs) for (const n of r.addedNodes) if (n.nodeType === 1 && n.matches('.results-list > li')) requestAnimationFrame(() => { window.__moved += n.getAnimations().length }) }).observe(document.body, { childList: true, subtree: true }) })
    await rmSearch.locator('aside[aria-label="Filters"] button[aria-pressed]:has-text("2 BHK")').first().click()
    await rmSearch.waitForURL('**bhk=2**')
    await rmSearch.waitForTimeout(400)
    check('reduced: results that arrive after a filter change do not animate', await rmSearch.evaluate(() => window.__moved === 0 && [...document.querySelectorAll('.results-list > li')].every((li) => getComputedStyle(li).opacity === '1')))
    await rmSearch.context().close()

    let release
    const held = new Promise((r) => { release = r })
    const sk = await open('/', {
      context: reduced,
      before: (p) => p.route('**/buy/kolkata/2-bhk**', async (route) => {
        const h = route.request().headers()
        if (h.rsc && !h['next-router-prefetch']) await held
        await route.continue()
      }),
    })
    await provokeLoading(sk)
    await sk.locator('.skeleton').first().waitFor()
    await sk.waitForTimeout(100)
    const still = await sk.locator('.skeleton').first().evaluate((el) => {
      const after = getComputedStyle(el, '::after')
      return { count: after.animationIterationCount, duration: parseFloat(after.animationDuration) * 1000, transform: after.transform }
    })
    // One 0.01ms pass, then the sweep rests off the block (translateX(-100%)
    // inside overflow: hidden): a plain, still skeleton.
    check('reduced: skeleton does not shimmer', still.count === '1' && still.duration <= 0.01 && /^matrix\(1, 0, 0, 1, -\d/.test(still.transform), JSON.stringify(still))
    release()
    await sk.context().close()
  }

  check('no page errors', errors.length === 0, errors.join('\n'))
  console.log(`\n${passed} motion checks passed`)
} finally {
  await browser.close()
}
