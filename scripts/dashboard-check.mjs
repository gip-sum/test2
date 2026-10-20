// Phase 19 browser assertions: the seller dashboard and enquiries on real
// listings, against a local simulator of the Auth, REST and Storage APIs
// (test values only; no credentials exist here).
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
const owner = 'a9140f33-a429-46f3-9514-3e8f32f18189', foreign = 'b9140f33-a429-46f3-9514-3e8f32f18189'
const DAY = 86_400_000, at = (days) => new Date(Date.now() + days * DAY).toISOString()
const id = (kind, n) => `${kind}9140f33-a429-46f3-9514-${String(n).padStart(12, '0')}`
const jpeg = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#557755' } }).jpeg().toBuffer()
const draftFields = { role: 'OWNER', intent: 'buy', type: 'APARTMENT', bhk: '2', baths: '2', unit: 'sqft', carpet: '1000', furnishing: 'UNFURNISHED', floor: '3', floors: '8', status: 'READY', age: '4', city: 'kolkata', locality: 'new-town', address: 'Test building address', saleprice: '6000000', maintenance: 'none', negotiable: 'yes' }
const longReason = 'Please replace the entrance photograph with one taken in daylight and confirm the carpet area against the sale agreement '.repeat(3).trim()

// One property per status. n is the draft number; listings and submissions share it.
const plan = [
  { n: 1, title: null },
  { n: 2, title: '3 BHK flat for sale in Salt Lake', listing: { status: 'UNDER_REVIEW' } },
  { n: 3, title: '2 BHK flat for sale in New Town', listing: { status: 'ACTIVE', activated_at: at(-10), expires_at: at(30) } },
  { n: 4, title: '1 BHK flat for rent in Behala', intent: 'rent', listing: { status: 'ACTIVE', activated_at: at(-80), expires_at: at(3) } },
  { n: 5, title: 'Villa for sale in Rajarhat', listing: { status: 'ACTIVE', activated_at: at(-95), expires_at: at(-2) } },
  { n: 6, title: '4 BHK flat for sale in Ballygunge', listing: { status: 'REJECTED', rejection_reason: longReason } },
  { n: 7, title: 'Studio for rent in Park Street', intent: 'rent', listing: { status: 'DRAFT' }, withdrawnFrom: 'ACTIVE' },
  { n: 8, title: 'Old listing in Garia', listing: { status: 'DELETED' } },
]
const drafts = plan.map(({ n }) => ({ id: id('c', n), owner_id: owner, collection_id: id('f', n), revision: 1, created_at: at(-40), updated_at: at(-n), page_path: '/post', ...draftFields }))
let listings = plan.filter((p) => p.listing).map(({ n, listing }) => ({ id: id('d', n), owner_id: owner, draft_id: id('c', n), current_submission_id: id('e', n), version: 2, created_at: at(-40), updated_at: at(-n), activated_at: null, expires_at: null, rejection_reason: null, ...listing }))
const submissions = plan.filter((p) => p.listing).map(({ n, title, intent = 'buy' }) => ({ id: id('e', n), listing_id: id('d', n), title, seller_name: 'Test Seller', seller_type: 'OWNER', intent, property_type: 'APARTMENT', bedrooms: 2, bathrooms: 2, area_unit: 'sqft', carpet_area: 1000, built_up_area: null, super_area: null, furnishing: 'UNFURNISHED', floor: 3, total_floors: 8, construction_status: 'READY', age_years: 4, possession_by: null, available_from: intent === 'rent' ? 'now' : null, city_name: 'Kolkata', locality_name: 'New Town', city_id: 'kolkata', locality_id: 'new-town', sub_locality_id: null, society_name: null, address: 'Test building address', latitude: null, longitude: null, price: intent === 'rent' ? 25000 : 6000000, deposit: intent === 'rent' ? 100000 : null, maintenance_status: 'none', maintenance_monthly: null, negotiable: true, created_at: at(-20) }))
const photos = submissions.map((s) => ({ id: id('9', Number(s.id.slice(-2))), submission_id: s.id, object_path: `${s.id}/photo.jpg`, position: 0, width: 640, height: 480, bytes: jpeg.length }))
// The rented Behala flat answers more questions than the others and has six
// photos, so the public page (UI-16 layout) shows the mosaic, a society,
// maintenance and a description; the New Town flat stays one photo, no society.
Object.assign(submissions.find((s) => s.listing_id === id('d', 4)), { society_name: 'SAMPLE Palm Court', maintenance_status: 'separate', maintenance_monthly: 2500, description: 'SAMPLE description: a bright rented flat near the market.' })
for (let k = 1; k <= 5; k++) photos.push({ id: id('8', 40 + k), submission_id: id('e', 4), object_path: `${id('e', 4)}/photo-${k}.jpg`, position: k, width: 640, height: 480, bytes: jpeg.length })
const events = plan.filter((p) => p.withdrawnFrom).flatMap(({ n, withdrawnFrom }) => [{ id: 2, listing_id: id('d', n), from_status: withdrawnFrom, to_status: 'DRAFT', reason: null, actor_type: 'OWNER', actor_id: owner, created_at: at(-1) }, { id: 1, listing_id: id('d', n), from_status: null, to_status: 'DRAFT', reason: null, actor_type: 'OWNER', actor_id: owner, created_at: at(-30) }])
const enquiries = [1, 2].map((k) => ({ id: id('7', k), listing_public_id: null, listing_id: id('d', 3), listing_title: '2 BHK flat for sale in New Town', buyer_id: null, seller_id: owner, buyer_name: `Buyer ${k}`, buyer_phone: `+91987654321${k}`, message: null, duplicate_of: null, status: 'new', created_at: at(-k) }))
const serviceCalls = []
let unavailable = false, countsMissing = false, lifecycleDelay = 0

