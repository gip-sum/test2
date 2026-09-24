/** Phase 8 browser flow against an isolated Auth and REST provider. */
import http from 'node:http'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const users = {
  ['a'.repeat(48)]: { id: 'a9140f33-a429-46f3-9514-3e8f32f18189', email: 'first@example.com' },
  ['b'.repeat(48)]: { id: 'b9140f33-a429-46f3-9514-3e8f32f18189', email: 'second@example.com' },
}
const records = new Map()
let failing = false
const mock = http.createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  let body = {}
  try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch {}
  const url = new URL(request.url, 'http://127.0.0.1:3300')
  const user = users[request.headers.authorization?.slice(7)]
  const send = (status, data) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)) }
  if (url.pathname === '/auth/v1/user') return send(user ? 200 : 401, user ?? {})
  if (url.pathname === '/rest/v1/saved_properties') {
    if (!user) return send(401, {})
    if (failing) return send(503, {})
    const rows = records.get(user.id) ?? new Set()
    if (request.method === 'GET') return send(200, [...rows].map((property_public_id) => ({ property_public_id, created_at: new Date().toISOString() })))
    if (request.method === 'POST' && body.user_id === user.id) {
      rows.add(body.property_public_id); records.set(user.id, rows)
      return send(201, [{ property_public_id: body.property_public_id }])
    }
    if (request.method === 'DELETE') { rows.delete(url.searchParams.get('property_public_id')?.replace(/^eq\./, '')); return send(204, {}) }
    return send(403, {})
  }
  return send(404, {})
})
await new Promise((resolve) => mock.listen(3300, '127.0.0.1', resolve))
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
let total = 0
let failures = 0
function check(label, success) { total++; if (!success) failures++; console.log(`${success ? 'ok' : 'FAIL'} ${label}`) }
const listing = '/property/3-bhk-flat-for-sale-in-new-town-p8f3c2a'
try {
  const guest = await browser.newContext()
  const guestPage = await guest.newPage()
  await guestPage.goto(BASE + listing)
  await guestPage.getByRole('button', { name: /^Save / }).first().waitFor()
  await guestPage.getByRole('button', { name: /^Save / }).first().click()
  await guestPage.waitForURL('**/login?next=*')
  check('guest save opens login with a return to listing', new URL(guestPage.url()).searchParams.get('next') === listing)
  check('guest cannot read shortlist', (await guestPage.request.get(BASE + '/api/saved')).status() === 401)
  await guest.close()

  const first = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await first.addCookies([{ name: 'gb-access', value: 'a'.repeat(48), url: BASE, httpOnly: true }])
  const page = await first.newPage()
  await page.goto(BASE + listing)
  const save = page.getByRole('button', { name: /^Save / }).first()
  await save.waitFor({ state: 'visible' })
  await save.click()
  await page.getByRole('button', { name: /Remove .* from saved/ }).first().waitFor()
  check('saving writes to provider', records.get(users['a'.repeat(48)].id)?.has('p_8f3c2a'))
  await page.reload()
  check('saved heart survives reload', await page.getByRole('button', { name: /Remove .* from saved/ }).first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false))
  await page.goto(BASE + '/account/saved')
  check('shortlist contains saved property', await page.getByRole('heading', { name: 'Saved properties' }).isVisible() && await page.getByRole('button', { name: /Remove .* from saved/ }).first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false))
  for (const width of [390, 412, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    check(`shortlist fits ${width}px`, scroll <= client)
  }
  const second = await browser.newContext()
  await second.addCookies([{ name: 'gb-access', value: 'b'.repeat(48), url: BASE, httpOnly: true }])
  const other = await second.newPage()
  await other.goto(BASE + '/account/saved')
  check('second buyer sees empty shortlist', await other.getByText('Your shortlist is empty').isVisible())
  await second.close()
  await page.getByRole('button', { name: /Remove .* from saved/ }).first().click()
  await page.getByText('Your shortlist is empty').waitFor()
  check('remove persists and renders empty state', !records.get(users['a'.repeat(48)].id)?.has('p_8f3c2a'))
  failing = true
  await page.reload()
  check('storage outage is not presented as empty shortlist', await page.getByRole('alert').getByText(/temporarily unavailable/).isVisible())
  await first.close()
} finally { await browser.close(); await new Promise((resolve) => mock.close(resolve)) }
console.log(`${total - failures}/${total} saved-property checks passed`)
process.exitCode = failures ? 1 : 0
