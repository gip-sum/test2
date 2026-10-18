// Fixture Auth/REST simulator for the style comparison (scripts/style-diff.mjs).
//
// The signed-in workspace (seller dashboard, enquiries, performance, admin)
// only renders against a Supabase API, so this answers the endpoints those
// screens read with fixed rows: one listing per lifecycle status, enquiries,
// a few days of views, and an admin overview. Shapes follow the browser
// checks' simulators (dashboard-check, performance-check, admin-check).
// Test values only; no credentials exist here.
//
// The app must run with SUPABASE_URL=http://127.0.0.1:3300
// SUPABASE_PUBLISHABLE_KEY=test-public-key SUPABASE_SERVICE_ROLE_KEY=test-service-key.
import http from 'node:http'
import sharp from 'sharp'

export const OWNER_TOKEN = 'a'.repeat(48)
export const ADMIN_TOKEN = 'b'.repeat(48)

const owner = 'a9140f33-a429-46f3-9514-3e8f32f18189', admin = 'b9140f33-a429-46f3-9514-3e8f32f18189'
const DAY = 86_400_000
// Dates are relative to a fixed noon (India time) on the capture day, so two
// captures made the same day see identical relative dates.
const anchor = (() => { const d = new Date(); d.setUTCHours(6, 30, 0, 0); return d.getTime() })()
const at = (days) => new Date(anchor + days * DAY).toISOString()
const indiaDay = (offset = 0) => new Date(anchor + 5.5 * 3_600_000 + offset * DAY).toISOString().slice(0, 10)
const id = (kind, n) => `${kind}9140f33-a429-46f3-9514-${String(n).padStart(12, '0')}`

