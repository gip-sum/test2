// Browser assertions for the login screen (app/login, components/auth).
//
// Two halves, chosen by what the running server is configured for:
//  - Always: layout at 390/412/768/1280, the controls a phone must reach
//    without scrolling, layout stability, the story's beats in order, the
//    reduced-motion picture, keyboard focus, and no foreign requests.
//  - With the Auth API simulator (the README's auth-check setup): every
//    real UI state — rejected email, throttled and failed provider,
//    pending buttons, code sent, wrong code, success redirect, register,
//    Google error — against provider responses, not a mocked form.
//  - Without it: the honest "sign-in is unavailable" state.
//
// Usage (full run):
//   SUPABASE_URL=http://127.0.0.1:3300 SUPABASE_PUBLISHABLE_KEY=test-public-key \
//   AUTH_SITE_URL=http://localhost:3100 npm start -- -p 3100
//   BASE_URL=http://localhost:3100 npm run login-check
import http from 'node:http'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const USER = { id: 'a9140f33-a429-46f3-9514-3e8f32f18189', email: 'buyer@example.com', email_confirmed_at: new Date().toISOString() }
let passed = 0

function check(label, condition, detail = '') {
  if (!condition) throw new Error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  passed++
  console.log(`ok ${label}`)
}

// ── A local stand-in for the Supabase Auth API ────────────────────────
// Modes provoke real provider responses from outside the app: nothing in
// the application is stubbed.
const provider = { otp: 'ok', verifyDelay: 0, otpRequests: 0, lastOtp: null }
const sessions = new Set()
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const mock = http.createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
  const url = new URL(request.url, 'http://127.0.0.1:3300')
  const send = (status, data) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)) }
  const token = request.headers.authorization?.slice(7)
  if (url.pathname === '/auth/v1/otp') {
    provider.otpRequests++
    provider.lastOtp = body
    if (provider.otp === 'slow') await wait(1500)
    if (provider.otp === 'throttled') return send(429, { msg: 'rate limited' })
    if (provider.otp === 'down') return send(503, { msg: 'unavailable' })
    return send(200, {})
  }
  if (url.pathname === '/auth/v1/verify') {
    await wait(provider.verifyDelay)
    if (body.email !== USER.email || body.token !== '123456' || body.type !== 'email') return send(403, { msg: 'invalid' })
    sessions.add('l'.repeat(48))
    return send(200, { access_token: 'l'.repeat(48), refresh_token: 'm'.repeat(48), expires_in: 3600, user: USER })
  }
  if (url.pathname === '/auth/v1/user') return sessions.has(token) ? send(200, USER) : send(401, {})
  if (url.pathname === '/rest/v1/buyer_profiles') return sessions.has(token) ? send(200, []) : send(401, {})
  send(404, {})
})
await new Promise((resolve) => mock.listen(3300, '127.0.0.1', resolve))
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })

const inViewport = (box, viewport) => box && box.y >= 0 && box.x >= 0 && box.y + box.height <= viewport.height && box.x + box.width <= viewport.width
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
/** Freeze every animation at one moment of the timeline (ms from load). */
const seek = (page, ms) => page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms }), ms)
const matrix = (page, selector) => page.evaluate((s) => {
  const t = getComputedStyle(document.querySelector(s)).transform
  if (t === 'none') return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const m = new DOMMatrixReadOnly(t)
  return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }
}, selector)
const opacity = (page, selector) => page.evaluate((s) => Number(getComputedStyle(document.querySelector(s)).opacity), selector)
const identity = (m) => Math.abs(m.a - 1) < 0.01 && Math.abs(m.d - 1) < 0.01 && Math.abs(m.b) < 0.01 && Math.abs(m.c) < 0.01 && Math.abs(m.e) < 0.2 && Math.abs(m.f) < 0.2

