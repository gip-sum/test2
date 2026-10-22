/**
 * Browser verification of Search's map view (UI-21).
 *
 * The map is a second way to read the same results, so most of this is
 * checking that it never says something the list does not: every marker's
 * count and lowest price are recomputed here from the cards themselves,
 * across every page of results, for several searches. The rest is the
 * map's behaviour: selection, keyboard, the card ↔ marker link, the phone
 * layout, and every way it can fail without taking Search with it.
 *
 * The basemap is someone else's service, so the map's style request is
 * answered here with a minimal style (one empty source carrying a credit
 * line) and, for the failure cases, with an error. That tests this
 * product's behaviour whether or not the provider is reachable from where
 * the check runs; it never changes what the product requests.
 *
 * Usage: npm run build && npm run start, then npm run map-check
 */
import { chromium } from 'playwright-core'

const B = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
let pass = 0, fail = 0
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ok   ${name}${detail ? '  — ' + detail : ''}`) }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

const STYLE = /^https:\/\/tiles\.openfreemap\.org\//
const CREDIT = '© OpenStreetMap contributors'
// MapLibre credits a source only while a layer uses it, as every source in
// the real style is used.
const stub = { version: 8, sources: { credit: { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: CREDIT } }, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#e9efe9' } }, { id: 'credit', type: 'circle', source: 'credit' }] }
async function open({ width = 1440, height = 900, style = 'stub', js = true, reducedMotion = 'no-preference', webgl2 = true } = {}) {
  const phone = width < 500
  const ctx = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js, reducedMotion, isMobile: phone, hasTouch: phone })
  if (!webgl2) await ctx.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return type === 'webgl2' ? null : get.call(this, type, ...rest) } })
  if (style === 'stub') await ctx.route(STYLE, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(stub) }))
  if (style === 'error') await ctx.route(STYLE, (r) => r.fulfill({ status: 503, body: 'unavailable' }))
  const vendor = []
  ctx.on('request', (r) => { if (r.url().includes('/vendor/maplibre-gl/')) vendor.push(r.url()) })
  return { ctx, page: await ctx.newPage(), vendor }
}
const settled = (p) => p.waitForFunction(() => !document.querySelector('[data-search-fallback]') && document.querySelector('h1'), null, { timeout: 15000 })
const mapState = (p) => p.waitForFunction(() => { const s = document.querySelector('.map-frame')?.getAttribute('data-status'); return s === 'ready' || s === 'failed' }, null, { timeout: 20000 }).then(() => p.locator('.map-frame').getAttribute('data-status'))
const go = async (p, path) => { await p.goto(B + path, { waitUntil: 'load' }); await settled(p) }
const total = async (p) => Number(((await p.locator('#results-count').innerText()).replace(/,/g, '').match(/(\d+)\s+propert/) ?? [, 0])[1])
const rupees = (t) => { const n = parseFloat(t.replace(/[^\d.]/g, '')); return /Cr/.test(t) ? n * 1e7 : /L\b/.test(t) ? n * 1e5 : Number(t.replace(/[^\d]/g, '')) }

/** Every card in a search, across all its pages: area and displayed price. */
async function allCards(p, path) {
  const out = []
  for (let page = 1; page < 50; page++) {
    await go(p, `${path}${path.includes('?') ? '&' : '?'}page=${page}`)
    const n = await total(p)
    const cards = await p.$$eval('#search-results li[data-area]', (lis) => lis.map((li) => ({ area: li.dataset.area, price: li.querySelector('.result-card p.tabular.font-display')?.textContent?.trim() ?? '' })))
    out.push(...cards)
    if (out.length >= n || !cards.length) return { cards: out, n }
  }
  return { cards: out, n: -1 }
}
/** What the map view says: markers (from the map) and the index (from the HTML). */
async function mapSays(p, path) {
  await go(p, path)
  // No placed area: the map is not drawn at all, so there is no state to wait for.
  const status = (await p.locator('.search-map .map-view').count()) ? await mapState(p) : 'none'
  const markers = await p.$$eval('.map-marker', (els) => els.map((e) => ({ area: e.dataset.area, count: Number(e.querySelector('.map-marker-count').textContent), label: e.getAttribute('aria-label') })))
  const index = await p.$$eval('.search-area-link', (els) => els.map((e) => ({ area: e.dataset.areaLink, count: Number(e.querySelector('.search-area-count').textContent.replace(/[^\d]/g, '')), unplaced: Boolean(e.closest('ul')?.previousElementSibling?.textContent?.includes('no map position')) })))
  return { status, markers, index }
}

// 1 · Counts and lowest prices: the map against the cards, every page.
{
  const { ctx, page: p } = await open()
  for (const path of ['/buy/kolkata?view=map', '/rent/kolkata?view=map', '/buy/kolkata?view=map&bhk=2,3', '/buy/kolkata?view=map&type=APARTMENT&pmax=10000000', '/buy/kolkata/salt-lake?view=map', '/rent/kolkata?view=map&loc=new-town,new-town-action-area-i,em-bypass']) {
    const { cards, n } = await allCards(p, path)
    const { status, markers, index } = await mapSays(p, path)
    const byArea = new Map()
    for (const c of cards) { const a = byArea.get(c.area) ?? { count: 0, min: Infinity, text: '' }; a.count++; if (rupees(c.price) < a.min) { a.min = rupees(c.price); a.text = c.price } byArea.set(c.area, a) }
    const placed = index.filter((i) => !i.unplaced)
    check(`${path}: every result is counted once, placed or not`, cards.length === n && index.reduce((s, i) => s + i.count, 0) === n, `${n} results, index sums ${index.reduce((s, i) => s + i.count, 0)}`)
    check(`${path}: one marker per placed area, counts equal the cards'`, status === 'ready' && markers.length === placed.length && markers.every((m) => byArea.get(m.area)?.count === m.count), `${markers.length} markers`)
    check(`${path}: each marker's lowest price is the lowest card's`, cards.every((c) => c.price) && markers.every((m) => m.label.includes(`from ${byArea.get(m.area)?.text}.`) && /Approximate area\.$/.test(m.label)))
    check(`${path}: the index agrees with the cards, unplaced areas included`, index.every((i) => byArea.get(i.area)?.count === i.count))
  }
  // Page 2 draws the same markers as page 1.
  const one = (await mapSays(p, '/buy/kolkata?view=map')).markers.map((m) => `${m.area}${m.count}`).join()
  const two = (await mapSays(p, '/buy/kolkata?view=map&page=2')).markers.map((m) => `${m.area}${m.count}`).join()
  check('markers count all matches, not the page: page 2 draws page 1\'s markers', one === two && one.length > 0)
  // E M Bypass is never drawn.
  const em = await mapSays(p, '/buy/kolkata?view=map&loc=em-bypass')
  check('an area with no cited point is listed, never drawn', em.markers.length === 0 && em.index.length === 1 && em.index[0].unplaced, JSON.stringify(em.index))
  check('…and the map says why it is empty', await p.getByText('None of these areas is on the map yet').isVisible())
  await ctx.close()
}

