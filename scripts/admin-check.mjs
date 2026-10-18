// Phase 21 browser assertions: the admin console against a local simulator
// of the Auth and REST APIs (test values only; no credentials exist here).
//
// Needs the app on 3101 started with
//   SUPABASE_URL=http://127.0.0.1:3300 SUPABASE_PUBLISHABLE_KEY=test-public-key
//   SUPABASE_SERVICE_ROLE_KEY=test-service-key AUTH_SITE_URL=http://localhost:3101
// The script owns the simulator on port 3300.
import http from 'node:http'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { assertWorkspace } from './workspace-assertions.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3101'
const admin = 'b9140f33-a429-46f3-9514-3e8f32f18189', seller = 'a9140f33-a429-46f3-9514-3e8f32f18189'
const DAY = 86_400_000, at = (days) => new Date(Date.now() + days * DAY).toISOString()
const id = (n) => `d9140f33-a429-46f3-9514-${String(n).padStart(12, '0')}`
const row = (n, status, submittedDaysAgo, extra = {}) => ({ id: id(n), status, title: `Listing ${n}`, seller_name: `Seller ${n}`, seller_type: 'OWNER', intent: 'buy', price: 6000000 + n, locality_name: 'New Town', city_name: 'Kolkata', submitted_at: at(-submittedDaysAgo), updated_at: at(-submittedDaysAgo / 2), activated_at: null, expires_at: null, ...extra })
// Two in the queue (one waiting 3 days), 30 active to page through, one of each other status.
// 3.1 days, not 3: a wait measured a few milliseconds before the data was
// read must not sit on an hour boundary.
const listings = [row(1, 'UNDER_REVIEW', 3.1), row(2, 'UNDER_REVIEW', 0.1), ...Array.from({ length: 30 }, (_, i) => row(10 + i, 'ACTIVE', 20 + i, { activated_at: at(-10), expires_at: at(30) })), row(3, 'EXPIRED', 100, { expires_at: at(-1) }), row(4, 'REJECTED', 4), row(5, 'WITHDRAWN', 6), row(6, 'REMOVED', 9)]
const overview = () => ({
  listings: listings.reduce((acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }), {}),
  drafts_never_submitted: 4, queue: { waiting: 2, oldest_since: at(-3.1) },
  leads: { last_7_days: 5, last_30_days: 12, real_listings_30_days: 7, no_seller_30_days: 3, untouched_over_2_days: 1 },
  users: { total: 42, new_7_days: 6, with_listings: 9, staff: 1 },
})
const system = () => ({ migrations: [{ version: '20261014032608', name: 'phase_20_listing_analytics' }], expiry_job: null, expiry_backlog: 1, last_expiry_at: at(-0.5), oldest_review_since: at(-3.1), checked_at: new Date().toISOString() })
let overviewDown = false, unavailable = false

const mock = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c)
  const url = new URL(req.url, 'http://localhost'), body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
  const token = req.headers.authorization?.slice(7)
  const user = { ['b'.repeat(48)]: admin, ['a'.repeat(48)]: seller }[token] ?? null
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  if (url.pathname === '/auth/v1/health') return send(200, { version: 'test' })
  if (url.pathname === '/auth/v1/user') return user ? send(200, { id: user, email: 'private@example.com' }) : send(401, {})
  if (url.pathname === '/rest/v1/rpc/my_account_access') return send(200, true)
  if (!user) return send(401, {})
  if (unavailable) return send(503, {})
  const staff = user === admin
  switch (url.pathname) {
    case '/rest/v1/rpc/my_staff_role': return send(200, staff ? 'ADMIN' : null)
    case '/rest/v1/rpc/admin_overview': return !staff ? send(403, {}) : overviewDown ? send(503, {}) : send(200, overview())
    case '/rest/v1/rpc/admin_system_status': return staff ? send(200, system()) : send(403, {})
    case '/rest/v1/rpc/moderation_queue': {
      if (!staff) return send(403, {})
      const rows = listings.filter(l => l.status === 'UNDER_REVIEW').sort((a,b) => a.submitted_at.localeCompare(b.submitted_at))
      return send(200, { rows: rows.slice(body.p_offset, body.p_offset + body.p_limit), total: rows.length })
    }
    case '/rest/v1/rpc/admin_listings': {
      if (!staff) return send(403, {})
      const rows = listings.filter((l) => !body.p_status || l.status === body.p_status)
        .sort((a, b) => body.p_status === 'UNDER_REVIEW' ? a.submitted_at.localeCompare(b.submitted_at) : b.updated_at.localeCompare(a.updated_at))
      return send(200, rows.slice(body.p_offset, body.p_offset + body.p_limit).map((r) => ({ ...r, total: rows.length })))
    }
    case '/rest/v1/saved_properties': case '/rest/v1/saved_listings': return send(200, [])
  }
  return send(404, {})
})
await new Promise((r) => mock.listen(3300, '127.0.0.1', r))

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? chromium.executablePath() })
let count = 0
const check = (name, ok, detail = '') => { if (!ok) throw Error(`${name} ${detail}`); count++; console.log('ok', name) }
async function context(token) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  if (token) await c.addCookies([{ name: 'gb-access', value: token.repeat(48), url: BASE }])
  return c
}

