// Phase 20 browser assertions: view counting, saving real listings and the
// seller performance pages, against a local simulator of the Auth, REST and
// Storage APIs (test values only; no credentials exist here).
//
// Needs the app on 3101 started with
//   SUPABASE_URL=http://127.0.0.1:3300 SUPABASE_PUBLISHABLE_KEY=test-public-key
//   SUPABASE_SERVICE_ROLE_KEY=test-service-key
// The script owns the simulator on port 3300.
import http from 'node:http'
import sharp from 'sharp'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { assertWorkspace } from './workspace-assertions.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3101'
const owner = 'a9140f33-a429-46f3-9514-3e8f32f18189', foreign = 'b9140f33-a429-46f3-9514-3e8f32f18189', buyer = '29140f33-a429-46f3-9514-3e8f32f18189'
const DAY = 86_400_000, at = (days) => new Date(Date.now() + days * DAY).toISOString()
const indiaDay = (offset = 0) => new Date(Date.now() + 5.5 * 3_600_000 + offset * DAY).toISOString().slice(0, 10)
const id = (kind, n) => `${kind}9140f33-a429-46f3-9514-${String(n).padStart(12, '0')}`
const jpeg = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#557755' } }).jpeg().toBuffer()
const draftFields = { role: 'OWNER', intent: 'buy', type: 'APARTMENT', bhk: '2', baths: '2', unit: 'sqft', carpet: '1000', furnishing: 'UNFURNISHED', floor: '3', floors: '8', status: 'READY', age: '4', city: 'kolkata', locality: 'new-town', address: 'Test building address', saleprice: '6000000', maintenance: 'none', negotiable: 'yes' }

const plan = [
  { n: 1, title: '2 BHK flat for sale in New Town', listing: { status: 'ACTIVE', activated_at: at(-20), expires_at: at(40) } },
  { n: 2, title: '3 BHK flat for sale in Salt Lake', listing: { status: 'ACTIVE', activated_at: at(-20), expires_at: at(40) } },
  { n: 3, title: null },
]
const drafts = plan.map(({ n }) => ({ id: id('c', n), owner_id: owner, collection_id: id('f', n), revision: 1, created_at: at(-40), updated_at: at(-n), page_path: '/post', ...draftFields }))
let listings = plan.filter((p) => p.listing).map(({ n, listing }) => ({ id: id('d', n), owner_id: owner, draft_id: id('c', n), current_submission_id: id('e', n), version: 2, created_at: at(-40), updated_at: at(-n), rejection_reason: null, ...listing }))
const submissions = plan.filter((p) => p.listing).map(({ n, title }) => ({ id: id('e', n), listing_id: id('d', n), title, seller_name: 'Test Seller', seller_type: 'OWNER', intent: 'buy', property_type: 'APARTMENT', bedrooms: 2, bathrooms: 2, area_unit: 'sqft', carpet_area: 1000, built_up_area: null, super_area: null, furnishing: 'UNFURNISHED', floor: 3, total_floors: 8, construction_status: 'READY', age_years: 4, possession_by: null, available_from: null, city_name: 'Kolkata', locality_name: 'New Town', city_id: 'kolkata', locality_id: 'new-town', sub_locality_id: null, society_name: null, address: 'Test building address', latitude: null, longitude: null, price: 6000000, deposit: null, maintenance_status: 'none', maintenance_monthly: null, negotiable: true, created_at: at(-20) }))
const photos = submissions.map((s) => ({ id: id('9', Number(s.id.slice(-2))), submission_id: s.id, object_path: `${s.id}/photo.jpg`, position: 0, width: 640, height: 480, bytes: jpeg.length }))
// Counting began three days ago; listing 2 has a busy history, listing 1 starts empty.
const viewsSince = new Date(Date.now() - 3 * DAY).toISOString()
const stats = new Map([[`${id('d', 2)}|${indiaDay(-1)}`, 40]]), marks = new Set(), viewCalls = []
const enquiries = [{ listing_id: id('d', 2), seller_id: owner, created_at: at(-1), status: 'new' }, { listing_id: id('d', 2), seller_id: owner, created_at: at(-1), status: 'new' }]
let savedListings = [], activityMissing = false, unavailable = false
// UI-10: one supplementary source failing, counting not started, a slow period change.
let savesDown = false, metaMissing = false, activityDelay = 0