// 2 · Desktop: layout, selection, keyboard, the card ↔ marker link, credit.
{
  const { ctx, page: p, vendor } = await open({ width: 1440 })
  await go(p, '/buy/kolkata')
  check('list view (the default) loads no map code', vendor.length === 0 && (await p.locator('.search-map').count()) === 0 && (await p.locator('.search-rail').isVisible()))
  check('List is the current mode', (await p.locator('.search-view a[aria-current="page"]').innerText()).includes('List'))
  await p.locator('.search-view a', { hasText: 'Map' }).click()
  await p.waitForURL(/view=map/); await mapState(p)
  check('Map keeps focus on the switch, without a reload', await p.evaluate(() => document.activeElement?.textContent?.includes('Map')))
  check('one h1 in map view', (await p.locator('h1').count()) === 1)
  const split = await p.evaluate(() => { const l = document.querySelector('.search-split-list').getBoundingClientRect(), m = document.querySelector('.search-split-map').getBoundingClientRect(); return { list: l.width, map: m.width, mapLeft: m.left, listRight: l.right } })
  check('results left, map right', split.mapLeft > split.listRight && split.map / split.list > 1.05 && split.map / split.list < 1.3, JSON.stringify(split))
  await p.evaluate(() => scrollTo(0, 1600)); await p.waitForTimeout(200)
  const top = await p.evaluate(() => document.querySelector('.search-split-map').getBoundingClientRect().top)
  check('the map stays in view while the list scrolls', top >= 80 && top <= 110, `top ${top}`)
  await p.evaluate(() => scrollTo(0, 0))
  const credit = p.locator('.maplibregl-ctrl-attrib')
  check('the basemap credit shows, uncollapsed, bottom-right', (await credit.innerText()).includes(CREDIT) && !(await credit.getAttribute('class')).includes('compact') && (await p.locator('.maplibregl-ctrl-bottom-right .maplibregl-ctrl-attrib').count()) === 1)
  check('…and the area positions are credited under the map', await p.getByText(/Area positions: India Post directory/).isVisible())
  const sizes = await p.$$eval('.map-marker, .maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height) }))
  check('markers and zoom buttons are 44px targets', sizes.length > 2 && sizes.every((s) => s >= 44), sizes.join())

  const marker = p.locator('.map-marker[data-area="new-town"]')
  await marker.click()
  check('a press selects: pressed, named, previewed', (await marker.getAttribute('aria-pressed')) === 'true' && (await p.locator('#map-preview-title').innerText()) === 'New Town')
  const onPage = await p.locator('#search-results li[data-area="new-town"]').count()
  const outlined = await p.$$eval('#search-results li[data-area="new-town"] .result-card', (cs) => cs.filter((c) => getComputedStyle(c).outlineStyle === 'solid').length)
  check('every card of the chosen area is outlined, and no other', outlined === onPage && onPage > 0 && (await p.$$eval('#search-results li:not([data-area="new-town"]) .result-card', (cs) => cs.filter((c) => getComputedStyle(c).outlineStyle === 'solid').length)) === 0, `${outlined}/${onPage}`)
  check('the preview says how many are on this page', (await p.locator('.map-preview').innerText()).includes(`${onPage} on this page`))
  const only = await p.locator('.map-preview a', { hasText: 'Show only these' }).getAttribute('href')
  check('"Show only these" is the same search for the area\'s localities, still on the map', /loc=new-town%2Cnew-town-action-area-i|loc=new-town,new-town-action-area-i/.test(only) && only.includes('view=map'), only)
  check('the preview does not cover the credit', await p.evaluate(() => { const r = document.querySelector('.maplibregl-ctrl-attrib').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('.maplibregl-ctrl-attrib') !== null }))
  await p.keyboard.press('Escape')
  check('Escape closes and returns focus to the marker', (await p.locator('.map-preview').count()) === 0 && await p.evaluate(() => document.activeElement?.dataset?.area === 'new-town'))
  await p.locator('.map-marker[data-area="ballygunge"]').focus()
  await p.keyboard.press('Enter'); await p.waitForTimeout(150)
  check('Enter on a marker moves focus into its preview', await p.evaluate(() => document.activeElement?.id === 'map-preview-title'))
  await p.locator('.map-preview button[aria-label="Close Ballygunge"]').click()
  check('Close returns focus to the marker', await p.evaluate(() => document.activeElement?.dataset?.area === 'ballygunge'))
  const card = p.locator('#search-results li[data-area="alipore"] a').first()
  await card.focus()
  check('a focused card marks its area\'s marker', (await p.locator('.map-marker[data-area="alipore"]').getAttribute('class')).includes('is-linked'))
  await p.locator('#results-count').focus()
  check('…and lets go when focus leaves the cards', !(await p.locator('.map-marker[data-area="alipore"]').getAttribute('class')).includes('is-linked'))
  // Moving the map moves no results.
  const before = await total(p)
  await p.locator('.maplibregl-ctrl-zoom-in').click(); await p.waitForTimeout(500)
  const box = await p.locator('.map-canvas').boundingBox()
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400)
  check('panning and zooming change no results and no URL', (await total(p)) === before && p.url().endsWith('view=map'))
  // URL state: back, forward, refresh.
  // A client-side transition: the old frame (and its h1) stays until the
  // new one renders, so wait for the outcome itself, bounded.
  const shows = (sel) => p.locator(sel).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)
  await p.goBack()
  check('back returns to the list', (await shows('.search-rail')) && !p.url().includes('view=map'))
  await p.goForward(); await shows('.map-frame')
  check('forward returns to the map', p.url().includes('view=map') && (await mapState(p)) === 'ready')
  await p.reload(); await settled(p)
  check('refresh keeps the map', (await mapState(p)) === 'ready')
  check('canonical drops the mode; the map view is not indexed', await p.evaluate(() => !document.querySelector('link[rel="canonical"]').href.includes('view') && /noindex/.test(document.querySelector('meta[name="robots"]')?.content ?? '')))
  await ctx.close()
}