const draftFields = { role: 'OWNER', intent: 'buy', type: 'APARTMENT', bhk: '2', baths: '2', unit: 'sqft', carpet: '1000', furnishing: 'UNFURNISHED', floor: '3', floors: '8', status: 'READY', age: '4', city: 'kolkata', locality: 'new-town', address: 'Test building address', saleprice: '6000000', maintenance: 'none', negotiable: 'yes' }
const reason = 'Please replace the entrance photograph with one taken in daylight and confirm the carpet area against the sale agreement.'
const plan = [
  { n: 1, title: null },
  { n: 2, title: '3 BHK flat for sale in Salt Lake', listing: { status: 'UNDER_REVIEW' } },
  { n: 3, title: '2 BHK flat for sale in New Town', listing: { status: 'ACTIVE', activated_at: at(-10), expires_at: at(30) } },
  { n: 4, title: '1 BHK flat for rent in Behala', intent: 'rent', listing: { status: 'ACTIVE', activated_at: at(-80), expires_at: at(3) } },
  { n: 5, title: 'Villa for sale in Rajarhat', listing: { status: 'ACTIVE', activated_at: at(-95), expires_at: at(-2) } },
  { n: 6, title: '4 BHK flat for sale in Ballygunge', listing: { status: 'REJECTED', rejection_reason: reason } },
  { n: 7, title: 'Studio for rent in Park Street', intent: 'rent', listing: { status: 'DRAFT' }, withdrawnFrom: 'ACTIVE' },
]
const drafts = plan.map(({ n }) => ({ id: id('c', n), owner_id: owner, collection_id: id('f', n), revision: 1, created_at: at(-40), updated_at: at(-n), page_path: '/post', ...draftFields }))
const listings = plan.filter((p) => p.listing).map(({ n, listing }) => ({ id: id('d', n), owner_id: owner, draft_id: id('c', n), current_submission_id: id('e', n), version: 2, created_at: at(-40), updated_at: at(-n), activated_at: null, expires_at: null, rejection_reason: null, ...listing }))
const submissions = plan.filter((p) => p.listing).map(({ n, title, intent = 'buy' }) => ({ id: id('e', n), listing_id: id('d', n), title, seller_name: 'Test Seller', seller_type: 'OWNER', intent, property_type: 'APARTMENT', bedrooms: 2, bathrooms: 2, area_unit: 'sqft', carpet_area: 1000, built_up_area: null, super_area: null, furnishing: 'UNFURNISHED', floor: 3, total_floors: 8, construction_status: 'READY', age_years: 4, possession_by: null, available_from: intent === 'rent' ? 'now' : null, city_name: 'Kolkata', locality_name: 'New Town', city_id: 'kolkata', locality_id: 'new-town', sub_locality_id: null, society_name: null, address: 'Test building address', latitude: null, longitude: null, price: intent === 'rent' ? 25000 : 6000000, deposit: intent === 'rent' ? 100000 : null, maintenance_status: 'none', maintenance_monthly: null, negotiable: true, created_at: at(-20) }))
const events = plan.filter((p) => p.withdrawnFrom).flatMap(({ n, withdrawnFrom }) => [{ id: 2, listing_id: id('d', n), from_status: withdrawnFrom, to_status: 'DRAFT', reason: null, actor_type: 'OWNER', actor_id: owner, created_at: at(-1) }, { id: 1, listing_id: id('d', n), from_status: null, to_status: 'DRAFT', reason: null, actor_type: 'OWNER', actor_id: owner, created_at: at(-30) }])
const enquiries = [1, 2, 3].map((k) => ({ id: id('7', k), listing_public_id: null, listing_id: id('d', 3), listing_title: '2 BHK flat for sale in New Town', buyer_id: null, seller_id: owner, buyer_name: `Buyer ${k}`, buyer_phone: `+91987654321${k}`, message: k === 1 ? 'Is the flat still available? I would like to visit this weekend.' : null, duplicate_of: null, status: k === 3 ? 'contacted' : 'new', created_at: at(-k) }))
const accounts = [
  { id: owner, email: 'seller@example.test', full_name: 'Test Seller', created_at: at(-60), last_sign_in_at: at(-1), status: 'ACTIVE', seller_role: 'OWNER', version: 1, staff_role: null, operator_managed: false },
  { id: id('6', 1), email: 'suspended.account@example.test', full_name: null, created_at: at(-30), last_sign_in_at: null, status: 'SUSPENDED', seller_role: null, version: 2, staff_role: null, operator_managed: false },
  { id: admin, email: 'staff@example.test', full_name: 'Staff Admin', created_at: at(-90), last_sign_in_at: at(0), status: 'ACTIVE', seller_role: null, version: 0, staff_role: 'ADMIN', operator_managed: true },
]
const views = new Map([[`${id('d', 3)}|${indiaDay(-1)}`, 40], [`${id('d', 3)}|${indiaDay(-2)}`, 12], [`${id('d', 4)}|${indiaDay(-1)}`, 7]])

const adminRow = (n, status, daysAgo, extra = {}) => ({ id: id('d', 100 + n), status, title: `Listing ${n}`, seller_name: `Seller ${n}`, seller_type: 'OWNER', intent: 'buy', price: 6000000 + n, locality_name: 'New Town', city_name: 'Kolkata', submitted_at: at(-daysAgo), updated_at: at(-daysAgo / 2), activated_at: null, expires_at: null, ...extra })
const adminListings = [adminRow(1, 'UNDER_REVIEW', 3.1), adminRow(2, 'UNDER_REVIEW', 0.1), ...Array.from({ length: 6 }, (_, i) => adminRow(10 + i, 'ACTIVE', 20 + i, { activated_at: at(-10), expires_at: at(30) })), adminRow(3, 'EXPIRED', 100, { expires_at: at(-1) }), adminRow(4, 'REJECTED', 4), adminRow(5, 'WITHDRAWN', 6), adminRow(6, 'REMOVED', 9)]
const overview = { listings: adminListings.reduce((acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }), {}), drafts_never_submitted: 4, queue: { waiting: 2, oldest_since: at(-3.1) }, leads: { last_7_days: 5, last_30_days: 12, real_listings_30_days: 7, no_seller_30_days: 3, untouched_over_2_days: 1 }, users: { total: 42, new_7_days: 6, with_listings: 9, staff: 1 } }
const system = { migrations: [{ version: '20261014032608', name: 'phase_20_listing_analytics' }], expiry_job: null, expiry_backlog: 1, last_expiry_at: at(-0.5), oldest_review_since: at(-3.1), checked_at: at(0) }