const active = (l) => l.status === 'ACTIVE' && Date.parse(l.expires_at) > Date.now()
const dayOf = (iso) => new Date(Date.parse(iso) + 5.5 * 3_600_000).toISOString().slice(0, 10)
function where(rows, params) {
  return rows.filter((row) => [...params].every(([key, value]) => {
    const m = /^(eq|in)\.(.*)$/.exec(value)
    if (!m || ['select', 'order', 'limit'].includes(key)) return true
    return m[1] === 'eq' ? String(row[key]) === m[2] : m[2].slice(1, -1).split(',').includes(String(row[key]))
  }))
}
const mock = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c)
  const url = new URL(req.url, 'http://localhost'), body = Buffer.concat(chunks).toString(), p = url.searchParams
  const token = req.headers.authorization?.slice(7) ?? req.headers.apikey
  const user = { ['a'.repeat(48)]: owner, ['b'.repeat(48)]: foreign, ['c'.repeat(48)]: buyer }[token] ?? null
  const service = token === 'test-service-key', publicRead = token === 'test-public-key'
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  if (url.pathname === '/auth/v1/user') return user ? send(200, { id: user, email: 'private@example.com' }) : send(401, {})
  if (url.pathname === '/rest/v1/rpc/my_account_access') return send(200, true)
  if (!user && !service && !publicRead) return send(401, {})
  if (unavailable) return send(503, {})
  const mine = (rows) => rows.filter((r) => r.owner_id === user)
  switch (url.pathname) {
    case '/rest/v1/saved_properties': case '/rest/v1/property_draft_reviews': case '/rest/v1/media_assets': case '/rest/v1/property_listing_events': case '/rest/v1/seller_notifications': case '/rest/v1/enquiries': return send(200, [])
    case '/rest/v1/buyer_profiles': return send(200, [])
    case '/rest/v1/property_drafts': return send(200, where(mine(drafts), p))
    case '/rest/v1/property_listings': return send(200, where(user ? mine(listings) : publicRead ? listings.filter(active) : [], p))
    case '/rest/v1/property_listing_submissions': return send(200, where(submissions.filter((s) => { const l = listings.find((x) => x.id === s.listing_id); return user ? l?.owner_id === user : publicRead && l && active(l) }), p))
    case '/rest/v1/property_listing_photos': return send(200, where(photos, p))
    case '/rest/v1/rpc/seller_listing_enquiry_counts': return send(200, [])
    case '/rest/v1/listing_analytics_meta': return !user ? send(401, {}) : metaMissing ? send(200, []) : send(200, [{ views_since: viewsSince }])
    case '/rest/v1/rpc/record_listing_view': {
      if (!service) return send(403, {})
      const b = JSON.parse(body), l = listings.find((x) => x.id === b.p_listing)
      viewCalls.push(b)
      if (!l || !active(l) || b.p_viewer === l.owner_id || !/^[a-f0-9]{64}$/.test(b.p_visitor_key)) return send(200, false)
      const mark = `${l.id}|${indiaDay()}|${b.p_visitor_key}`
      if (marks.has(mark)) return send(200, false)
      marks.add(mark); stats.set(`${l.id}|${indiaDay()}`, (stats.get(`${l.id}|${indiaDay()}`) ?? 0) + 1)
      return send(200, true)
    }
    case '/rest/v1/rpc/seller_listing_activity': {
      if (activityMissing) return send(404, {})
      if (activityDelay) await new Promise((r) => setTimeout(r, activityDelay))
      const b = JSON.parse(body), owned = new Set(mine(listings).map((l) => l.id)), rows = new Map()
      for (const [k, views] of stats) { const [lid, d] = k.split('|'); if (owned.has(lid) && d >= b.p_from && d <= b.p_to) rows.set(k, { listing_id: lid, day: d, views, enquiries: 0 }) }
      for (const e of enquiries.filter((x) => x.seller_id === user)) { const d = dayOf(e.created_at), k = `${e.listing_id}|${d}`; if (d < b.p_from || d > b.p_to) continue; const r = rows.get(k) ?? { listing_id: e.listing_id, day: d, views: 0, enquiries: 0 }; r.enquiries++; rows.set(k, r) }
      return send(200, [...rows.values()])
    }
    case '/rest/v1/rpc/seller_listing_save_counts': {
      if (savesDown) return send(500, {})
      const counts = new Map(); for (const s of savedListings) if (listings.find((l) => l.id === s.listing_id)?.owner_id === user) counts.set(s.listing_id, (counts.get(s.listing_id) ?? 0) + 1)
      return send(200, [...counts].map(([listing_id, saves]) => ({ listing_id, saves })))
    }
    case '/rest/v1/saved_listings': {
      if (req.method === 'DELETE') { savedListings = savedListings.filter((s) => !(s.user_id === user && s.listing_id === p.get('listing_id').slice(3))); return send(204, null) }
      return send(200, savedListings.filter((s) => s.user_id === user).map(({ listing_id, created_at }) => ({ listing_id, created_at })))
    }
    case '/rest/v1/rpc/save_listing': {
      const b = JSON.parse(body), l = listings.find((x) => x.id === b.p_listing)
      if (!user) return send(401, {})
      if (!l || !active(l)) return send(410, {})
      if (l.owner_id === user) return send(403, {})
      if (!savedListings.some((s) => s.user_id === user && s.listing_id === l.id)) savedListings.push({ user_id: user, listing_id: l.id, created_at: new Date().toISOString() })
      return send(200, true)
    }
  }
  if (url.pathname.startsWith('/storage/v1/object/authenticated/listing-photos/')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(jpeg) }
  return send(404, {})
})
await new Promise((r) => mock.listen(3300, '127.0.0.1', r))

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? chromium.executablePath() })
let count = 0
const check = (name, ok, detail = '') => { if (!ok) throw Error(`${name} ${detail}`); count++; console.log('ok', name) }
async function context(token, options = {}) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options })
  if (token) await c.addCookies([{ name: 'gb-access', value: token.repeat(48), url: BASE }])
  return c
}
const todayViews = (n) => stats.get(`${id('d', n)}|${indiaDay()}`) ?? 0
async function waitFor(fn, label) { for (let i = 0; i < 50; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 100)) } throw Error('timed out: ' + label) }
const L1 = `/listing/${id('d', 1)}`

