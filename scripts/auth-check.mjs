/** Browser-level Phase 6 checks with a deterministic local Auth API. */
import http from 'node:http'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const USER = { id: 'a9140f33-a429-46f3-9514-3e8f32f18189', email: 'buyer@example.com', email_confirmed_at: new Date().toISOString() }
let requests = 0
let lastOtp = null
let refreshes = 0
let logouts = 0
const sessions = new Set()
const mock = http.createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
  const url = new URL(request.url, 'http://127.0.0.1:3300')
  const send = (status, data) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)) }
  if (url.pathname === '/auth/v1/otp') {
    requests++
    lastOtp = body
    return send(200, {})
  }
  if (url.pathname === '/auth/v1/verify') {
    if (body.email !== USER.email || body.token !== '123456' || body.type !== 'email') return send(403, { msg: 'invalid' })
    sessions.add('a'.repeat(48))
    return send(200, { access_token: 'a'.repeat(48), refresh_token: 'r'.repeat(48), expires_in: 3600, user: USER })
  }
  if (url.pathname === '/auth/v1/user') return sessions.has(request.headers.authorization?.slice(7)) ? send(200, USER) : send(401, {})
  if (url.pathname === '/auth/v1/token') {
    refreshes++
    if (!['r'.repeat(48), 's'.repeat(48)].includes(body.refresh_token)) return send(401, {})
    sessions.add('b'.repeat(48))
    return send(200, { access_token: 'b'.repeat(48), refresh_token: 's'.repeat(48), expires_in: 3600, user: USER })
  }
  if (url.pathname === '/auth/v1/logout') { logouts++; sessions.delete(request.headers.authorization?.slice(7)); return send(204, {}) }
  send(404, {})
})
await new Promise((resolve) => mock.listen(3300, '127.0.0.1', resolve))
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
let assertions = 0
let failures = 0
function check(name, success) {
  assertions++
  if (!success) failures++
  console.log(`  ${success ? 'ok  ' : 'FAIL'} ${name}`)
}
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const redirect = await page.request.get(BASE + '/account', { maxRedirects: 0 })
  check('account guard redirects signed-out visitor', redirect.status() === 307 && redirect.headers().location?.includes('/login?next=%2Faccount'))
  await page.goto(BASE + '/login?mode=register&next=%2Faccount')
  check('registration renders labelled email input', await page.getByRole('heading', { name: 'Create your account' }).isVisible() && await page.getByRole('textbox', { name: 'Email address' }).isVisible())
  await page.getByRole('textbox', { name: 'Email address' }).fill('buyer@example.com')
  await page.getByRole('button', { name: 'Create account with email' }).click()
  await page.getByRole('textbox', { name: 'Six-digit code' }).waitFor()
  check('OTP request reached provider', requests === 1)
  check('registration permits account creation', lastOtp?.create_user === true)
  await page.getByRole('textbox', { name: 'Six-digit code' }).fill('000000')
  await page.getByRole('button', { name: 'Verify and continue' }).click()
  check('wrong code has accessible error', await page.getByRole('alert').getByText(/invalid or expired/)
    .waitFor({ timeout: 5000 }).then(() => true).catch(() => false))
  await page.getByRole('textbox', { name: 'Six-digit code' }).fill('123456')
  await page.getByRole('button', { name: 'Verify and continue' }).click()
  await page.waitForURL('**/account')
  check('valid code creates signed-in account state', await page.getByText(USER.email).isVisible())
  const c = await context.cookies()
  check('tokens stored in HTTP-only cookies', c.some((cookie) => cookie.name === 'gb-access' && cookie.httpOnly && cookie.sameSite === 'Lax') &&
    c.some((cookie) => cookie.name === 'gb-refresh' && cookie.httpOnly))
  check('token is absent from rendered HTML', !(await page.content()).includes('a'.repeat(48)))
  check('signed-in navigation opens account', await page.getByRole('link', { name: 'Account' }).first()
    .waitFor({ timeout: 5000 }).then(() => true).catch(() => false))
  await context.addCookies([{ name: 'gb-access', value: 'invalid', url: BASE, httpOnly: true }])
  await page.reload()
  check('expired token refreshes session', refreshes >= 1 && await page.getByText(USER.email).isVisible())
  await context.addCookies([{ name: 'gb-access', value: 'invalid', url: BASE, httpOnly: true }])
  await page.goto(BASE + '/login')
  check('login entry refreshes and redirects an existing session', new URL(page.url()).pathname === '/account' && refreshes >= 2)
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.waitForURL('**/login')
  check('logout revokes provider session and clears cookies', logouts === 1 && !(await context.cookies()).some((cookie) => cookie.name === 'gb-access'))
  const after = await page.request.get(BASE + '/account', { maxRedirects: 0 })
  check('guard rejects signed-out session again', after.status() === 307)
  await context.addCookies([{ name: 'gb-access', value: 'forged-token', url: BASE, httpOnly: true }])
  const forged = await page.request.get(BASE + '/account', { maxRedirects: 0 })
  check('forged access cookie does not grant account access', forged.status() === 307)
  await context.clearCookies()
  await page.goto(BASE + '/login?next=https%3A%2F%2Fevil.example')
  check('unsafe return target never leaves site', await page.locator('input[name=next]').count() === 0)
  await page.getByRole('textbox', { name: 'Email address' }).fill('buyer@example.com')
  await page.getByRole('button', { name: 'Send sign-in code' }).click()
  await page.getByRole('textbox', { name: 'Six-digit code' }).waitFor()
  check('login does not create an unknown user', requests === 2 && lastOtp?.create_user === false)
  for (const width of [390, 412, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    check(`auth view fits ${width}px`, size[0] <= size[1])
  }
  await context.close()
} finally {
  await browser.close()
  await new Promise((resolve) => mock.close(resolve))
}
console.log(`\n${assertions - failures}/${assertions} auth assertions passed`)
process.exitCode = failures ? 1 : 0