const active = (l) => l.status === 'ACTIVE' && Date.parse(l.expires_at) > Date.now()
const dayOf = (iso) => new Date(Date.parse(iso) + 5.5 * 3_600_000).toISOString().slice(0, 10)
function where(rows, params) {
  return rows.filter((row) => [...params].every(([key, value]) => {
    const m = /^(eq|in|is)\.(.*)$/.exec(value)
    if (!m || ['select', 'order', 'limit'].includes(key)) return true
    const field = row[key]
    return m[1] === 'eq' ? String(field) === m[2] : m[1] === 'in' ? m[2].slice(1, -1).split(',').includes(String(field)) : m[2] === 'null' ? field == null : true
  }))
}

export async function startWorkspaceSimulator(port = 3300) {
  const jpeg = await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 85, g: 119, b: 85 } } }).jpeg().toBuffer()
  const photos = submissions.map((s) => ({ id: id('9', Number(s.id.slice(-2))), submission_id: s.id, object_path: `${s.id}/photo.jpg`, position: 0, width: 640, height: 480, bytes: jpeg.length }))
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c)
    const url = new URL(req.url, 'http://localhost'), raw = Buffer.concat(chunks).toString(), p = url.searchParams
    const body = raw ? JSON.parse(raw) : {}
    const token = req.headers.authorization?.slice(7) ?? req.headers.apikey
    const user = { [OWNER_TOKEN]: owner, [ADMIN_TOKEN]: admin }[token] ?? null
    const service = token === 'test-service-key', publicRead = token === 'test-public-key'
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
    if (url.pathname === '/auth/v1/health') return send(200, { version: 'test' })
    if (url.pathname === '/auth/v1/user') return user ? send(200, { id: user, email: 'private@example.com' }) : send(401, {})
    if (url.pathname === '/rest/v1/rpc/my_account_access') return send(200, true)
    if (url.pathname.startsWith('/storage/v1/object/')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(jpeg) }
    if (!user && !service && !publicRead) return send(401, {})
    const mine = (rows) => rows.filter((r) => r.owner_id === user)
    const staff = user === admin
    switch (url.pathname) {
      // Two saved demo homes for the Saved screen (UI-12); nothing else reads them.
      case '/rest/v1/saved_properties': return send(200, user === owner ? [{ property_public_id: 'p_5d40ab', created_at: at(-2) }, { property_public_id: 'p_9c17f4', created_at: at(-5) }] : [])
      case '/rest/v1/saved_listings': case '/rest/v1/property_draft_reviews': case '/rest/v1/media_assets': return send(200, [])
      case '/rest/v1/buyer_profiles': return send(200, user === owner ? [{ id: owner, full_name: 'Test Seller', contact_phone: null, preferred_intent: 'both', preferred_locality: null, email_updates: false, updated_at: at(-1) }] : [])
      case '/rest/v1/property_drafts': return send(200, where(mine(drafts), p))
      case '/rest/v1/property_listings': return send(200, where(user ? mine(listings) : publicRead ? listings.filter(active) : [], p))
      case '/rest/v1/property_listing_events': return send(200, where(events.filter((e) => listings.some((l) => l.id === e.listing_id && l.owner_id === user)), p).sort((a, b) => b.id - a.id))
      case '/rest/v1/property_listing_submissions': return send(200, where(submissions.filter((s) => listings.find((x) => x.id === s.listing_id)?.owner_id === user), p))
      case '/rest/v1/property_listing_photos': return send(200, where(photos, p))
      case '/rest/v1/seller_notifications': return send(200, user === owner ? enquiries.filter((e) => e.status === 'new').map((e) => ({ id: e.id })) : [])
      case '/rest/v1/enquiries': return send(200, where(enquiries.filter((e) => e.seller_id === user), p).sort((a, b) => b.created_at.localeCompare(a.created_at)))
      case '/rest/v1/listing_analytics_meta': return send(200, [{ views_since: at(-3) }])
      case '/rest/v1/rpc/seller_listing_enquiry_counts': {
        const counts = new Map()
        for (const e of enquiries.filter((x) => x.seller_id === user && x.listing_id)) { const c = counts.get(e.listing_id) ?? { listing_id: e.listing_id, total: 0, new_count: 0, latest_at: e.created_at }; c.total++; if (e.status === 'new') c.new_count++; counts.set(e.listing_id, c) }
        return send(200, [...counts.values()])
      }
      case '/rest/v1/rpc/seller_listing_activity': {
        const owned = new Set(mine(listings).map((l) => l.id)), rows = new Map()
        for (const [k, v] of views) { const [lid, d] = k.split('|'); if (owned.has(lid) && d >= body.p_from && d <= body.p_to) rows.set(k, { listing_id: lid, day: d, views: v, enquiries: 0 }) }
        for (const e of enquiries.filter((x) => x.seller_id === user)) { const d = dayOf(e.created_at), k = `${e.listing_id}|${d}`; if (d < body.p_from || d > body.p_to) continue; const r = rows.get(k) ?? { listing_id: e.listing_id, day: d, views: 0, enquiries: 0 }; r.enquiries++; rows.set(k, r) }
        return send(200, [...rows.values()])
      }
      case '/rest/v1/rpc/seller_listing_save_counts': return send(200, user === owner ? [{ listing_id: id('d', 3), saves: 2 }] : [])
      case '/rest/v1/rpc/my_staff_role': return send(200, staff ? 'ADMIN' : null)
      case '/rest/v1/rpc/admin_overview': return staff ? send(200, overview) : send(403, {})
      case '/rest/v1/rpc/admin_system_status': return staff ? send(200, system) : send(403, {})
      case '/rest/v1/rpc/moderation_queue': {
        if (!staff) return send(403, {})
        const rows = adminListings.filter((l) => l.status === 'UNDER_REVIEW').sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
        return send(200, { rows: rows.slice(body.p_offset, body.p_offset + body.p_limit), total: rows.length })
      }
      // Account and review screens (UI-11): fixed rows in the shapes users-check and moderation-check use.
      case '/rest/v1/rpc/admin_users': return staff ? send(200, { rows: accounts, total: accounts.length, page: 1 }) : send(403, {})
      case '/rest/v1/rpc/admin_user': {
        const account = staff && accounts.find((a) => a.id === body.p_user)
        if (!account) return send(404, { code: 'P0002' })
        const listed = account.id === owner ? listings.filter((l) => l.status !== 'DRAFT').map((l) => ({ id: l.id, title: submissions.find((s) => s.listing_id === l.id).title, status: l.status, seller_type: 'OWNER', created_at: l.created_at })) : []
        const leads = account.id === owner ? enquiries.map((e) => ({ id: e.id, listing_id: e.listing_id, listing_title: e.listing_title, direction: 'received', status: e.status, created_at: e.created_at })) : []
        const changes = account.id === owner ? [{ id: id('5', 1), status_before: 'ACTIVE', status_after: 'ACTIVE', role_before: null, role_after: 'OWNER', reason: 'Classified from the listings this account submitted.', actor_id: admin, version_before: 0, version_after: 1, created_at: at(-5) }] : []
        const page = (rows) => ({ rows, total: rows.length, page: 1 })
        return send(200, { account, contact_phone: null, preferred_intent: null, listings: page(listed), leads: page(leads), changes: page(changes) })
      }
      case '/rest/v1/rpc/moderation_review': {
        const listing = staff && listings.find((l) => l.id === body.p_listing)
        if (!listing) return send(404, { code: 'P0002' })
        return send(200, { listing, submission: submissions.find((s) => s.id === listing.current_submission_id), photos: [], history: [] })
      }
      case '/rest/v1/rpc/admin_listings': {
        if (!staff) return send(403, {})
        const rows = adminListings.filter((l) => !body.p_status || l.status === body.p_status).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        return send(200, rows.slice(body.p_offset, body.p_offset + body.p_limit).map((r) => ({ ...r, total: rows.length })))
      }
    }
    return send(404, {})
  })
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
  return server
}