try {
  const guest = await context(), g = await guest.newPage(), errors = []
  g.on('pageerror', (e) => errors.push(e.message))
  await g.goto(BASE + '/dashboard/performance?range=30')
  const login = new URL(g.url())
  check('guest is sent to log in and returned to the same period', login.pathname === '/login' && login.searchParams.get('next') === '/dashboard/performance?range=30')

  // ── Views ───────────────────────────────────────────────────────────────
  await g.goto(BASE + L1); await waitFor(() => todayViews(1) === 1, 'first view')
  check('a guest viewing a public listing is counted once', todayViews(1) === 1)
  const cookie = (await guest.cookies()).find((c) => c.name === 'gb-visitor')
  check('the visitor cookie is random, first-party and httpOnly', cookie?.httpOnly === true && /^[0-9a-f-]{36}$/.test(cookie.value))
  await g.reload(); await waitFor(() => viewCalls.length >= 2, 'second beacon')
  check('the same browser again today is not counted again', todayViews(1) === 1)
  const other = await context(), o = await other.newPage(); await o.goto(BASE + L1); await waitFor(() => todayViews(1) === 2, 'second browser')
  check('a different browser is counted', todayViews(1) === 2)
  const calls = viewCalls.length
  const crawler = await context(null, { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }), cp = await crawler.newPage(); await cp.goto(BASE + L1); await cp.waitForTimeout(1500)
  check('a known crawler is never sent to the database', viewCalls.length === calls && todayViews(1) === 2)
  const forged = await guest.request.post(BASE + `/api/listings/${id('d', 1)}/view`, { headers: { Origin: 'https://evil.test' } })
  check('a beacon from another origin gets the same empty answer and no count', forged.status() === 204 && viewCalls.length === calls)
  const sellerContext = await context('a'), seller = await sellerContext.newPage(); seller.on('pageerror', (e) => errors.push(e.message))
  await seller.goto(BASE + L1); await seller.waitForTimeout(1500)
  check('the owner’s own visits are not counted', todayViews(1) === 2 && viewCalls.length === calls)
  check('the owner sees no save control on their own listing', await seller.getByRole('button', { name: /^Save / }).count() === 0)

  // ── Saves ───────────────────────────────────────────────────────────────
  const buyerContext = await context('c'), b = await buyerContext.newPage(); b.on('pageerror', (e) => errors.push(e.message))
  await b.goto(BASE + L1)
  const heart = b.getByRole('button', { name: 'Save 2 BHK flat for sale in New Town' })
  await heart.click(); await b.getByRole('button', { name: 'Remove 2 BHK flat for sale in New Town from saved' }).waitFor()
  check('a buyer saves a real listing from its page', savedListings.length === 1 && savedListings[0].user_id === buyer)
  check('the signed-in buyer’s visit is a view like any other', todayViews(1) === 3)
  await b.reload()
  check('the save survives reload', await b.getByRole('button', { name: 'Remove 2 BHK flat for sale in New Town from saved' }).getAttribute('aria-pressed') === 'true')
  await b.goto(BASE + '/account/saved')
  check('the saved page lists the real listing with a link to it', await b.getByRole('link', { name: '2 BHK flat for sale in New Town' }).getAttribute('href') === L1 && await b.getByText('1 saved property').isVisible())
  // UI-19: the same results card as Search, its photo at card width from the
  // listing's own photo route — never the shared optimizer, whose cache would
  // outlive the listing.
  const savedCard = b.locator('[data-flip-key] article.result-card'), savedImg = savedCard.locator('img').first()
  await savedImg.evaluate((i) => i.complete || new Promise((r) => { i.onload = r; i.onerror = r }))
  const photoSrc = new URL(await savedImg.evaluate((i) => i.currentSrc))
  check('the saved listing is a results card whose photo comes sized from the listing photo route', await savedCard.count() === 1 &&
    photoSrc.pathname.startsWith(`${L1.replace('/listing/', '/api/listings/')}/photos/`) && Number(photoSrc.searchParams.get('w')) > 0 && await savedCard.getByRole('button', { name: /^Remove .* from saved$/ }).isVisible(), photoSrc.href)
  const sized = await b.request.get(photoSrc.href)
  check('the sized photo is a JPEG, still checked per request and never cacheable', sized.status() === 200 && sized.headers()['content-type'] === 'image/jpeg' && sized.headers()['cache-control'] === 'private, no-store')
  check('a width the route does not offer is refused', (await b.request.get(`${photoSrc.origin}${photoSrc.pathname}?w=333`)).status() === 404)
  await g.goto(BASE + L1); await g.getByRole('button', { name: 'Save 2 BHK flat for sale in New Town' }).click(); await g.waitForURL('**/login**')
  check('a signed-out visitor is sent to log in to save', new URL(g.url()).searchParams.get('next') === L1)

  // ── Performance pages ───────────────────────────────────────────────────
  await seller.goto(BASE + '/dashboard')
  // UI-18: an active card's Performance link is one of its secondary actions, under More.
  await seller.locator('article').filter({ has: seller.getByRole('heading', { name: '2 BHK flat for sale in New Town', exact: true }) }).locator('details[data-card-menu] > summary').click()
  check('dashboard cards link to each listing’s performance', await seller.getByRole('link', { name: 'Performance 2 BHK flat for sale in New Town' }).getAttribute('href') === `/dashboard/performance?listing=${id('d', 1)}`)
  await seller.getByRole('navigation', { name: 'Seller sections', exact: true }).getByRole('link', { name: 'Performance', exact: true }).click(); await seller.waitForURL('**/dashboard/performance')
  const listingRows = () => seller.getByRole('region', { name: /^Your listings, last/ }).locator('table tbody tr')
  const rows = listingRows()
  check('the overview shows submitted listings only, busiest first', await rows.count() === 2 && (await rows.first().innerText()).includes('3 BHK flat for sale in Salt Lake'))
  check('overview figures come from the database', (await rows.nth(0).innerText()).replace(/\s+/g, ' ').includes('40 2 0') && (await rows.nth(1).innerText()).replace(/\s+/g, ' ').includes(`${todayViews(1)} 0 1`), (await rows.allInnerTexts()).join(' | '))
  await seller.getByRole('link', { name: 'Last 30 days' }).click(); await seller.waitForURL('**/dashboard/performance?range=30')
  await seller.getByRole('heading', { name: 'Your listings, last 30 days' }).waitFor()
  await seller.reload()
  check('the period is the URL and survives reload', await seller.getByRole('link', { name: 'Last 30 days' }).getAttribute('aria-current') === 'page')

  await seller.goto(BASE + `/dashboard/performance?listing=${id('d', 1)}`)
  await seller.getByRole('heading', { level: 1, name: '2 BHK flat for sale in New Town' }).waitFor()
  const tiles = (await seller.getByRole('region', { name: 'This listing, last 7 days', exact: true }).locator('dl').innerText()).replace(/\s+/g, ' ')
  check('detail totals: views, enquiries and saves now', tiles.includes(`Views, last 7 days ${todayViews(1)}`) && tiles.includes('Enquiries, last 7 days 0') && tiles.includes('Saved now 1') && tiles.includes('1 buyer has it saved'), tiles)
  check('no enquiry rate below 20 views', await seller.getByText('Enquiry rate appears once the period has at least 20 views.').isVisible())
  check('days before counting began are explained, not shown as zero', await seller.getByText(/Views are counted from .* Earlier days in this period show as not tracked, not as zero\./).isVisible())
  await seller.getByText('Daily figures').click()
  check('the table marks untracked days in words', await seller.locator('details').filter({ has: seller.getByText('Daily figures', { exact: true }) }).getByRole('table').getByText('Not tracked').count() === 3)
  // ── The daily chart (UI-10) ─────────────────────────────────────────────
  // Listing 1, last 7 days: counting began three days ago, so the first
  // three days were not tracked.
  const chart = seller.locator('[data-chart="daily-activity"]'), slider = chart.getByRole('slider'), tooltip = chart.locator('[data-chart-tooltip]')
  const tableDays = async (page = seller) => (await page.locator('details').filter({ has: page.getByText('Daily figures', { exact: true }) }).locator('tbody tr')
    .evaluateAll((rows) => rows.map((r) => [...r.children].map((c) => c.textContent.trim())))).reverse()
  const detailHtml = await (await sellerContext.request.get(BASE + `/dashboard/performance?listing=${id('d', 1)}`)).text()
  const chartHtml = detailHtml.slice(detailHtml.indexOf('data-chart="daily-activity"'), detailHtml.indexOf('Daily figures'))
  check('the server sends the whole chart: views line, untracked band and summary', chartHtml.includes('data-series="views"') && (chartHtml.match(/data-untracked/g) ?? []).length === 1 && chartHtml.includes('Most views in a day'))
  check('before hydration the chart claims no keyboard role it cannot answer', !chartHtml.includes('role="slider"') && !chartHtml.includes('tabindex'))
  const geometry = await chart.evaluate((f) => ({ d: f.querySelector('[data-series="views"]').getAttribute('d'), band: f.querySelector('[data-untracked]').style.width, box: f.querySelector('svg').getAttribute('viewBox') }))
  check('untracked days are a hatched gap, never zeros on the line', geometry.box === '0 0 7 100' && geometry.d.startsWith('M3.5,') && !/[ML][012]\.5,/.test(geometry.d) && Math.abs(parseFloat(geometry.band) - 300 / 7) < 0.01, JSON.stringify(geometry))
  check('nothing on the chart animates: the data is there at once', await chart.evaluate((f) => f.getAnimations({ subtree: true }).length === 0))

  await seller.getByRole('link', { name: 'Enquiries inbox' }).focus()
  for (let i = 0; i < 6 && !(await slider.evaluate((e) => e === document.activeElement)); i++) await seller.keyboard.press('Tab')
  check('Tab reaches the chart once, as a slider over the 7 days', await slider.evaluate((e) => e === document.activeElement && e.matches(':focus-visible')) && await slider.getAttribute('aria-valuemax') === '7' && await slider.getAttribute('aria-label') === 'Day, last 7 days')
  check('keyboard focus on the chart is visible', await slider.evaluate((e) => getComputedStyle(e).outlineStyle !== 'none' && parseFloat(getComputedStyle(e).outlineWidth) >= 2))
  check('focus shows the latest day at once', await tooltip.isVisible() && await slider.getAttribute('aria-valuenow') === '7')
  const days = await tableDays(), said = []
  await seller.keyboard.press('Home')
  for (let i = 0; i < 7; i++) { said.push([await slider.getAttribute('aria-valuetext'), (await tooltip.innerText()).replace(/\s+/g, ' ')]); await seller.keyboard.press('ArrowRight') }
  const viewWords = (v) => v === 'Not tracked' ? 'views not tracked' : `${v} ${v === '1' ? 'view' : 'views'}`
  check('the chart reads out exactly what the table says, day by day', days.length === 7 && said.every(([text], i) => text.endsWith(`: ${viewWords(days[i][1])}, ${days[i][2]} ${days[i][2] === '1' ? 'enquiry' : 'enquiries'}`)), JSON.stringify({ said, days }))
  check('the readout shows the same date and figures, untracked days in words', said.every(([text, tip], i) => tip.startsWith(text.split(':')[0]) && (days[i][1] === 'Not tracked' ? tip.includes('Views not tracked') : tip.includes(`${days[i][1]} view`))), JSON.stringify(said))
  await seller.keyboard.press('PageDown'); const afterPage = await slider.getAttribute('aria-valuenow')
  await seller.keyboard.press('End'); const afterEnd = await slider.getAttribute('aria-valuenow')
  check('Page Down moves a week back, End returns to the latest day', afterPage === '1' && afterEnd === '7')
  await seller.keyboard.press('Escape')
  check('Escape hides the readout and keeps focus on the chart', await tooltip.count() === 0 && await slider.evaluate((e) => e === document.activeElement))
  await seller.keyboard.press('Tab')
  check('Tab leaves the chart: nothing traps focus', await slider.evaluate((e) => e !== document.activeElement) && await tooltip.count() === 0)
  const plot = await chart.locator('svg').boundingBox()
  await seller.mouse.move(plot.x + plot.width * (4.5 / 7), plot.y + plot.height / 2)
  check('hovering snaps the crosshair to the nearest day', await tooltip.isVisible() && (await tooltip.innerText()).startsWith(said[4][0].split(':')[0]) && await chart.locator('[data-crosshair]').count() === 2)
  await seller.mouse.move(1, 1)
  check('moving the mouse away clears the readout', await tooltip.count() === 0)

  for (const [range, ticks] of [[7, 7], [30, 5], [90, 7]]) {
    await seller.goto(BASE + `/dashboard/performance?listing=${id('d', 2)}&range=${range}`)
    check(`the ${range}-day chart and table hold every day of the period, with ${ticks} date labels`, await slider.getAttribute('aria-valuemax') === String(range) && (await tableDays()).length === range && await chart.locator('[data-tick]').count() === ticks)
  }

  // Touch, with reduced motion: a tap reads a day, the page still scrolls.
  const touchContext = await context('a', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }), touch = await touchContext.newPage()
  touch.on('pageerror', (e) => errors.push(e.message))
  await touch.goto(BASE + `/dashboard/performance?listing=${id('d', 2)}&range=30`)
  const touchChart = touch.locator('[data-chart="daily-activity"]'), touchTip = touchChart.locator('[data-chart-tooltip]'), touchSlider = touchChart.getByRole('slider')
  check('a finger on the chart can still scroll the page and zoom', await touchSlider.evaluate((e) => getComputedStyle(e).touchAction) === 'pan-y pinch-zoom')
  await touchChart.scrollIntoViewIfNeeded()
  const touchPlot = await touchChart.locator('svg').boundingBox()
  for (const [edge, x, valuenow] of [['right', touchPlot.x + touchPlot.width - 2, '30'], ['left', touchPlot.x + 2, '1']]) {
    await touch.touchscreen.tap(x, touchPlot.y + touchPlot.height / 2)
    const tipBox = await touchTip.boundingBox()
    check(`a tap at the ${edge} edge shows that day, and the readout stays on screen`, await touchSlider.getAttribute('aria-valuenow') === valuenow && tipBox !== null && tipBox.x >= 0 && tipBox.x + tipBox.width <= 390, JSON.stringify(tipBox))
  }
  // The global reduced-motion rule gives every element a 0.01ms transition
  // over `all`, so a tap can leave a CSSTransition alive for that instant
  // (the focus ring appearing). Counting animations raced it (CI #89); the
  // promise is that nothing takes perceptible time, so that is what is asserted.
  check('reduced motion: the readout and chart appear with no perceptible animation', await touchChart.evaluate((f) => f.getAnimations({ subtree: true }).every((a) => Number(a.effect.getComputedTiming().duration) < 1) && parseFloat(getComputedStyle(f.querySelector('[data-chart-tooltip]')).transitionDuration) < 0.001 && parseFloat(getComputedStyle(document.querySelector('.analytics-body')).transitionDuration) < 0.001))
  await touch.touchscreen.tap(195, 120)
  check('tapping elsewhere puts the readout away', await touchTip.count() === 0)
  check('no sideways scroll on the touch chart page', await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await touchContext.close()

  // A period change dims what is there instead of blanking it.
  await seller.goto(BASE + `/dashboard/performance?listing=${id('d', 2)}`)
  activityDelay = 1500
  await seller.getByRole('link', { name: 'Last 30 days' }).click(); await seller.waitForTimeout(500)
  const dimmed = Number(await seller.locator('.analytics-body').evaluate((e) => getComputedStyle(e).opacity))
  check('changing the period dims the figures and keeps the chart in place, no skeleton', dimmed < 1 && await slider.getAttribute('aria-valuemax') === '7', String(dimmed))
  await seller.locator('[role="slider"][aria-valuemax="30"]').waitFor(); activityDelay = 0
  await seller.waitForTimeout(400)
  check('the new period then shows at full strength', await seller.locator('.analytics-body').evaluate((e) => getComputedStyle(e).opacity) === '1')

  // Counting not started yet: every day is "not tracked", nothing reads 0.
  metaMissing = true; await seller.goto(BASE + `/dashboard/performance?listing=${id('d', 1)}`)
  const emptyTiles = (await seller.getByRole('region', { name: 'This listing, last 7 days', exact: true }).locator('dl').innerText()).replace(/\s+/g, ' ')
  check('before counting starts there is no line and no zero: every day is untracked', await chart.getByText('Views were not tracked in this period.').isVisible() && await chart.locator('[data-series="views"]').getAttribute('d') === '' && await chart.locator('[data-untracked]').count() === 1 && emptyTiles.includes('Views, last 7 days Not tracked') && emptyTiles.includes('Previous 7 days: not tracked'), emptyTiles)
  check('a listing with no enquiries says so in words', await chart.getByText('No enquiries in this period.').isVisible())
  metaMissing = false

  // All listings together.
  await seller.goto(BASE + '/dashboard/performance')
  const together = () => seller.getByRole('region', { name: 'All listings together, last 7 days', exact: true })
  const allTiles = (await together().locator('dl').innerText()).replace(/\s+/g, ' ')
  check('the overview totals every listing from the same measured rows', allTiles.includes(`Views, last 7 days ${40 + todayViews(1)}`) && allTiles.includes('Enquiries, last 7 days 2') && allTiles.includes(`Enquiry rate ${Math.round((2 / (40 + todayViews(1))) * 1000) / 10} per 100 views`), allTiles)
  check('the overview chart covers all listings', await together().getByRole('slider').getAttribute('aria-label') === 'Day, all listings, last 7 days')
  savesDown = true; await seller.reload()
  const partial = (await together().locator('dl').innerText()).replace(/\s+/g, ' ')
  check('one source failing is said as unavailable, never 0, and the rest still stands', partial.includes('Saved now Unavailable') && partial.includes(`Views, last 7 days ${40 + todayViews(1)}`) && await together().locator('[data-chart="daily-activity"]').isVisible(), partial)
  savesDown = false

  await seller.goto(BASE + `/dashboard/performance?listing=${id('d', 2)}`)
  check('the enquiry rate appears from 20 views', await seller.getByText('5 enquiries per 100 views').isVisible())
  check('previous period stated as a plain figure', (await seller.getByRole('region', { name: 'This listing, last 7 days', exact: true }).locator('dl').innerText()).includes('Previous 7 days: not tracked'))
  await seller.goto(BASE + `/dashboard/performance?listing=${id('d', 9)}`)
  check('a listing that is not yours is not shown', await seller.getByRole('heading', { name: 'This listing is not available here' }).isVisible())

  // ── A listing that leaves public view ───────────────────────────────────
  listings = listings.map((l) => (l.id === id('d', 1) ? { ...l, status: 'DRAFT', activated_at: null, expires_at: null } : l))
  await b.goto(BASE + '/account/saved')
  check('a saved listing that is no longer public stays, saying so', await b.getByRole('heading', { name: 'Listing no longer available' }).isVisible())
  check('and its sized photo stops at once', (await b.request.get(photoSrc.href)).status() === 404)
  await b.getByRole('button', { name: 'Remove unavailable listing from saved' }).click(); await waitFor(() => savedListings.length === 0, 'unsave')
  check('it can still be removed', savedListings.length === 0)
  const before = viewCalls.length, viewsBefore = todayViews(1); await o.goto(BASE + L1)
  check('a withdrawn listing has no public page to count', (await o.locator('h1').innerText()).length > 0 && todayViews(1) === viewsBefore && viewCalls.length === before)
  listings = listings.map((l) => (l.id === id('d', 1) ? { ...l, status: 'ACTIVE', activated_at: at(-20), expires_at: at(40) } : l))

  // ── Honest states and layout ────────────────────────────────────────────
  const foreignContext = await context('b'), f = await foreignContext.newPage(); await f.goto(BASE + '/dashboard/performance')
  check('another account sees none of these listings', await f.getByRole('heading', { name: 'No listings to measure yet' }).isVisible())
  const foreignHtml = await (await foreignContext.request.get(BASE + `/dashboard/performance?listing=${id('d', 2)}`)).text()
  check('another seller asking for a listing by id gets no figures and no chart', /No listings to measure yet|This listing is not available here/.test(foreignHtml) && !foreignHtml.includes('data-chart="daily-activity"') && !foreignHtml.includes('3 BHK flat for sale in Salt Lake'))
  check('the chart payload carries no buyer details', !detailHtml.includes(buyer) && !/private@example\.com|buyer_name|buyer_phone/.test(detailHtml))
  activityMissing = true; await seller.goto(BASE + '/dashboard/performance')
  check('before the migration the page says data is not available yet', await seller.getByRole('alert').getByText('Performance data is not available yet').isVisible())
  activityMissing = false

  mkdirSync('/tmp/phase20-shots', { recursive: true })
  for (const width of [320, 360, 375, 390, 412, 430, 768, 1280]) {
    await seller.setViewportSize({ width, height: 900 })
    for (const path of ['/dashboard/performance', `/dashboard/performance?listing=${id('d', 2)}&range=30`]) {
      await seller.goto(BASE + path)
      if (path.includes('listing')) await seller.getByText('Daily figures').click()
      await assertWorkspace(seller, { area: 'owner', check, ...(!path.includes('listing') ? { compactRow: listingRows().first(), maxRowHeight: 96 } : {}) })
      const fit = await seller.locator('[data-chart="daily-activity"]').evaluate((f) => {
        const box = f.getBoundingClientRect(), ticks = [...f.querySelectorAll('[data-tick]')].map((t) => t.getBoundingClientRect()).filter((b) => b.width > 0)
        return { inside: box.left >= 0 && box.right <= innerWidth && ticks.every((b) => b.left >= box.left - 1 && b.right <= box.right + 1), apart: ticks.every((b, i) => i === 0 || b.left >= ticks[i - 1].right + 4), shown: ticks.length, plot: f.querySelector('svg').getBoundingClientRect().height }
      })
      check(`the chart fits, keeps its height and its date labels never collide at ${width} on ${path}`, fit.inside && fit.apart && fit.shown >= 3 && fit.plot === 160, JSON.stringify(fit))
      const small = await seller.locator('main a, main button, main summary').evaluateAll((els) => els.map((e) => ({ text: e.textContent.trim().slice(0, 40), height: e.getBoundingClientRect().height })).filter((e) => e.height > 0 && e.height < 44))
      check(`controls are at least 44px at ${width} on ${path}`, small.length === 0, JSON.stringify(small))
      await seller.screenshot({ path: `/tmp/phase20-shots/${path.includes('listing') ? 'detail' : 'overview'}-${width}.png`, fullPage: true })
    }
    await b.setViewportSize({ width, height: 900 }); await b.goto(BASE + L1)
    check(`listing page with save control has no overflow at ${width}`, await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  // ── Route isolation: the chart downloads only with the seller's analytics (performance, My properties) ──
  const scriptsOn = async (page, path) => { await page.goto(BASE + path); return page.locator('script[src]').evaluateAll((list) => list.map((e) => e.src)) }
  const chartChunks = []
  for (const src of await scriptsOn(seller, '/dashboard/performance')) if ((await (await seller.request.get(src)).text()).includes('data-chart-tooltip')) chartChunks.push(src)
  check('the chart code is found on the performance page', chartChunks.length > 0)
  // UI-18: My properties shows buyer interest with the same chart, so it
  // downloads there too — and still on no public or other seller route.
  check('the chart code also downloads with My properties (its buyer-interest panel)', (await scriptsOn(seller, '/dashboard')).some((src) => chartChunks.includes(src)))
  for (const [page, path] of [[g, '/'], [g, '/buy/kolkata'], [g, L1], [g, '/login'], [g, '/this-page-does-not-exist'], [seller, '/dashboard/enquiries']]) {
    const sources = await scriptsOn(page, path)
    check(`no chart code downloads on ${path}`, sources.length > 0 && !sources.some((src) => chartChunks.includes(src)))
  }
  unavailable = true; await seller.goto(BASE + '/dashboard/performance')
  check('an outage is an error, never an empty page', await seller.getByRole('alert').getByText('Performance could not be loaded').isVisible())
  unavailable = false
  check('no client runtime errors', errors.length === 0, errors.join('\n'))
  console.log(count + ' listing performance browser checks passed')
} finally { await browser.close(); await new Promise((r) => mock.close(r)) }
