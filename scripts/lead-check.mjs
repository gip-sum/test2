/** Phase 9 browser flow with isolated Auth and Data API responses. */
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const buyer = { id: 'a9140f33-a429-46f3-9514-3e8f32f18189', email: 'buyer@example.com' }
const seller = { id: 'b9140f33-a429-46f3-9514-3e8f32f18189', email: 'seller@example.com' }
const outsider = { id: 'c9140f33-a429-46f3-9514-3e8f32f18189', email: 'outsider@example.com' }
const users = { ['a'.repeat(48)]: buyer, ['b'.repeat(48)]: seller, ['c'.repeat(48)]: outsider }
const leads = []
const events = []
const notifications = []
let sellerAssigned = false
let failing = false
const mock = http.createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  let body = {}
  try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch {}
  const url = new URL(request.url, 'http://127.0.0.1:3300')
  const user = users[request.headers.authorization?.slice(7)] ?? null
  const send = (status, data) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)) }
  if (url.pathname === '/auth/v1/user') return send(user ? 200 : 401, user ?? {})
  if (url.pathname === '/rest/v1/saved_properties') return send(user ? 200 : 401, [])
  if (url.pathname === '/rest/v1/rpc/submit_enquiry') {
    if (failing) return send(503, {})
    const previous = leads.find((lead) => lead.listing_public_id === body.p_listing_public_id && lead.buyer_phone === body.p_phone)
    const lead = { id: randomUUID(), listing_public_id: body.p_listing_public_id, listing_title: body.p_listing_title,
      buyer_name: body.p_name, buyer_phone: body.p_phone, message: body.p_message, buyer_id: user?.id ?? null,
      seller_id: sellerAssigned ? seller.id : null, duplicate_of: previous?.id ?? null, status: 'new', created_at: new Date().toISOString() }
    leads.push(lead)
    events.push({ enquiry_id: lead.id, event_type: previous ? 'repeated' : 'created', status: 'new', created_at: lead.created_at })
    if (sellerAssigned) notifications.push({ seller_id: seller.id, enquiry_id: lead.id, read_at: null })
    return send(200, [{ enquiry_id: lead.id, repeated: Boolean(previous), seller_notified: sellerAssigned }])
  }
  if (url.pathname === '/rest/v1/rpc/update_lead_status') {
    const lead = leads.find((item) => item.id === body.p_enquiry_id && item.seller_id === user?.id)
    if (!lead || lead.status === body.p_status) return send(200, false)
    lead.status = body.p_status
    events.push({ enquiry_id: lead.id, event_type: 'status_changed', status: lead.status, created_at: new Date().toISOString() })
    return send(200, true)
  }
  if (url.pathname === '/rest/v1/enquiries') {
    if (!user) return send(403, {})
    const view = url.searchParams.has('seller_id') ? 'seller_id' : 'buyer_id'
    return send(200, leads.filter((lead) => lead[view] === user.id).reverse())
  }
  if (url.pathname === '/rest/v1/lead_events') return send(user ? 200 : 403, user ? events.filter((event) => leads.some((lead) => lead.id === event.enquiry_id && [lead.buyer_id, lead.seller_id].includes(user.id))) : {})
  if (url.pathname === '/rest/v1/seller_notifications') {
    if (!user) return send(403, {})
    if (request.method === 'PATCH') { notifications.filter((n) => n.seller_id === user.id).forEach((n) => { n.read_at = body.read_at }); return send(204, {}) }
    return send(200, notifications.filter((n) => n.seller_id === user.id && !n.read_at).map((n) => ({ id: n.enquiry_id })))
  }
  return send(404, {})
})
await new Promise((resolve) => mock.listen(3300, '127.0.0.1', resolve))
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
let total = 0; let failed = 0
function check(label, ok) { total++; if (!ok) failed++; console.log(`${ok ? 'ok' : 'FAIL'} ${label}`) }
const path = '/property/3-bhk-flat-for-sale-in-new-town-p8f3c2a'
async function enquire(context, phone) {
  const page = await context.newPage()
  await page.goto(BASE + path)
  await page.getByRole('textbox', { name: 'Your name' }).first().fill('Test Buyer')
  await page.getByRole('textbox', { name: 'Mobile number' }).first().fill(phone)
  await page.getByRole('button', { name: 'Send enquiry' }).first().click()
  await page.getByRole('status').getByText(/Enquiry sent/).first().waitFor()
  return page
}
try {
  const guest = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const guestPage = await enquire(guest, '9876543210')
  check('guest enquiry persists with no buyer account', leads.length === 1 && leads[0].buyer_id === null)
  check('unassigned listing does not claim seller delivery', await guestPage.getByText(/notification is pending/).isVisible())
  await guest.close()

  sellerAssigned = true
  const buyerContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await buyerContext.addCookies([{ name: 'gb-access', value: 'a'.repeat(48), url: BASE, httpOnly: true }])
  const sent = await enquire(buyerContext, '9876543210')
  check('repeat is stored and flagged', leads.length === 2 && leads[1].duplicate_of === leads[0].id && await sent.getByText('Enquiry sent again').isVisible())
  check('assigned seller receives in-app notification', notifications.length === 1 && await sent.getByText(/can see it in their inbox/).isVisible())
  await sent.goto(BASE + '/account/enquiries')
  check('buyer history shows only signed-in submission', await sent.getByRole('heading', { name: 'My enquiries' }).isVisible() && await sent.locator('article').count() === 1)

  const other = await browser.newContext()
  await other.addCookies([{ name: 'gb-access', value: 'c'.repeat(48), url: BASE, httpOnly: true }])
  const otherPage = await other.newPage()
  await otherPage.goto(BASE + '/account/enquiries')
  check('another buyer cannot read lead', await otherPage.getByText('No enquiries yet').isVisible())
  await other.close()

  const sellerContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await sellerContext.addCookies([{ name: 'gb-access', value: 'b'.repeat(48), url: BASE, httpOnly: true }])
  const inbox = await sellerContext.newPage()
  await inbox.goto(BASE + '/dashboard/enquiries')
  check('seller inbox shows assigned lead and notification', await inbox.getByText('1 unread notification').isVisible() && await inbox.getByText('Follow-up').first().isVisible())
  await inbox.getByRole('button', { name: 'Mark notifications read' }).click()
  await inbox.getByText('0 unread notifications').waitFor()
  check('seller can acknowledge notification', notifications[0].read_at !== null)
  await inbox.getByRole('combobox', { name: 'Lead status' }).selectOption('contacted')
  await inbox.getByRole('button', { name: 'Update status' }).click()
  await inbox.getByRole('combobox', { name: 'Lead status' }).waitFor()
  await sent.reload()
  check('buyer sees updated status across sessions', await sent.getByText(/Status: contacted/).isVisible())
  check('seller status change persists with history', leads[1].status === 'contacted' && events.some((event) => event.enquiry_id === leads[1].id && event.status === 'contacted'))
  for (const width of [390, 412, 768, 1280]) {
    await inbox.setViewportSize({ width, height: 844 })
    const [scroll, client] = await inbox.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    check(`seller inbox fits ${width}px`, scroll <= client)
  }
  failing = true
  await sent.goto(BASE + path)
  await sent.getByRole('textbox', { name: 'Your name' }).first().fill('Test Buyer')
  await sent.getByRole('textbox', { name: 'Mobile number' }).first().fill('9876543211')
  await sent.getByRole('button', { name: 'Send enquiry' }).first().click()
  check('failed write does not claim success', await sent.getByRole('alert').getByText(/could not be saved/).waitFor().then(() => true).catch(() => false))
  await buyerContext.close(); await sellerContext.close()
} finally { await browser.close(); await new Promise((resolve) => mock.close(resolve)) }
console.log(`${total - failed}/${total} lead checks passed`)
process.exitCode = failed ? 1 : 0