// 2b · One download. Request routing turns Chromium's HTTP cache off, so this
// context routes nothing: the style request goes wherever it goes (blocked,
// failing or loading — MapLibre and its worker load in every case).
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  const shared = () => p.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/vendor/maplibre-gl/')).map((e) => [e.name.split('/').pop(), e.transferSize]))
  await go(p, '/buy/kolkata?view=map'); await mapState(p); await p.waitForTimeout(1500)
  const first = await shared()
  const fetched = first.filter(([n, t]) => n === 'maplibre-gl-shared.mjs' && t > 0).length
  check('MapLibre\'s shared module is downloaded once; the worker\'s copy comes from cache', fetched === 1 && first.some(([n]) => n === 'maplibre-gl-worker.mjs'), JSON.stringify(first))
  await p.locator('.search-view a', { hasText: 'List' }).click(); await p.waitForURL((u) => !u.href.includes('view=map'))
  await p.locator('.search-view a', { hasText: 'Map' }).click(); await p.waitForURL(/view=map/); await mapState(p); await p.waitForTimeout(1000)
  check('opening the map again in the same tab downloads nothing more', (await shared()).length === first.length)
  await ctx.close()
}

// 3 · Phone: the map replaces the results; the preview sits above the bottom bar.
for (const width of [320, 360, 390, 430]) {
  const { ctx, page: p } = await open({ width, height: 800 })
  await go(p, '/buy/kolkata?view=map')
  await mapState(p)
  check(`${width}: the map replaces the results`, !(await p.locator('#search-results').isVisible()) && (await p.locator('.map-frame').isVisible()))
  check(`${width}: List | Map spans the row`, await p.evaluate(() => document.querySelector('.search-view').getBoundingClientRect().width >= document.querySelector('.search-split-list').getBoundingClientRect().width - 1))
  check(`${width}: credit top-left, zoom bottom-right`, (await p.locator('.maplibregl-ctrl-top-left .maplibregl-ctrl-attrib').count()) === 1 && (await p.locator('.maplibregl-ctrl-bottom-right .maplibregl-ctrl-zoom-in').count()) === 1)
  await p.locator('.map-frame').scrollIntoViewIfNeeded()
  await p.locator('.map-marker[data-area="alipore"]').tap()
  const pv = await p.evaluate(() => { const r = document.querySelector('.map-preview').getBoundingClientRect(), bar = document.querySelector('nav[aria-label="Primary"]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, bar: bar.top, vh: innerHeight } })
  check(`${width}: the preview is in view, above the bottom bar, not too tall`, pv.top >= 0 && pv.bottom <= pv.bar && pv.height <= pv.vh * 0.45, JSON.stringify(pv))
  const show = await p.locator('.map-preview a', { hasText: 'Show these' }).getAttribute('href')
  check(`${width}: on a phone the preview leads to the list`, !show.includes('view=map') && show.includes('alipore'))
  for (const v of ['', '?view=map']) {
    await go(p, `/buy/kolkata${v}`); if (v) await mapState(p)
    const sw = await p.evaluate(() => document.documentElement.scrollWidth)
    check(`${width}${v}: no horizontal overflow`, sw <= width, `${sw}`)
  }
  await ctx.close()
}
for (const width of [768, 1024, 1280, 1920]) {
  const { ctx, page: p } = await open({ width })
  await go(p, '/buy/kolkata?view=map'); await mapState(p)
  const sw = await p.evaluate(() => document.documentElement.scrollWidth)
  check(`${width}?view=map: no horizontal overflow`, sw <= width, `${sw}`)
  await ctx.close()
}

// 4 · Failure: the provider, WebGL2, JavaScript. Search keeps working.
{
  const { ctx, page: p } = await open({ style: 'error' })
  await go(p, '/buy/kolkata?view=map')
  check('a failing basemap becomes one notice', (await mapState(p)) === 'failed' && await p.getByText('The map could not load').isVisible())
  check('…with no dead controls over it', (await p.locator('.maplibregl-ctrl-zoom-in').count()) === 0 || !(await p.locator('.maplibregl-ctrl-zoom-in').isVisible()))
  check('…and the list, the index and a way back stay', (await p.locator('#search-results li').count()) > 0 && (await p.locator('.search-area-link').count()) > 0 && !(await p.getByRole('link', { name: 'Show the list' }).getAttribute('href')).includes('view=map'))
  await ctx.close()
}
{
  const { ctx, page: p, vendor } = await open({ webgl2: false })
  await go(p, '/buy/kolkata?view=map')
  check('without WebGL2 the map fails calmly, before fetching MapLibre', (await mapState(p)) === 'failed' && vendor.every((u) => u.endsWith('.css')), vendor.join())
  check('…and Search works', (await p.locator('#search-results li').count()) > 0)
  await ctx.close()
}
{
  const { ctx, page: p } = await open({ width: 390, js: false })
  await p.goto(`${B}/buy/kolkata?view=map`, { waitUntil: 'load' })
  check('without JavaScript the map gives way to a sentence and the index', await p.evaluate(() => getComputedStyle(document.querySelector('.search-map .map-view')).display === 'none' && document.querySelectorAll('.search-area-link').length > 0 && document.querySelector('.search-map noscript') !== null))
  await p.locator('.search-area-link', { hasText: 'Salt Lake' }).click(); await p.waitForLoadState('load')
  check('…an area link narrows the search', p.url().includes('salt-lake') && p.url().includes('view=map'))
  await p.locator('.search-view a', { hasText: 'List' }).click(); await p.waitForLoadState('load')
  check('…and List brings the cards back', !p.url().includes('view=map') && (await p.locator('#search-results .result-card').count()) > 0)
  await ctx.close()
}

// 5 · Reduced motion: the preview appears without its entrance.
{
  const { ctx, page: p } = await open({ reducedMotion: 'reduce' })
  await go(p, '/buy/kolkata?view=map'); await mapState(p)
  await p.locator('.map-marker[data-area="howrah"]').click()
  const d = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.map-preview')).animationDuration))
  check('reduced motion: the preview has no entrance animation', d <= 0.01, `${d}s`)
  await ctx.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