const active = (l) => l.status === 'ACTIVE' && Date.parse(l.expires_at) > Date.now()
function where(rows, params) {
  return rows.filter((row) => [...params].every(([key, value]) => {
    const m = /^(eq|in|is)\.(.*)$/.exec(value)
    if (!m || ['select', 'order', 'limit'].includes(key)) return true
    const field = row[key]
    return m[1] === 'eq' ? String(field) === m[2] : m[1] === 'in' ? m[2].slice(1, -1).split(',').includes(String(field)) : m[2] === 'null' ? field == null : true
  }))
}
const mock = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c)
  const url = new URL(req.url, 'http://localhost'), body = Buffer.concat(chunks).toString(), p = url.searchParams
  const token = req.headers.authorization?.slice(7) ?? req.headers.apikey
  const user = token === 'a'.repeat(48) ? owner : token === 'b'.repeat(48) ? foreign : null, service = token === 'test-service-key', publicRead = token === 'test-public-key'
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  if (url.pathname === '/auth/v1/user') return user ? send(200, { id: user, email: 'private@example.com' }) : send(401, {})
  if (url.pathname === '/rest/v1/rpc/my_account_access') return send(200, true)
  if (!user && !service && !publicRead) return send(401, {})
  if (unavailable) return send(503, {})
  const mine = (rows, field = 'owner_id') => rows.filter((r) => r[field] === user)
  switch (url.pathname) {
    case '/rest/v1/saved_properties': case '/rest/v1/property_draft_reviews': case '/rest/v1/media_assets': return send(200, [])
    case '/rest/v1/buyer_profiles': return send(200, user === owner ? [{ id: owner, full_name: 'Test Seller', contact_phone: null, preferred_intent: 'both', preferred_locality: null, email_updates: false, updated_at: at(-1) }] : [])
    case '/rest/v1/property_drafts': return send(200, where(mine(drafts), p))
    case '/rest/v1/property_listings': return send(200, where(user ? mine(listings) : publicRead ? listings.filter(active) : [], p))
    case '/rest/v1/property_listing_events': return send(200, where(events.filter((e) => listings.some((l) => l.id === e.listing_id && l.owner_id === user)), p).sort((a, b) => b.id - a.id))
    case '/rest/v1/property_listing_submissions': return send(200, where(submissions.filter((s) => { const l = listings.find((x) => x.id === s.listing_id); return user ? l?.owner_id === user : publicRead && l && active(l) && l.current_submission_id === s.id }), p))
    case '/rest/v1/property_listing_photos': return send(200, where(photos, p))
    case '/rest/v1/seller_notifications': return send(200, user === owner ? enquiries.filter((e) => e.status === 'new').map((e) => ({ id: e.id })) : [])
    case '/rest/v1/enquiries': return send(200, where(enquiries.filter((e) => e.seller_id === user || e.buyer_id === user), p).sort((a, b) => b.created_at.localeCompare(a.created_at)))
    case '/rest/v1/rpc/seller_listing_enquiry_counts': {
      if (countsMissing) return send(404, {})
      const counts = new Map()
      for (const e of enquiries.filter((x) => x.seller_id === user && x.listing_id)) { const c = counts.get(e.listing_id) ?? { listing_id: e.listing_id, total: 0, new_count: 0, latest_at: e.created_at }; c.total++; if (e.status === 'new') c.new_count++; counts.set(e.listing_id, c) }
      return send(200, [...counts.values()])
    }
    case '/rest/v1/rpc/submit_listing_enquiry': {
      const b = JSON.parse(body), l = listings.find((x) => x.id === b.p_listing)
      if (!l || !active(l)) return send(410, {})
      if (user === l.owner_id) return send(403, {})
      const previous = enquiries.find((e) => e.listing_id === l.id && e.buyer_phone === b.p_phone)
      enquiries.push({ id: id('7', enquiries.length + 1), listing_public_id: null, listing_id: l.id, listing_title: submissions.find((s) => s.id === l.current_submission_id).title, buyer_id: user, seller_id: l.owner_id, buyer_name: b.p_name, buyer_phone: b.p_phone, message: b.p_message, duplicate_of: previous?.id ?? null, status: 'new', created_at: new Date().toISOString() })
      return send(200, [{ enquiry_id: enquiries.at(-1).id, repeated: Boolean(previous), seller_notified: true }])
    }
    case '/rest/v1/rpc/change_property_listing': {
      if (!service) return send(403, {})
      const b = JSON.parse(body), l = listings.find((x) => x.id === b.p_listing)
      serviceCalls.push(b)
      if (lifecycleDelay) await new Promise((r) => setTimeout(r, lifecycleDelay))
      if (!l || l.owner_id !== b.p_owner || l.version !== b.p_version) return send(400, {})
      const next = b.p_action === 'delete' ? 'DELETED' : 'DRAFT'
      events.unshift({ id: events.length + 10, listing_id: l.id, from_status: l.status, to_status: next, reason: null, actor_type: 'OWNER', actor_id: owner, created_at: new Date().toISOString() })
      listings = listings.map((x) => (x === l ? { ...l, status: next, version: l.version + 1, updated_at: new Date().toISOString(), activated_at: null, expires_at: null } : x))
      return send(200, [listings.find((x) => x.id === l.id)])
    }
  }
  if (url.pathname.startsWith('/storage/v1/object/authenticated/listing-photos/')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(jpeg) }
  return send(404, {})
})
await new Promise((r) => mock.listen(3300, '127.0.0.1', r))

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? chromium.executablePath() })
let count = 0
const check = (name, ok, detail = '') => { if (!ok) throw Error(`${name} ${detail}`); count++; console.log('ok', name) }
async function context(token, width = 1280) {
  const c = await browser.newContext({ viewport: { width, height: 900 } })
  if (token) await c.addCookies([{ name: 'gb-access', value: token.repeat(48), url: BASE }])
  return c
}
const filterCounts = async (page) => Object.fromEntries(await page.getByRole('navigation', { name: 'Filter by status' }).getByRole('link').evaluateAll((links) => links.map((a) => { const [label, n] = [a.childNodes[0].textContent, a.querySelector('span').textContent]; return [label, Number(n)] })))
const cards = (page) => page.locator('section[aria-labelledby="properties-heading"] article')
const card = (page, title) => cards(page).filter({ has: page.getByRole('heading', { name: title, exact: true }) })