try {
  const probe = await browser.newPage()
  await probe.goto(`${BASE}/login`)
  const configured = await probe.getByText('Account sign-in is unavailable while authentication is being set up.').count() === 0
  await probe.close()
  console.log(configured ? '— server has sign-in configured: full run' : '— server has no sign-in configured: unavailable state')

  // ── Layout at each width ────────────────────────────────────────────
  for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }]) {
    const page = await browser.newPage({ viewport })
    const w = viewport.width
    await page.goto(`${BASE}/login?next=%2Faccount`)
    await page.evaluate(() => document.fonts.ready)
    await check(`${w}px no horizontal overflow`, await noOverflow(page))
    await check(`${w}px one h1, and the scene is decorative`, await page.locator('h1').count() === 1 && await page.locator('.login-art svg.wh-scene[aria-hidden="true"]').count() === 1)
    const art = await page.locator('.login-art').boundingBox()
    const card = await page.locator('.login-card').boundingBox()
    if (w < 1024) {
      await check(`${w}px scene is a compact banner above the form`, art.y + art.height <= card.y + 1 && art.height <= (w < 500 ? 180 : 240), `art ${Math.round(art.height)}px`)
      await check(`${w}px scene tagline is left out on small screens`, !(await page.locator('.login-art-copy').isVisible()))
    } else {
      await check(`${w}px scene has its own column beside the form`, art.x + art.width <= card.x && art.height >= 600 && art.width >= card.width * 0.9, `art ${Math.round(art.width)}×${Math.round(art.height)}, card ${Math.round(card.width)}`)
      await check(`${w}px form is centred against the scene`, Math.abs((art.y + art.height / 2) - (card.y + card.height / 2)) < 40)
      await check(`${w}px tagline sits in the scene`, await page.locator('.login-art-copy').isVisible())
    }
    for (const [ms, sel] of [[1300, '.wh-taxi-body'], [23000, '.wh-rk-hood']]) {
      await seek(page, ms)
      const v = await page.locator(sel).boundingBox()
      await check(`${w}px ${sel === '.wh-taxi-body' ? 'the taxi' : 'the rickshaw'} drives inside the illustration, clear of the form`,
        v && v.y >= art.y && v.y + v.height <= art.y + art.height + 0.5 && (w >= 1024 || v.y + v.height <= card.y), JSON.stringify(v))
    }
    if (w < 700) {
      // Scoped to the card: Next.js renders its own (empty) role="alert" route announcer on every page.
      const target = configured ? page.getByRole('button', { name: 'Send sign-in code' }) : page.locator('.login-card [role="alert"]')
      await check(`${w}px the ${configured ? 'email field and its button are' : 'unavailable notice is'} on the first screen`,
        inViewport(await target.boundingBox(), viewport) && (!configured || inViewport(await page.getByRole('textbox', { name: 'Email address' }).boundingBox(), viewport)))
    }
    await page.close()
  }

  // ── Layout stability through the whole intro ────────────────────────
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const page = await browser.newPage({ viewport })
    await page.addInitScript(() => {
      window.__cls = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto(`${BASE}/login`)
    const before = await page.locator('.login-card').boundingBox()
    await page.waitForTimeout(8600)
    const after = await page.locator('.login-card').boundingBox()
    const cls = await page.evaluate(() => window.__cls)
    await check(`${viewport.width}px no layout shift across the intro (CLS ${cls.toFixed(4)})`, cls < 0.01)
    await check(`${viewport.width}px the form never moves while the scene plays`, Math.abs(before.y - after.y) < 0.5 && Math.abs(before.height - after.height) < 0.5)
    const loops = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.wh-scene') && a.playState === 'running').length)
    // The story's resting loops (about 16) plus the street's: the taxi's
    // drive, wheels and ride, the rickshaw and its moving parts, the tree's
    // leaves, bridge traffic and three windows. A jump well past this means
    // something is animating that should have stopped.
    await check(`${viewport.width}px after the intro only the resting loop runs (${loops} loops)`, loops >= 30 && loops <= 44)
    await page.close()
  }

  // ── The story plays in order ────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const foreign = []
    const errors = []
    page.on('request', (r) => { if (!r.url().startsWith(new URL(BASE).origin) && !r.url().startsWith('data:')) foreign.push(r.url()) })
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${BASE}/login`)
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.wh-scene')).length)
    await check(`the scene animates (${running} animations)`, running >= 40)

    await seek(page, 1300)
    const start = await matrix(page, '.wh-hunter')
    await check('1.3s: the hunter waits by the tea stall, reading the map', start.e < -270 && start.a > 1.1)
    await check('1.3s: door shut, windows dark, no pin yet', (await matrix(page, '.wh-leaf-l')).a > 0.95 && await opacity(page, '.wh-lit') < 0.05 && await opacity(page, '.wh-pin') < 0.05)
    await check('1.3s: the route is plotting itself', await page.evaluate(() => {
      const dots = [...document.querySelectorAll('.wh-dot')].map((d) => Number(getComputedStyle(d).opacity))
      return dots[0] > 0.9 && dots[dots.length - 1] < 0.05
    }))
    // 3.63s is three-quarters through a stride: the front leg is fully back.
    await seek(page, 3630)
    const mid = await matrix(page, '.wh-hunter')
    await check('3.6s: walking the route, mid-lane, mid-stride', mid.e < -40 && mid.e > -250 && !identity(await matrix(page, '.wh-leg-f')))
    await seek(page, 5300)
    const sky = await matrix(page, '.wh-pin')
    await check('5.3s: the pin hangs in the sky, winding up', await opacity(page, '.wh-pin') > 0.95 && sky.f < -150 && sky.d < 0.95)
    await seek(page, 5671)
    const impact = await matrix(page, '.wh-pin')
    await check('5.7s: the pin lands — squashed on impact', Math.abs(impact.f) < 4 && impact.a > 1.1 && impact.d < 0.85)
    await seek(page, 6400)
    const lit = await page.evaluate(() => [...document.querySelectorAll('.wh-lit')].filter((w) => Number(getComputedStyle(w).opacity) > 0.5).length)
    await check(`6.4s: the street is lighting up (${lit} lights on)`, lit >= 8)
    await seek(page, 12000)
    await check('12s: home — door open, every light on, pin at rest, hunter at the door',
      Math.abs((await matrix(page, '.wh-leaf-l')).a - 0.16) < 0.02 &&
      await page.evaluate(() => [...document.querySelectorAll('.wh-lit:not(.wh-twinkle)')].every((w) => Number(getComputedStyle(w).opacity) > 0.99)) &&
      identity(await matrix(page, '.wh-pin')) && identity(await matrix(page, '.wh-hunter')) &&
      await opacity(page, '.wh-cat') > 0.99 && await opacity(page, '.wh-smile') > 0.99)
    await check('nothing is fetched from another origin', foreign.length === 0, foreign.join(', '))
    await check('no script errors', errors.length === 0, errors.join('; '))
    await page.close()
  }

  // ── The street: the taxi drives through first, then comes back ──
  // A fresh page: a one-shot animation seeked past its end and not filling
  // forwards drops out of document.getAnimations(), so the story checks'
  // later seeks would leave the taxi's first pass unreachable.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.goto(`${BASE}/login`)
    // Off-stage is past either edge: right before a pass, left after one.
    const offStage = (e) => e >= 118 || e <= -556
    // One-shot animations first: seeking past their end drops them.
    await seek(page, 1100)
    await check('1.1s: the tree leans in the air the taxi pushes', !identity(await matrix(page, '.wh-tree')))
    await seek(page, 150)
    await check('0.15s: the taxi waits off-stage right, unseen', (await matrix(page, '.wh-taxi')).e >= 118)
    await seek(page, 1300)
    const passing = await matrix(page, '.wh-taxi')
    const wheelF = await matrix(page, '.wh-wheel-f')
    const wheelR = await matrix(page, '.wh-wheel-r')
    await check('1.3s: the taxi is driving through, both wheels turned alike',
      passing.e < -100 && passing.e > -500 && !identity(wheelF) && Math.abs(wheelF.a - wheelR.a) < 1e-6, JSON.stringify({ passing, wheelF, wheelR }))
    // 2.14s: the last moment of the first pass (it ends at 2.15s, and then
    // the loop's off-stage fill takes over, which would prove nothing).
    await seek(page, 2140)
    await check('2.14s: the taxi has cleared the lane before the hunter steps off (2.2s)', (await matrix(page, '.wh-taxi')).e <= -556, JSON.stringify(await matrix(page, '.wh-taxi')))
    await seek(page, 2600)
    await check('2.6s: gone, not parked: it only ever appears driving', (await matrix(page, '.wh-taxi')).e >= 118)
    const spun = async (ms) => { await seek(page, ms); return (await matrix(page, '.wh-wheel-f')).a }
    await check('the wheels turn only while it moves: still between passes', (await spun(6000)) === (await spun(9000)))
    await seek(page, 13100)
    const again = await matrix(page, '.wh-taxi')
    await check('13.1s: it comes back through, calmer', again.e < 0 && again.e > -500)
    await seek(page, 12000)
    await check('12s: the rickshaw is off-stage between passes', (await matrix(page, '.wh-rickshaw')).e <= -63)
    await seek(page, 23000)
    const rk = await matrix(page, '.wh-rickshaw')
    await check('23s: a cycle rickshaw passes the other way in the far lane, in the taxi\'s pause',
      rk.e > 0 && rk.e < 500 && offStage((await matrix(page, '.wh-taxi')).e))
    await seek(page, 29000)
    await check('29s: a window has gone dark for a while', await page.evaluate(() => [...document.querySelectorAll('.wh-switch')].some((w) => Number(getComputedStyle(w).opacity) < 0.2)))

    await page.close()
  }

  // ── Reduced motion: the finished picture, perfectly still ───────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
    await page.goto(`${BASE}/login`)
    const moving = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.login-art')).length)
    await check('reduced motion: nothing in the scene moves', moving === 0)
    await check('reduced motion: the scene is complete, not blank — door open, lights on, pin landed, hunter home',
      Math.abs((await matrix(page, '.wh-leaf-l')).a - 0.16) < 0.02 && await opacity(page, '.wh-lit') > 0.99 &&
      await opacity(page, '.wh-pin') > 0.99 && identity(await matrix(page, '.wh-pin')) &&
      identity(await matrix(page, '.wh-hunter')) && await opacity(page, '.wh-cat') > 0.99 && await opacity(page, '.wh-scene') > 0.99)
    await check('reduced motion: the tagline is shown, unmoving', await opacity(page, '.login-art-copy') > 0.99)
    await check('reduced motion: the taxi is parked in the street, and no passer-by is frozen mid-lane',
      identity(await matrix(page, '.wh-taxi')) && (await matrix(page, '.wh-rickshaw')).e <= -63)
    await page.close()
  }

  if (!configured) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.goto(`${BASE}/login`)
    await check('unconfigured: says sign-in is unavailable, offers no form', await page.getByRole('alert').getByText(/sign-in is unavailable/).isVisible() &&
      await page.getByRole('textbox', { name: 'Email address' }).count() === 0 && await page.getByRole('link', { name: 'Continue with Google' }).count() === 0)
    await page.close()
  } else {
    // ── Keyboard: every control in order, every focus visible ─────────
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
      await page.goto(`${BASE}/login?next=%2Faccount`)
      const seen = []
      for (let i = 0; i < 16 && seen.length < 4; i++) {
        await page.keyboard.press('Tab')
        const focus = await page.evaluate(() => {
          const el = document.activeElement
          if (!el || !el.closest('.login-card')) return null
          const style = getComputedStyle(el)
          return { name: el.getAttribute('aria-label') || el.textContent?.trim() || el.id, ring: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2 }
        })
        if (focus) seen.push(focus)
      }
      await check('Tab order: Google, email, send code, create account', JSON.stringify(seen.map((f) => f.name)) === JSON.stringify(['Continue with Google', 'auth-email', 'Send sign-in code', 'Create an account']), JSON.stringify(seen))
      await check('every focused control shows a focus ring', seen.every((f) => f.ring))
      const google = page.getByRole('link', { name: 'Continue with Google', exact: true })
      await check('Google sign-in keeps its route, safe return path and mark', await google.getAttribute('href') === '/api/auth/google/start?next=%2Faccount' && await google.locator('svg[aria-hidden="true"]').count() === 1)
      await page.close()
    }

    // ── Email step: rejected, throttled, provider down ────────────────
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.goto(`${BASE}/login?next=%2Faccount`)
    const email = page.getByRole('textbox', { name: 'Email address' })
    // Past the browser's own check, to prove the server's.
    await page.locator('form:has(#auth-email)').evaluate((form) => { form.noValidate = true })
    await email.fill('not-an-email')
    await page.getByRole('button', { name: 'Send sign-in code' }).click()
    await page.getByRole('alert').getByText('Enter a valid email address.').waitFor()
    await check('a malformed address is rejected by the server, and focus returns to the field', await page.evaluate(() => document.activeElement?.id) === 'auth-email' &&
      await email.getAttribute('aria-invalid') === 'true' && (await email.getAttribute('aria-describedby')).includes('auth-email-message') && provider.otpRequests === 0)

    provider.otp = 'throttled'
    await email.fill('buyer@example.com')
    await page.getByRole('button', { name: 'Send sign-in code' }).click()
    await page.getByRole('alert').getByText('Please wait before requesting another code.').waitFor()
    await check('a throttled provider is reported, focus back on the email', await page.evaluate(() => document.activeElement?.id) === 'auth-email')

    provider.otp = 'down'
    await email.fill('buyer@example.com')
    await page.getByRole('button', { name: 'Send sign-in code' }).click()
    await page.getByRole('alert').getByText('We could not reach email authentication. Please try again.').waitFor()
    await check('a provider outage is reported, never as a sent code', await page.getByRole('textbox', { name: 'Six-digit code' }).count() === 0)

    // ── Pending, then the code step ────────────────────────────────────
    provider.otp = 'slow'
    await email.fill('buyer@example.com')
    const send = page.getByRole('button', { name: 'Send sign-in code' })
    await send.click()
    await page.waitForTimeout(300)
    await check('while the code is requested, the button is busy and disabled', await send.getAttribute('aria-busy') === 'true' && await send.isDisabled())
    const code = page.getByRole('textbox', { name: 'Six-digit code' })
    await code.waitFor()
    await check('code step: the status is announced and focus moves to the code field', await page.getByRole('status').getByText('If this address can sign in, a six-digit code has been emailed to it.').isVisible() &&
      await page.evaluate(() => document.activeElement?.id) === 'auth-code' && await page.getByText('buyer@example.com').isVisible())
    await check('login asks for a code without creating an account', provider.lastOtp?.email === 'buyer@example.com' && provider.lastOtp?.create_user === false)
    await check('the code field is a one-time-code, numeric field', await code.getAttribute('autocomplete') === 'one-time-code' && await code.getAttribute('inputmode') === 'numeric')
    await check('390px code step fits the width', await noOverflow(page))

    await code.fill('000000')
    await page.getByRole('button', { name: 'Verify and continue' }).click()
    await page.getByRole('alert').getByText(/invalid or expired/).waitFor()
    await check('a wrong code is reported, and focus returns to the code field', await page.evaluate(() => document.activeElement?.id) === 'auth-code' && await code.getAttribute('aria-invalid') === 'true')

    provider.verifyDelay = 1200
    await code.fill('123456')
    const verify = page.getByRole('button', { name: 'Verify and continue' })
    await verify.click()
    await page.waitForTimeout(300)
    await check('while the code is verified, the button is busy and disabled', await verify.getAttribute('aria-busy') === 'true' && await verify.isDisabled())
    await page.waitForURL('**/account')
    await check('the right code signs in and returns to the requested page', new URL(page.url()).pathname === '/account' && await page.getByText(USER.email).isVisible())
    await page.close()
    provider.verifyDelay = 0
    provider.otp = 'ok'

    // ── Register, recovery, and the Google error ──────────────────────
    const fresh = await browser.newPage({ viewport: { width: 412, height: 915 } })
    await fresh.goto(`${BASE}/login?mode=register&next=%2Faccount`)
    await check('register: its own heading, action and way back to log in', await fresh.getByRole('heading', { level: 1, name: 'Create your account' }).isVisible() &&
      await fresh.getByRole('button', { name: 'Create account with email' }).isVisible() &&
      await fresh.getByRole('link', { name: 'Log in', exact: true }).last().getAttribute('href') === '/login?mode=login&next=%2Faccount')
    await fresh.getByRole('textbox', { name: 'Email address' }).fill('new.buyer@example.com')
    await fresh.getByRole('button', { name: 'Create account with email' }).click()
    await fresh.getByRole('textbox', { name: 'Six-digit code' }).waitFor()
    await check('register asks the provider to create the account', provider.lastOtp?.create_user === true)
    await fresh.getByRole('button', { name: 'Use another email or request a new code' }).click()
    await fresh.getByRole('textbox', { name: 'Email address' }).waitFor()
    await check('"Use another email" returns to a fresh email step', await fresh.getByRole('textbox', { name: 'Six-digit code' }).count() === 0)
    await fresh.goto(`${BASE}/login?error=google`)
    await check('a failed Google sign-in is explained, with email still offered', await fresh.getByRole('alert').getByText('Google sign-in was cancelled or could not be completed. You can try again or use email.').isVisible() &&
      await fresh.getByRole('textbox', { name: 'Email address' }).isVisible())
    await fresh.close()
  }
} finally {
  await browser.close()
  await new Promise((resolve) => mock.close(resolve))
}

console.log(`${passed} passed, 0 failed`)
