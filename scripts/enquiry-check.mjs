/** Phase 9 browser flow against isolated Auth, REST and seller-notification providers. */
import http from 'node:http'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const SECRET = 'test-secret-key-for-phase-nine'
const users = {
  ['a'.repeat(48)]: { id: 'a9140f33-a429-46f3-9514-3e8f32f18189', email: 'first@example.com' },
  ['b'.repeat(48)]: { id: 'b9140f33-a429-46f3-9514-3e8f32f18189', email: 'second@example.com' },
}
const rows = []
let notifyFail = false
let providerFail = false
let notifications = 0

const mock = http.createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  let body = {}
  try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch {}
  const url = new URL(request.url, 'http://127.0.0.1:3300')
  const token = request.headers.authorization?.slice(7)
  const user = users[token]
  const admin = request.headers.apikey === SECRET
  const send = (status, data) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)) }

  if (url.pathname === '/auth/v1/user') return send(user ? 200 : 401, user ?? {})
  if (url.pathname === '/notify') {
    notifications++
    if (!request.headers['x-gharbazaar-signature']?.startsWith('sha256=')) return send(401, {})
    return send(notifyFail ? 503 : 202, {})
  }
  if (url.pathname !== '/rest/v1/enquiries') return send(404, {})
  if (providerFail) return send(503, {})

  if (request.method === 'POST' && admin) {
    const previous = rows.filter((row) => row.property_public_id === body.property_public_id && row.buyer_phone === body.buyer_phone).at(-1)
    const row = { ...body, duplicate_of: previous?.id ?? null, id: `00000000-0000-4000-8000-${String(rows.length + 1).padStart(12, '0')}`, status: 'NEW', created_at: new Date().toISOString() }
    rows.push(row)
    return send(201, [row])
  }
  if (request.method === 'PATCH' && admin) {
    const id = url.searchParams.get('id')?.replace(/^eq\./, '')
    const row = rows.find((item) => item.id === id)
    if (!row) return send(404, {})
    Object.assign(row, body)
    response.writeHead(204)
    return response.end()
  }
  if (request.method === 'GET' && user) return send(200, rows.filter((row) => row.buyer_id === user.id).reverse())
  return send(403, {})
})

await new Promise((resolve) => mock.listen(3300, '127.0.0.1', resolve))
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
let total = 0
let failures = 0
function check(label, success) { total++; if (!success) failures++; console.log(`${success ? 'ok' : 'FAIL'} ${label}`) }
const listing = '/property/3-bhk-flat-for-sale-in-new-town-p8f3c2a'

async function submit(page, name, phone, message = '') {
  await page.getByRole('textbox', { name: 'Your name' }).fill(name)
  await page.getByRole('textbox', { name: 'Mobile number' }).fill(phone)
  if (message) await page.getByRole('textbox', { name: /Message/ }).fill(message)
  await page.getByRole('button', { name: 'Send enquiry' }).click()
  await page.getByText(/^Enquiry sent(?: again)?$/).waitFor()
}

try {
  const guest = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const guestPage = await guest.newPage()
  await guestPage.goto(BASE + listing)
  await submit(guestPage, 'Guest Buyer', '98765 43210')
  check('guest enquiry persists without creating an account', rows.length === 1 && rows[0].buyer_id === null && rows[0].buyer_phone === '+919876543210')
  check('seller webhook receives signed notification', notifications === 1 && await guestPage.getByText(/notification was accepted for delivery/).isVisible())
  check('guest is not offered another buyer history', await guestPage.getByRole('link', { name: 'View your enquiry history' }).count() === 0)
  await guest.close()

  const first = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await first.addCookies([{ name: 'gb-access', value: 'a'.repeat(48), url: BASE, httpOnly: true }])
  const page = await first.newPage()
  await page.goto(BASE + listing)
  await submit(page, 'Signed In Buyer', '9123456780', 'Please call after 6 pm.')
  check('signed-in lead is associated with verified buyer', rows.at(-1)?.buyer_id === users['a'.repeat(48)].id)
  check('signed-in success links to private history', await page.getByRole('link', { name: 'View your enquiry history' }).isVisible())
  await page.goto(BASE + listing)
  await submit(page, 'Signed In Buyer', '+91 91234 56780')
  check('repeat lead is retained and linked to previous attempt', rows.length === 3 && rows.at(-1)?.duplicate_of === rows.at(-2)?.id && await page.getByText(/repeat enquiry/i).isVisible())

  notifyFail = true
  await page.goto(BASE + listing)
  await submit(page, 'Signed In Buyer', '9988776655')
  check('notification failure does not discard lead or claim delivery', rows.length === 4 && rows.at(-1)?.notification_status === 'FAILED' && await page.getByText(/could not notify/).isVisible())
  notifyFail = false

  await page.goto(BASE + '/account/enquiries')
  check('buyer history contains only signed-in buyer leads', await page.locator('article').count() === 3 && await page.getByText('Guest Buyer').count() === 0)
  check('history shows repeat, delivery and lead states', await page.getByText('Repeat enquiry').count() === 1 && await page.locator('span').getByText('Sent', { exact: true }).count() === 3)
  for (const width of [390, 412, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    check(`enquiry history fits ${width}px`, scroll <= client)
  }

  const second = await browser.newContext()
  await second.addCookies([{ name: 'gb-access', value: 'b'.repeat(48), url: BASE, httpOnly: true }])
  const other = await second.newPage()
  await other.goto(BASE + '/account/enquiries')
  check('another buyer cannot see first buyer history', await other.getByText('No enquiries yet').isVisible())
  await second.close()

  providerFail = true
  await page.goto(BASE + listing)
  await page.getByRole('textbox', { name: 'Your name' }).fill('Retry Buyer')
  await page.getByRole('textbox', { name: 'Mobile number' }).fill('9000000001')
  await page.getByRole('button', { name: 'Send enquiry' }).click()
  await page.waitForTimeout(500)
  check('provider outage is an error and does not claim success', await page.getByRole('alert').getByText(/temporarily unavailable/).isVisible() && rows.length === 4)
  await first.close()
} finally {
  await browser.close()
  await new Promise((resolve) => mock.close(resolve))
}
console.log(`${total - failures}/${total} enquiry checks passed`)
process.exitCode = failures ? 1 : 0