try {
  const guest = await context(), g = await guest.newPage()
  await g.goto(BASE + '/dashboard?status=active')
  const login = new URL(g.url())
  check('guest is sent to log in and returned to the same view', login.pathname === '/login' && login.searchParams.get('next') === '/dashboard?status=active')

  const c = await context('a'), page = await c.newPage(), errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(BASE + '/dashboard')
  await page.getByRole('heading', { level: 1, name: 'My properties' }).waitFor()
  check('summary counts each property once and leaves Removed out', JSON.stringify(await filterCounts(page)) === JSON.stringify({ All: 7, Drafts: 1, 'Under review': 1, Active: 2, Expired: 1, Rejected: 1, 'Corrections requested': 0, Withdrawn: 1 }), JSON.stringify(await filterCounts(page)))
  check('one card per property', await cards(page).count() === 7)
  const removed = page.locator('details')
  check('Removed is a collapsed group outside the list', await removed.count() === 1 && !(await removed.evaluate((d) => d.open)) && (await removed.locator('summary').innerText()).includes('Removed (1)'))
  check('Withdrawn is derived from history', (await card(page, 'Studio for rent in Park Street').innerText()).includes('Withdrawn'))
  check('a listing past expiry shows Expired before the hourly job', (await card(page, 'Villa for sale in Rajarhat').innerText()).includes('Expired'))
  check('expiring listing is flagged in words', (await card(page, '1 BHK flat for rent in Behala').innerText()).includes('Expires in 3 days'))
  check('expiring-soon notice counts it', await page.getByText('1 active listing expires within 7 days.').isVisible())
  check('rejection reason shown in full', (await card(page, '4 BHK flat for sale in Ballygunge').innerText()).includes(longReason))
  check('never-submitted draft shows section progress, not a fake status', (await card(page, '2 BHK flat / apartment for sale in New Town').innerText()).includes('4 of 4 sections complete'))
  check('enquiry counts come from the database', await card(page, '2 BHK flat for sale in New Town').getByRole('link', { name: /2 enquiries · 2 new/ }).isVisible())
  check('a listing with no enquiries says so rather than hiding it', (await card(page, '1 BHK flat for rent in Behala').innerText()).includes('No enquiries yet'))
  check('withdrawn card links to removal on the publishing page', await card(page, 'Studio for rent in Park Street').getByRole('link', { name: /Remove listing/ }).getAttribute('href') === `/post/drafts/${id('c', 7)}/lifecycle#remove-listing`)

  // URL is the state.
  await page.getByRole('navigation', { name: 'Filter by status' }).getByRole('link', { name: /^Active/ }).click()
  await page.waitForURL('**/dashboard?status=active')
  await page.getByRole('heading', { level: 2, name: 'Active (2)' }).waitFor()
  check('filter is a link that changes the URL and marks itself current', await cards(page).count() === 2 && await page.getByRole('link', { name: /^Active/ }).getAttribute('aria-current') === 'page')
  await page.getByRole('link', { name: 'Expiring soonest' }).click()
  await page.waitForURL('**/dashboard?status=active&sort=expiring')
  await page.getByRole('link', { name: 'Expiring soonest' }).and(page.locator('[aria-current="page"]')).waitFor()
  check('sort by expiry puts the soonest first', await cards(page).first().getByRole('heading').innerText() === '1 BHK flat for rent in Behala')
  await page.reload()
  check('refresh keeps filter and sort', await cards(page).count() === 2 && await page.getByRole('link', { name: 'Expiring soonest' }).getAttribute('aria-current') === 'page')
  await page.goBack(); await page.waitForURL('**/dashboard?status=active')
  await page.getByRole('link', { name: 'Recently updated' }).and(page.locator('[aria-current="page"]')).waitFor()
  await page.goBack(); await page.waitForURL(/\/dashboard$/)
  await page.getByRole('heading', { level: 2, name: 'All properties (7)' }).waitFor()
  check('back returns through earlier views', await cards(page).count() === 7)

  // Enquiry count → filtered inbox.
  await card(page, '2 BHK flat for sale in New Town').getByRole('link', { name: /2 enquiries/ }).click()
  await page.waitForURL(`**/dashboard/enquiries?listing=${id('d', 3)}`)
  check('enquiry count opens the inbox narrowed to that listing', await page.getByRole('heading', { level: 1, name: 'Enquiries for 2 BHK flat for sale in New Town' }).isVisible() && await page.locator('main article').count() === 2)

  // Copy link.
  await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin })
  await page.goto(BASE + '/dashboard?status=active')
  await card(page, '2 BHK flat for sale in New Town').getByRole('button', { name: /Copy link/ }).click()
  await page.getByText('Link copied').waitFor()
  check('copy link copies the public listing address', await page.evaluate(() => navigator.clipboard.readText()) === `${BASE}/listing/${id('d', 3)}`)

  // Withdraw through the Phase 18 endpoint, with confirmation.
  await page.goto(BASE + '/dashboard?status=review')
  const review = card(page, '3 BHK flat for sale in Salt Lake')
  await review.getByRole('button', { name: /Withdraw/ }).click()
  check('withdraw asks first and moves focus to the question', await page.evaluate(() => document.activeElement?.textContent ?? '').then((t) => t.startsWith('Withdraw “3 BHK flat for sale in Salt Lake”?')))
  await review.getByRole('button', { name: 'Cancel' }).click()
  check('cancel leaves the listing untouched', serviceCalls.length === 0 && await review.getByRole('button', { name: /Withdraw/ }).isVisible())
  await review.getByRole('button', { name: /Withdraw/ }).click()
  // UI-09: busy keeps focus, a second press sends nothing, and after the
  // refresh — where this card has left the "Under review" view — focus lands
  // on the list heading with the outcome announced.
  lifecycleDelay = 800
  const yes = review.getByRole('button', { name: 'Yes, withdraw' })
  await yes.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  const busy = await page.evaluate(() => { const el = document.activeElement; return { text: el?.textContent, busy: el?.getAttribute('aria-busy'), unavailable: el?.getAttribute('aria-disabled') } })
  await page.keyboard.press('Enter')
  check('withdrawing: the pressed button stays focused, busy and unavailable; a second press sends nothing', busy.text === 'Withdrawing…' && busy.busy === 'true' && busy.unavailable === 'true' && serviceCalls.length === 1, JSON.stringify({ busy, calls: serviceCalls.length }))
  lifecycleDelay = 0
  await page.getByText('No properties have this status.').waitFor()
  await page.waitForFunction(() => document.activeElement?.id === 'properties-heading', null, { timeout: 5000 }).catch(() => {})
  check('after withdrawing, focus is on the list heading (the card left this view) and the outcome is announced', await page.evaluate(() => document.activeElement?.id) === 'properties-heading' &&
    await page.locator('#a11y-announcer').textContent() === '3 BHK flat for sale in Salt Lake withdrawn. It is no longer public.')
  check('an emptied filter says which: the shared empty state, under the list heading', await page.getByRole('heading', { level: 3, name: 'Nothing under review' }).isVisible() &&
    await page.getByRole('link', { name: 'Show all properties' }).isVisible())
  check('withdraw sends the card version through the lifecycle endpoint', serviceCalls.length === 1 && serviceCalls[0].p_action === 'withdraw' && serviceCalls[0].p_version === 2)
  check('counts follow the withdrawal', JSON.stringify(await filterCounts(page)) === JSON.stringify({ All: 7, Drafts: 1, 'Under review': 0, Active: 2, Expired: 1, Rejected: 1, 'Corrections requested': 0, Withdrawn: 2 }))

  // Public enquiry on a real listing reaches the owner's inbox.
  const buyer = await context(), bp = await buyer.newPage()
  bp.on('pageerror', (e) => errors.push(e.message))
  await bp.goto(BASE + `/listing/${id('d', 3)}`)
  const form = bp.locator('aside form')
  await form.getByLabel('Your name').fill('Asha Roy'); await form.getByLabel('Mobile number').fill('98300 12345'); await form.getByLabel('Message').fill('Is the flat east facing?')
  await form.getByRole('button', { name: 'Send enquiry' }).click()
  await bp.getByRole('status').filter({ hasText: 'Enquiry sent' }).waitFor()
  const stored = enquiries.at(-1)
  check('guest enquiry on an active listing is recorded for its owner', stored.buyer_name === 'Asha Roy' && stored.buyer_phone === '+919830012345' && stored.seller_id === owner && stored.listing_id === id('d', 3))
  check('confirmation says the owner has it', await bp.getByText(/can see it in their inbox/).isVisible())
  await page.goto(BASE + `/dashboard/enquiries?listing=${id('d', 3)}`)
  check('the new enquiry appears in the seller inbox', await page.getByText('Asha Roy', { exact: true }).isVisible() && await page.getByText('Is the flat east facing?').isVisible())
  check('each lead\'s status button is a submit named for its buyer (UI-09)', await page.getByRole('button', { name: 'Update status for Asha Roy', exact: true }).getAttribute('type') === 'submit')
  await page.goto(BASE + '/dashboard?status=active')
  check('dashboard count includes it', await card(page, '2 BHK flat for sale in New Town').getByRole('link', { name: /3 enquiries · 3 new/ }).isVisible())

  await bp.setViewportSize({ width: 390, height: 844 }); await bp.reload()
  await bp.getByRole('button', { name: 'Contact owner' }).click()
  check('on a phone the contact bar opens the form in a sheet', await bp.getByRole('dialog', { name: 'Contact owner' }).getByLabel('Mobile number').isVisible())
  const expired = await buyer.newPage(); const gone = await expired.goto(BASE + `/listing/${id('d', 5)}`)
  check('an expired listing has no public page or form', gone.status() === 404)

  const own = await c.newPage(); await own.goto(BASE + `/listing/${id('d', 3)}`)
  check('the owner sees their inbox instead of a form addressed to themselves', await own.getByText('This is your listing').isVisible() && await own.getByLabel('Mobile number').count() === 0)
  check('the owner gets no save heart on their own listing, and the seller section shows beside the panel', await own.getByRole('button', { name: /^Save / }).count() === 0 && await own.getByRole('heading', { name: 'Listed by' }).isVisible())

  // A real listing on the property page's layout and components (UI-16).
  {
    const rp = await buyer.newPage(); await rp.setViewportSize({ width: 1280, height: 900 })
    await rp.goto(BASE + `/listing/${id('d', 4)}`)
    const text = await rp.locator('article').first().innerText()
    check('real listing: the named society heads the page; the summary states rent terms the seller gave', await rp.locator('h1').innerText() === 'SAMPLE Palm Court' &&
      ['Deposit ₹1,00,000', 'Maintenance ₹2,500/mo', 'Negotiable', 'Available now', 'Unfurnished', 'Floor 3 of 8'].every((t) => text.includes(t)), text.slice(0, 400))
    const gallery = rp.getByRole('region', { name: 'Property photos' })
    check('real listing: six photos make the desktop mosaic, and all six are in the viewer', await gallery.getByRole('button', { name: /^View photo \d of 6 full screen$|^View all 6 photos, from photo 5$/ }).count() === 4 &&
      await (async () => { await gallery.getByRole('button', { name: 'View all 6 photos', exact: true }).click(); const n = await rp.getByRole('dialog').getByRole('button', { name: /^View full-screen photo \d of 6$/ }).count(); await rp.keyboard.press('Escape'); await rp.getByRole('dialog').waitFor({ state: 'detached', timeout: 2000 }); return n === 6 })())
    check('real listing: grouped facts and the area panel; no sections it cannot fill', await rp.getByRole('heading', { name: 'The home' }).isVisible() && await rp.getByRole('heading', { name: 'Area breakdown' }).isVisible() &&
      await rp.getByRole('heading', { name: 'Amenities' }).count() === 0 && !text.includes('Nearby') && await rp.getByRole('heading', { name: 'About this property' }).isVisible())
    check('real listing: the seller\'s address, marked unverified', text.includes('Test building address') && text.includes('Seller-provided location. It has not been verified.'))
    const card = rp.locator('aside')
    check('real listing: the contact card names the seller and its category, with the approval note, and no invented claims', await card.getByRole('heading', { name: 'Contact the owner' }).isVisible() &&
      (await card.innerText()).includes('Test Seller') && (await card.innerText()).includes('Approval allows publication') && !/verified seller|rating|responds/i.test(await card.innerText()))
    check('real listing: a signed-out visitor gets the save heart on the photo and Copy link', await gallery.getByRole('button', { name: /^Save / }).isVisible() && await rp.getByRole('button', { name: /^Copy link/ }).isVisible())
    await rp.close()
    const broken = await buyer.newPage(); await broken.setViewportSize({ width: 1280, height: 900 })
    await broken.route('**/*', (route) => route.request().resourceType() === 'image' && /\/listing|photo/.test(route.request().url()) ? route.fulfill({ status: 500, body: '' }) : route.continue())
    await broken.goto(BASE + `/listing/${id('d', 3)}`)
    const fb = broken.locator('[data-photo-frame] [data-photo-fallback]').first()
    await fb.waitFor({ timeout: 8000 })
    const kept = await broken.locator('[data-photo-frame]').first().evaluate((el) => el.getBoundingClientRect().height)
    check('real listing: one photo, failed — the designed fallback keeps the frame; no arrows for one photo', kept > 300 && await broken.getByRole('img', { name: /image could not load/ }).count() > 0 &&
      await broken.getByRole('button', { name: 'Next photo' }).count() === 0 && await broken.getByRole('button', { name: 'View photo full screen' }).isVisible())
    await broken.close()
    const plain = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false })
    const np = await plain.newPage(); await np.goto(BASE + `/listing/${id('d', 4)}`)
    check('real listing without JavaScript: the content and the enquiry form are on the page', await np.locator('h1').isVisible() && await np.getByLabel('Your name').filter({ visible: true }).isVisible() && await np.getByText('Test building address').isVisible())
    // Below 1024px the visible form is the <noscript> one; the card's copy in
    // the desktop column is not displayed.
    await np.getByLabel('Your name').filter({ visible: true }).fill('No Script Buyer'); await np.getByLabel('Mobile number').filter({ visible: true }).fill('98300 55555')
    await Promise.all([np.waitForLoadState('load'), np.getByRole('button', { name: 'Send enquiry' }).filter({ visible: true }).click()])
    check('real listing without JavaScript: the enquiry posts and is confirmed', await np.getByText(/^Enquiry sent/).first().isVisible() && enquiries.at(-1).buyer_name === 'No Script Buyer' && enquiries.at(-1).listing_id === id('d', 4))
    await plain.close()
  }

  // Lifecycle page anchor the dashboard links to.
  await page.goto(BASE + `/post/drafts/${id('c', 7)}/lifecycle#remove-listing`)
  check('removal anchor exists on the publishing page', await page.locator('#remove-listing').count() === 1)

  // Honest states.
  countsMissing = true; await page.goto(BASE + '/dashboard?status=active')
  check('unreadable enquiry counts are reported, not shown as zero', (await card(page, '2 BHK flat for sale in New Town').innerText()).includes('Enquiry counts are unavailable right now.'))
  countsMissing = false
  const other = await context('b'), op = await other.newPage(); await op.goto(BASE + '/dashboard')
  check('another account sees none of these properties', await op.getByRole('heading', { name: 'You have not posted a property yet' }).isVisible() && await op.locator('article').count() === 0)

  // UI-09: withdrawing a card that stays in view returns focus to that card.
  await page.goto(BASE + '/dashboard')
  const behala = card(page, '1 BHK flat for rent in Behala')
  await behala.getByRole('button', { name: /Withdraw/ }).click()
  await behala.getByRole('button', { name: 'Yes, withdraw' }).click()
  await page.waitForFunction(() => document.activeElement?.id?.startsWith('property-'), null, { timeout: 5000 }).catch(() => {})
  check('after withdrawing in the full list, focus returns to that card heading, which now reads Withdrawn', await page.evaluate(() => document.activeElement?.textContent) === '1 BHK flat for rent in Behala' &&
    (await behala.innerText()).includes('Withdrawn'))

  // UI-09: the publishing page — canonical status badge, a busy withdraw that
  // keeps focus, and focus on the refreshed status afterwards.
  await page.goto(BASE + `/post/drafts/${id('c', 3)}/lifecycle`)
  const statusBadge = page.locator('#listing-status [role="status"]')
  check('publishing status is the shared badge in its live tone', (await statusBadge.innerText()) === 'Active' && /bg-status-live-bg/.test(await statusBadge.getAttribute('class')))
  lifecycleDelay = 800
  const toDraft = page.getByRole('button', { name: 'Withdraw to draft' })
  await toDraft.click()
  await page.waitForTimeout(200)
  check('withdraw to draft stays focused and busy while it runs', await page.evaluate(() => document.activeElement?.textContent === 'Withdrawing…' && document.activeElement.getAttribute('aria-busy') === 'true'))
  lifecycleDelay = 0
  await page.waitForFunction(() => document.activeElement?.id === 'listing-status', null, { timeout: 8000 }).catch(() => {})
  check('afterwards focus is on the refreshed status, which reads Draft in the neutral tone', await page.evaluate(() => document.activeElement?.id) === 'listing-status' &&
    (await statusBadge.innerText()) === 'Draft' && /bg-status-neutral-bg/.test(await statusBadge.getAttribute('class')))

  mkdirSync('/tmp/phase19-shots', { recursive: true })
  for (const width of [320, 360, 375, 390, 412, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto(BASE + '/dashboard')
    await page.locator('details summary').click()
    await assertWorkspace(page, { area: 'owner', check, compactRow: card(page, '2 BHK flat for sale in New Town'), maxRowHeight: 224 })
    const small = await page.locator('main a, main button, main summary').evaluateAll((els) => els.map((e) => ({ text: e.textContent.trim().slice(0, 40), height: e.getBoundingClientRect().height })).filter((e) => e.height > 0 && e.height < 44))
    check(`dashboard controls are at least 44px at ${width}`, small.length === 0, JSON.stringify(small))
    // Every card control is hit where it is drawn — nothing overlaps it —
    // and no card is wider than the screen (UI-09).
    const cardControls = await cards(page).locator('a, button').evaluateAll((els) => els.flatMap((el) => {
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect(); if (!r.width) return []
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return at === el || el.contains(at) ? [] : [el.textContent.trim().slice(0, 30)]
    }))
    const wide = await cards(page).evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length)
    check(`card controls are hit where drawn and cards fit the screen at ${width}`, cardControls.length === 0 && wide === 0, JSON.stringify({ cardControls, wide }))
    await page.screenshot({ path: `/tmp/phase19-shots/dashboard-${width}.png`, fullPage: true })
    await bp.setViewportSize({ width, height: 900 }); await bp.goto(BASE + `/listing/${id('d', 3)}`)
    check(`listing page has no horizontal overflow at ${width}`, await bp.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }

  unavailable = true; await page.goto(BASE + '/dashboard')
  check('an outage is an error, never an empty dashboard', await page.getByRole('alert').getByText('Your properties could not be loaded').isVisible() && await page.getByText('You have not posted a property yet').count() === 0)
  unavailable = false
  check('no client runtime errors', errors.length === 0, errors.join('\n'))
  console.log(count + ' seller dashboard browser checks passed')
} finally { await browser.close(); await new Promise((r) => mock.close(r)) }