try {
  const guest = await (await context()).newPage()
  await guest.goto(BASE + '/admin/listings?status=review')
  const login = new URL(guest.url())
  check('a guest is sent to log in and returned to the same view', login.pathname === '/login' && login.searchParams.get('next') === '/admin/listings?status=review')

  const outsider = await (await context('a')).newPage()
  for (const path of ['/admin', '/admin/listings', '/admin/moderation', '/admin/system']) {
    const response = await outsider.goto(BASE + path)
    check(`${path} is an ordinary 404 for an account that is not staff`, response.status() === 404 && await outsider.getByText(/Staff only/).count() === 0)
  }

  const page = await (await context('b')).newPage(), errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(BASE + '/admin')
  await page.getByRole('heading', { level: 1, name: 'Admin overview' }).waitFor()
  check('staff see the console and their role', await page.getByText('Staff only · signed in as admin').isVisible() && await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Overview' }).getAttribute('aria-current') === 'page')
  const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
  check('the queue is described in words with its oldest wait', text.includes('2 listings are waiting for review.') && text.includes('Oldest wait: 3 days 2 hours — over 2 days.'), text)
  check('lead figures are counts only', text.includes('5 enquiries in the last 7 days; 12 in 30 days.') && text.includes('3 enquiries in 30 days reached no seller') && !/\+91/.test(text))
  check('user figures are counts only', text.includes('42 accounts in total; 6 new in the last 7 days.') && !text.includes('private@example.com'))
  check('the system summary reports the worst state, not OK', text.includes('need attention (worst: problem)'))
  check('no Reports placeholder before Phase 24', !/\bReports\b/.test(text))

  // Listings: filter, order, pages — all in the URL.
  await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Listings' }).click()
  await page.getByRole('heading', { level: 2, name: /All submitted listings/ }).waitFor()
  check('every status has a real count', (await page.getByRole('navigation', { name: 'Filter by status' }).innerText()).replace(/\s+/g, ' ').includes('All 36 Under review 2 Active 30 Expired 1 Rejected 1 Corrections requested 0 Withdrawn 1 Removed 1'))
  await page.getByRole('link', { name: /^Under review/ }).click(); await page.waitForURL('**/admin/listings?status=review')
  await page.getByRole('heading', { level: 2, name: /Under review/ }).waitFor()
  const queueRows = page.locator('table tbody tr')
  check('the review filter reads oldest first with waiting times', await queueRows.count() === 2 && (await queueRows.first().innerText()).includes('Listing 1') && (await queueRows.first().innerText()).includes('3 days 2 hours — over 2 days'))
  await page.goto(BASE + '/admin/listings?status=active')
  check('25 rows per page', await page.locator('table tbody tr').count() === 25)
  await page.getByRole('link', { name: 'Page 2' }).click(); await page.waitForURL('**/admin/listings?status=active&page=2')
  await page.getByRole('link', { name: 'Page 2' }).and(page.locator('[aria-current="page"]')).waitFor()
  check('the second page holds the rest', await page.locator('table tbody tr').count() === 5)
  await page.reload()
  check('filter and page survive reload', await page.locator('table tbody tr').count() === 5 && await page.getByRole('link', { name: /^Active/ }).getAttribute('aria-current') === 'page')
  await page.goto(BASE + '/admin/listings?status=nonsense&page=99')
  check('unknown filters fall back to all, and a page past the end is empty, not an error', await page.getByRole('heading', { level: 2, name: /All submitted listings \(36\)/ }).isVisible() && await page.getByText('No listings have this status.').isVisible())
  check('the empty page is the shared EmptyState, titled for a page past the end, with a way back', await page.getByRole('heading', { level: 3, name: 'No listings on this page', exact: true }).isVisible() && await page.getByRole('link', { name: 'Show all listings', exact: true }).getAttribute('href') === '/admin/listings')

  // Moderation queue.
  await page.goto(BASE + '/admin/moderation')
  check('the queue opens immutable copies for staff decisions', await page.getByText(/Open a submitted copy to review its facts and photos/).isVisible())
  check('the queue lists both waiting listings, oldest first', (await page.locator('table tbody tr').allInnerTexts()).map((t) => t.includes('Listing 1') ? 1 : t.includes('Listing 2') ? 2 : 0).join() === '1,2')

  // System status.
  await page.goto(BASE + '/admin/system')
  const checks = (await page.locator('section').filter({ has: page.getByRole('heading', { name: 'Data and jobs', exact: true }) }).getByRole('listitem').allInnerTexts()).join(' | ')
  check('a scheduler it cannot see reads Unknown, never OK', /Unknown\s+Listing expiry job\s+The scheduler cannot be inspected from here\./.test(checks), checks)
  check('missing migrations are named', checks.includes('20261014044042_phase_21_admin_console'))
  check('expiry backlog is a problem in words', /Problem\s+Expired listings marked\s+1 active listing is more than 2 hours past expiry/.test(checks))
  check('settings report presence only, never values', (await page.locator('main').innerText()).includes('SUPABASE_SERVICE_ROLE_KEY is set.') && !(await page.locator('main').innerText()).includes('test-service-key'))
  check('the sign-in provider is timed', /OK\s+Sign-in provider\s+Reachable \(\d+ ms\)\./.test(await page.locator('main').innerText()))

  // Honest failure states.
  overviewDown = true; await page.goto(BASE + '/admin')
  check('an unreadable overview says so and the rest still renders', await page.getByRole('alert').getByText('The overview could not be loaded.').isVisible() && await page.getByRole('heading', { name: 'System status' }).isVisible())
  overviewDown = false

  mkdirSync('/tmp/phase21-shots', { recursive: true })
  for (const width of [320, 360, 375, 390, 412, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/admin', '/admin/listings?status=review', '/admin/moderation', '/admin/system']) {
      await page.goto(BASE + path)
      await assertWorkspace(page, { area: 'admin', check, ...(path.startsWith('/admin/listings') || path === '/admin/moderation' ? { compactRow: page.locator('table tbody tr').first(), maxRowHeight: 160 } : {}) })
      const small = await page.locator('main a, main button').evaluateAll((els) => els.map((e) => ({ text: e.textContent.trim().slice(0, 40), height: e.getBoundingClientRect().height })).filter((e) => e.height > 0 && e.height < 44))
      check(`controls are at least 44px at ${width} on ${path}`, small.length === 0, JSON.stringify(small))
      await page.screenshot({ path: `/tmp/phase21-shots/${path.split('?')[0].replaceAll('/', '_')}-${width}.png`, fullPage: true })
    }
  }
  unavailable = true; await page.goto(BASE + '/admin')
  check('when the role cannot be confirmed, even staff get a 404 rather than a half-working console', await page.getByText('Staff only').count() === 0)
  unavailable = false
  check('no client runtime errors', errors.length === 0, errors.join('\n'))
  console.log(count + ' admin console browser checks passed')
} finally { await browser.close(); await new Promise((r) => mock.close(r)) }
