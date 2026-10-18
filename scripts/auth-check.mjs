/** Browser-level Phase 6 checks with a deterministic local Auth API. */
import http from 'node:http'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const USER = { id: 'a9140f33-a429-46f3-9514-3e8f32f18189', email: 'buyer@example.com', email_confirmed_at: new Date().toISOString() }
let requests = 0
let lastOtp = null
let refreshes = 0
let logouts = 0
let googleMode = 'success'
let googleAuthorizations = 0
let pkceExchanges = 0
let expectedChallenge = null
let callbackUrl = null
let pkceMatched = false
const sessions = new Set()
// Like Supabase, signing out revokes the session's refresh tokens as well,
// so a refresh racing the logout (a prefetch still in flight) cannot bring
// the session back. Without this the simulator is laxer than the provider.
const revokedRefreshTokens = new Set()
let savedProfile = null
// UI-12: profile writes counted, slowed and failed on demand.
let profileWrites = 0, profileDelay = 0, profileFailing = false
const savedHomes = new Set()
let savedDelay = 0
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
  if (url.pathname === '/auth/v1/authorize') {
    googleAuthorizations++
    expectedChallenge = url.searchParams.get('code_challenge')
    callbackUrl = url.searchParams.get('redirect_to')
    const destination = new URL(callbackUrl)
    destination.searchParams.set(googleMode === 'cancel' ? 'error' : 'code', googleMode === 'cancel' ? 'access_denied' : 'google-code')
    response.writeHead(302, { Location: destination.toString() })
    return response.end()
  }
  if (url.pathname === '/auth/v1/user') return sessions.has(request.headers.authorization?.slice(7)) ? send(200, USER) : send(401, {})
  if (url.pathname === '/rest/v1/rpc/my_account_access') return send(200, true)
  if (url.pathname === '/rest/v1/saved_properties') {
    if (!sessions.has(request.headers.authorization?.slice(7))) return send(401, {})
    await new Promise((resolve) => setTimeout(resolve, savedDelay))
    if (request.method === 'GET') return send(200, [...savedHomes].map((property_public_id) => ({ property_public_id, created_at: new Date().toISOString() })))
    if (request.method === 'POST') { savedHomes.add(body.property_public_id); return send(201, [{ property_public_id: body.property_public_id }]) }
    if (request.method === 'DELETE') { savedHomes.delete(url.searchParams.get('property_public_id')?.replace(/^eq\./, '')); return send(204, {}) }
  }
  if (url.pathname === '/rest/v1/buyer_profiles') {
    if (!sessions.has(request.headers.authorization?.slice(7))) return send(401, {})
    if (request.method === 'GET') return send(200, savedProfile ? [savedProfile] : [])
    if (request.method === 'POST' && body.id === USER.id && url.searchParams.get('on_conflict') === 'id') {
      profileWrites++
      if (profileDelay) await new Promise((r) => setTimeout(r, profileDelay))
      if (profileFailing) return send(503, {})
      savedProfile = body
      return send(201, [savedProfile])
    }
    return send(403, {})
  }
  if (url.pathname === '/auth/v1/token') {
    if (url.searchParams.get('grant_type') === 'pkce') {
      pkceExchanges++
      const challenge = createHash('sha256').update(body.code_verifier || '').digest('base64url')
      pkceMatched = body.auth_code === 'google-code' && challenge === expectedChallenge
      if (!pkceMatched) return send(403, {})
      sessions.add('c'.repeat(48))
      return send(200, { access_token: 'c'.repeat(48), refresh_token: 't'.repeat(48), expires_in: 3600, user: USER })
    }
    refreshes++
    if (revokedRefreshTokens.has(body.refresh_token) || !['r'.repeat(48), 's'.repeat(48)].includes(body.refresh_token)) return send(401, {})
    sessions.add('b'.repeat(48))
    return send(200, { access_token: 'b'.repeat(48), refresh_token: 's'.repeat(48), expires_in: 3600, user: USER })
  }
  if (url.pathname === '/auth/v1/logout') {
    logouts++
    sessions.delete(request.headers.authorization?.slice(7))
    revokedRefreshTokens.add('r'.repeat(48))
    revokedRefreshTokens.add('s'.repeat(48))
    return send(204, {})
  }
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
  check('new buyer has editable profile and no invented activity', await page.getByRole('textbox', { name: 'Full name' }).isVisible() &&
    await page.getByText('Not available yet').count() === 2)
  await page.getByRole('textbox', { name: 'Full name' }).fill('Ananya Roy')
  await page.getByRole('textbox', { name: /Contact number/ }).fill('+919876543210')
  await page.getByLabel('I am interested in').selectOption('buy')
  await page.getByLabel('Preferred locality').selectOption('new-town')
  await page.getByRole('checkbox', { name: /Email me occasional/ }).check()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('status').getByText(/details have been saved/).waitFor()
  check('profile saved for verified user only', savedProfile?.id === USER.id && savedProfile?.contact_phone === '+919876543210' &&
    savedProfile?.email_updates === true)
  await page.reload()
  check('profile and preferences persist after reload', await page.getByRole('textbox', { name: 'Full name' }).inputValue() === 'Ananya Roy' &&
    await page.getByLabel('I am interested in').inputValue() === 'buy' &&
    await page.getByLabel('Preferred locality').inputValue() === 'new-town')
  // ── UI-12: the profile form on the shared system ─────────────────────────
  const fullName = page.getByRole('textbox', { name: 'Full name' }), phoneBox = page.getByRole('textbox', { name: /Contact number/ }), saveButton = () => page.getByRole('button', { name: /Save changes|Saving/ })
  check('profile fields are 16px and 48px with autofill semantics', await page.locator('form input:not([type=checkbox]):not([type=hidden]), form select').evaluateAll((els) => els.filter((e) => e.name).every((e) => parseFloat(getComputedStyle(e).fontSize) >= 16 && e.getBoundingClientRect().height >= 44))
    && await fullName.getAttribute('autocomplete') === 'name' && await phoneBox.getAttribute('autocomplete') === 'tel' && await phoneBox.getAttribute('type') === 'tel')
  let writes = profileWrites
  await fullName.fill('Ananya R'); await phoneBox.fill('12ab')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForFunction(() => document.activeElement?.name === 'contact_phone')
  check('an invalid number is refused before sending, marked on its field and focused', profileWrites === writes && await phoneBox.getAttribute('aria-invalid') === 'true'
    && (await page.locator('#profile-phone-error').innerText()).includes('10 to 15 digits') && (await phoneBox.getAttribute('aria-describedby')).includes('profile-phone-error'))
  check('what was typed stays', await fullName.inputValue() === 'Ananya R' && await phoneBox.inputValue() === '12ab')
  await phoneBox.fill('+919876543211'); profileDelay = 700
  await saveButton().focus(); await page.keyboard.press('Enter')
  const busySave = page.getByRole('button', { name: 'Saving…' }); await busySave.waitFor()
  check('the busy Save keeps focus, is unavailable but not disabled, and saving is announced', await busySave.evaluate((e) => e === document.activeElement && !e.disabled && e.getAttribute('aria-disabled') === 'true')
    && (await page.locator('#profile-status').innerText()).includes('Saving your details'))
  check('fields stay focusable while saving', await fullName.evaluate((e) => !e.disabled))
  await page.keyboard.press('Enter')
  await page.locator('#profile-status').getByText(/details have been saved/).waitFor(); profileDelay = 0
  check('a second press while saving sent one write', profileWrites === writes + 1, String(profileWrites - writes))
  check('a save moves focus to the announced confirmation', await page.locator('#profile-status').evaluate((e) => e === document.activeElement && e.getAttribute('role') === 'status') && savedProfile.contact_phone === '+919876543211')
  writes = profileWrites; profileFailing = true
  await fullName.fill('Ananya Changed')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('alert').getByText('We could not save your profile. Please try again.').waitFor()
  check('a failed save keeps the change being made (it used to reset to the saved profile) and keeps focus on Save', await fullName.inputValue() === 'Ananya Changed' && await page.getByRole('button', { name: 'Save changes' }).evaluate((e) => e === document.activeElement) && savedProfile.full_name !== 'Ananya Changed')
  profileFailing = false
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('alert').getByText(/Check your connection/).waitFor()
  check('offline: explained, nothing lost, the page not replaced', await fullName.inputValue() === 'Ananya Changed' && await page.getByRole('heading', { name: 'Your details' }).isVisible())
  await context.setOffline(false)
  // Without JavaScript the same form posts: a problem comes back on its field with what was typed.
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  await plain.addCookies(await context.cookies())
  const pp = await plain.newPage(); await pp.goto(BASE + '/account')
  await pp.getByRole('textbox', { name: 'Full name' }).fill('No Script Name'); await pp.getByRole('textbox', { name: /Contact number/ }).fill('bad')
  writes = profileWrites
  await Promise.all([pp.waitForLoadState('load'), pp.getByRole('button', { name: 'Save changes' }).click()])
  await pp.locator('#profile-phone-error').waitFor()
  check('no JavaScript: the error returns beside its field, nothing written, answers kept', profileWrites === writes && await pp.getByRole('textbox', { name: 'Full name' }).inputValue() === 'No Script Name' && await pp.getByRole('textbox', { name: /Contact number/ }).inputValue() === 'bad')
  await pp.getByRole('textbox', { name: /Contact number/ }).fill('+919876543210')
  await Promise.all([pp.waitForLoadState('load'), pp.getByRole('button', { name: 'Save changes' }).click()])
  await pp.getByText(/details have been saved/).waitFor()
  check('no JavaScript: a valid save is written and confirmed', savedProfile.full_name === 'No Script Name')
  await plain.close()
  await page.reload()
  for (const width of [320, 360, 375, 390, 412, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, [...document.querySelectorAll('main form button, main form input, main form select')].filter((c) => c.offsetHeight > 0 && c.type !== 'checkbox' && c.type !== 'hidden' && c.getBoundingClientRect().height < 44).length])
    check(`account view fits ${width}px with 44px form controls`, size[0] <= size[1] && size[2] === 0)
  }
  const c = await context.cookies()
  check('tokens stored in HTTP-only cookies', c.some((cookie) => cookie.name === 'gb-access' && cookie.httpOnly && cookie.sameSite === 'Lax') &&
    c.some((cookie) => cookie.name === 'gb-refresh' && cookie.httpOnly))
  check('token is absent from rendered HTML', !(await page.content()).includes('a'.repeat(48)))
  check('signed-in navigation opens account', await page.getByRole('link', { name: 'Account' }).first()
    .waitFor({ timeout: 5000 }).then(() => true).catch(() => false))
  // UI-08: saving a home. Focus stays on the heart while the save is in
  // flight (it used to be disabled, which sent focus to <body>), and when the
  // server confirms, the heart swells once. Loading saved state never animates.
  {
    const listing = '/property/3-bhk-flat-for-sale-in-new-town-p8f3c2a'
    await page.goto(BASE + listing)
    const heart = page.getByRole('button', { name: /^Save / }).first()
    await page.waitForFunction(() => [...document.querySelectorAll('button[aria-pressed]')].length > 0)
    const icon = () => heart.evaluate((el) => { const svg = el.querySelector('svg'); return { heart: svg.dataset.heart ?? null, anims: svg.getAnimations().map((a) => ({ name: a.animationName, d: a.effect.getTiming().duration })) } })
    check('save: nothing animates while saved state loads', (await icon()).heart === null)
    // Record the swell as it starts: at 200ms it can be over before a poll
    // sees it.
    await heart.evaluate((el) => { window.__heart = []; el.addEventListener('animationstart', (e) => window.__heart.push({ name: e.animationName, d: getComputedStyle(e.target).animationDuration })) })
    // The page has other hearts (similar homes), so every later step reads
    // this button — the element stays mounted; only its icon is re-keyed —
    // never "the first heart with a label".
    const own = await heart.elementHandle()
    savedDelay = 600
    await heart.focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
    check('save: while the save is in flight the heart is busy, refuses presses and keeps focus', await own.evaluate((el) => el.getAttribute('aria-busy') === 'true' && el.getAttribute('aria-disabled') === 'true' && el === document.activeElement))
    await page.waitForFunction((el) => el.getAttribute('aria-pressed') === 'true', own)
    // The swell starts on the frame after the confirmed state renders.
    await page.waitForFunction(() => window.__heart.length >= 1, null, { timeout: 2000 }).catch(() => {})
    const confirmed = await own.evaluate((el) => ({ focus: el === document.activeElement, pressed: el.getAttribute('aria-pressed'), heart: el.querySelector('svg').dataset.heart, started: window.__heart }))
    check('save: when the server confirms, the heart fills and swells once (200ms); state, label and focus are all there without it', confirmed.focus && confirmed.pressed === 'true' && confirmed.heart === 'save' &&
      JSON.stringify(confirmed.started) === JSON.stringify([{ name: 'motion-heart-save', d: '0.2s' }]) && savedHomes.has('p_8f3c2a'), JSON.stringify(confirmed))
    savedDelay = 0
    await page.keyboard.press('Space')
    await page.waitForFunction((el) => el.getAttribute('aria-pressed') === 'false' && el.querySelector('svg').dataset.heart === 'unsave', own)
    await page.waitForFunction(() => window.__heart.length >= 2, null, { timeout: 2000 }).catch(() => {})
    const unsaved = await own.evaluate((el) => ({ focus: el === document.activeElement, heart: el.querySelector('svg').dataset.heart, started: window.__heart.map((a) => a.name) }))
    check('save: Space on the same heart unsaves it, with a smaller settle; focus stays', unsaved.focus && unsaved.heart === 'unsave' && unsaved.started.at(-1) === 'motion-heart-unsave' && !savedHomes.has('p_8f3c2a'), JSON.stringify(unsaved))
    savedHomes.add('p_8f3c2a')
    await page.reload()
    await page.getByRole('button', { name: /^Remove .* from saved$/ }).first().waitFor()
    check('save: a home that loads already saved shows its filled heart, still', await page.getByRole('button', { name: /^Remove .* from saved$/ }).first().evaluate((el) => !el.querySelector('svg').dataset.heart && !el.querySelector('svg').getAnimations().length))
    const calm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    await calm.addCookies(await context.cookies())
    const still = await calm.newPage()
    await still.goto(BASE + listing)
    await still.getByRole('button', { name: /^Remove .* from saved$/ }).first().click()
    await still.getByRole('button', { name: /^Save / }).first().waitFor()
    check('save: under reduced motion the heart changes state with no movement', await still.getByRole('button', { name: /^Save / }).first().evaluate((el) => el.getAttribute('aria-pressed') === 'false' && !el.querySelector('svg').getAnimations().length))
    await calm.close()
    await page.goto(BASE + '/account')
  }

  // Phase D: the phone bar's Activity hub, signed in. Saved and enquiries
  // stay reachable from it, and Activity is current on each page it leads to.
  await page.setViewportSize({ width: 390, height: 844 })
  const bar = page.getByRole('navigation', { name: 'Primary' })
  await bar.getByRole('link', { name: 'Activity' }).click()
  await page.waitForURL('**/account/activity')
  check('signed-in Activity opens the activity hub, marked current in the bar', await page.getByRole('heading', { level: 1, name: 'Your activity' }).isVisible() &&
    await bar.getByRole('link', { name: 'Activity' }).getAttribute('aria-current') === 'page')
  const hubLinks = await page.locator('main a').evaluateAll((els) => els.map((e) => ({ href: e.getAttribute('href'), h: e.getBoundingClientRect().height, text: e.textContent })))
  check('the hub reaches saved homes, your enquiries, your properties and enquiries on your listings, each 44px or more', JSON.stringify(hubLinks.map((l) => l.href)) === JSON.stringify(['/account/saved', '/account/enquiries', '/dashboard', '/dashboard/enquiries']) &&
    hubLinks.every((l) => l.h >= 44), JSON.stringify(hubLinks))
  check('the hub never shows a guessed count: a figure appears only where its query answered', hubLinks.every((l) => !/\b0\b/.test(l.text)))
  for (const [name, path] of [['Saved homes', '/account/saved'], ['Your enquiries', '/account/enquiries']]) {
    await page.getByRole('link', { name: new RegExp(`^${name}`) }).click()
    await page.waitForURL(`**${path}`)
    check(`${name} is reachable from Activity, and Activity stays current on ${path}`, await bar.getByRole('link', { name: 'Activity' }).getAttribute('aria-current') === 'page')
    await page.goBack()
    await page.waitForURL('**/account/activity')
  }
  await page.setViewportSize({ width: 1280, height: 844 })
  // Back where the next checks expect to be.
  await page.goto(BASE + '/account')
  // Expire the app's own access cookie by rewriting it with its own
  // attributes. A lookalike with different attributes would not replace it:
  // current Chromium binds cookies to the scheme that set them and keeps both.
  const expireAccessToken = async () => {
    const current = (await context.cookies()).find((cookie) => cookie.name === 'gb-access')
    await context.addCookies([current ? { ...current, value: 'invalid' } : { name: 'gb-access', value: 'invalid', url: BASE, httpOnly: true }])
  }
  await expireAccessToken()
  await page.reload()
  check('expired token refreshes session', refreshes >= 1 && await page.getByText(USER.email).isVisible())
  await expireAccessToken()
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

  const googleContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const googlePage = await googleContext.newPage()
  const unsolicited = await googlePage.request.get(BASE + '/api/auth/google/callback?code=google-code', { maxRedirects: 0 })
  check('Google callback without verifier cannot sign in', unsolicited.status() === 307 && unsolicited.headers().location?.includes('/login?error=google'))
  googleMode = 'cancel'
  await googlePage.goto(BASE + '/login?next=%2Faccount')
  check('Google login choice is visible', await googlePage.getByRole('link', { name: 'Continue with Google' }).isVisible())
  await googlePage.getByRole('link', { name: 'Continue with Google' }).click()
  await googlePage.getByRole('alert').getByText(/Google sign-in was cancelled/).waitFor()
  check('cancelled Google login returns to accessible error', new URL(googlePage.url()).pathname === '/login' &&
    !(await googleContext.cookies()).some((cookie) => cookie.name === 'gb-google-verifier'))
  googleMode = 'success'
  await googlePage.getByRole('link', { name: 'Continue with Google' }).click()
  const googleCompleted = await googlePage.waitForURL('**/account', { timeout: 8000 }).then(() => true).catch(() => false)
  if (!googleCompleted) console.log(`  Google diagnostic: path=${new URL(googlePage.url()).pathname}, exchanges=${pkceExchanges}, verifierMatched=${pkceMatched}, authorizations=${googleAuthorizations}`)
  check('Google PKCE code exchanges for account session', pkceExchanges === 1 && googleAuthorizations === 2 &&
    googleCompleted && callbackUrl === BASE + '/api/auth/google/callback' && Boolean(expectedChallenge) && await googlePage.getByText(USER.email).isVisible())
  check('Google verifier consumed and token held HTTP-only', (await googleContext.cookies()).some((cookie) => cookie.name === 'gb-access' && cookie.httpOnly) &&
    !(await googleContext.cookies()).some((cookie) => cookie.name === 'gb-google-verifier'))
  const replay = await googlePage.request.get(BASE + '/api/auth/google/callback?code=google-code', { maxRedirects: 0 })
  check('callback replay cannot exchange code', replay.status() === 307 && replay.headers().location?.includes('/login?error=google') && pkceExchanges === 1)
  await googleContext.close()

  // UI-07: a cancelled Google attempt keeps where the visitor was going,
  // so trying again still ends there; and a return path that only becomes
  // "//host" once the URL parser normalises it never leaves the site.
  const returnContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const returnPage = await returnContext.newPage()
  googleMode = 'cancel'
  await returnPage.goto(BASE + '/login?next=%2Faccount%2Fsaved')
  await returnPage.getByRole('link', { name: 'Continue with Google' }).click()
  await returnPage.getByRole('alert').getByText('Google sign-in was cancelled. You can try again or use your email.').waitFor()
  check('cancelled Google sign-in keeps the requested page for the next attempt', new URL(returnPage.url()).searchParams.get('next') === '/account/saved' &&
    await returnPage.getByRole('link', { name: 'Continue with Google' }).getAttribute('href') === '/api/auth/google/start?next=%2Faccount%2Fsaved')
  googleMode = 'success'
  for (const crafted of ['/.//evil.example', '/a/..//evil.example', '/%2e//evil.example']) {
    const start = await returnPage.request.get(BASE + '/api/auth/google/start?next=' + encodeURIComponent(crafted), { maxRedirects: 0 })
    const stored = /gb-google-return=([^;]*)/.exec(start.headers()['set-cookie'] ?? '')?.[1]
    check(`a crafted return path (${crafted}) is replaced by /account before Google starts`, decodeURIComponent(stored ?? '') === '/account', String(stored))
  }
  await returnContext.close()
} finally {
  await browser.close()
  await new Promise((resolve) => mock.close(resolve))
}
console.log(`\n${assertions - failures}/${assertions} auth assertions passed`)
process.exitCode = failures ? 1 : 0
