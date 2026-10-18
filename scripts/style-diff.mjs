// Computed-style comparison between two builds (UI-03 onwards).
//
// A screenshot cannot say WHICH value changed or why. This records the
// computed style and box of every visible element (and its ::before/::after)
// on representative screens, then compares two recordings and lists every
// difference grouped by property and value, so each visual change in a
// design-system stage is reviewed instead of discovered.
//
//   capture: node scripts/style-diff.mjs capture <out.json>
//            BASE=http://127.0.0.1:3100       public app
//            AUTH_BASE=http://localhost:3101  app started against the fixture
//                                             simulator (see style-diff/simulator.mjs);
//                                             omit to skip workspace screens
//   compare: node scripts/style-diff.mjs compare <before.json> <after.json> [report.md]
//            add --expect-none to exit 1 on any difference (proving a
//            refactor, such as removing dead CSS, changes nothing).
//
// Determinism: UI animations and transitions are finished and every other
// animation paused at t=0 before reading, streamed Suspense content, fonts and
// network quiet are awaited, and workspace data is fixed. Capturing the same build twice must report no differences;
// run that first whenever the tool changes.
//
// The protected scenes (the login street and the 404 lost-pin scene) are
// additionally fingerprinted: a hash of their SVG markup, the text of every
// @keyframes rule outside the UI motion layer (motion-*, compared and
// reported separately), and each element's animation timing, so
// "unchanged" is a measurement, not an impression.
import { chromium } from 'playwright-core'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { ADMIN_TOKEN, OWNER_TOKEN, startWorkspaceSimulator } from './style-diff/simulator.mjs'

const EXECUTABLE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const BASE = process.env.BASE ?? 'http://127.0.0.1:3100'
const AUTH_BASE = process.env.AUTH_BASE
const WIDTHS = [390, 1280]

// Representative screens. `open` clicks a control first (an interaction
// state); `auth` needs AUTH_BASE and a fixture session. `server: 'auth'`
// renders on AUTH_BASE without a session — the sign-in form exists only
// where sign-in is configured (UI-07). `fill` types into fields and
// `submit` clicks, then waits for `waitFor`: a form state reached the way a
// visitor reaches it. The simulator does not answer /otp, which the app
// treats like any refusal it must not reveal: as a sent code.
export const SCENARIOS = [
  { name: 'home', path: '/' },
  { name: 'home-search-dialog', path: '/', open: '.reference-search-trigger', widths: [390] },
  { name: 'menu (Phase E)', path: '/', open: 'nav.app-bar-bottom button[aria-haspopup="dialog"]', widths: [390] },
  { name: 'search-buy', path: '/buy/kolkata' },
  { name: 'search-filtered', path: '/buy/kolkata?loc=uttarpara-kotrung,ballygunge&bhk=2,3,4&type=APARTMENT&sort=price_desc' },
  { name: 'search-locality', path: '/buy/kolkata/new-town' },
  { name: 'search-rent', path: '/rent/kolkata' },
  { name: 'search-zero', path: '/buy/kolkata?loc=howrah&type=VILLA&bhk=5&pmax=1600000' },
  { name: 'property', path: '/property/4-bhk-flat-for-sale-in-ballygunge-p5d40ab' },
  { name: 'property-2', path: '/property/2-bhk-builder-floor-for-sale-in-behala-p9c17f4' },
  { name: 'login', path: '/login' },
  { name: 'login-register', path: '/login?mode=register' },
  { name: 'login-configured', path: '/login', server: 'auth' },
  { name: 'login-register-configured', path: '/login?mode=register', server: 'auth' },
  { name: 'login-google-error', path: '/login?error=google', server: 'auth', widths: [390] },
  { name: 'login-email-error', path: '/login', server: 'auth', widths: [390], fill: { '#auth-email': 'buyer@' }, submit: 'form button[type="submit"]', waitFor: '[role="alert"]' },
  { name: 'login-code-step', path: '/login', server: 'auth', fill: { '#auth-email': 'buyer@example.com' }, submit: 'form button[type="submit"]', waitFor: '#auth-code' },
  { name: 'not-found', path: '/this-page-does-not-exist' },
  { name: 'post', path: '/post' },
  { name: 'post-details', path: '/post?role=OWNER&intent=buy&type=APARTMENT' },
  { name: 'calculators', path: '/calculators' },
  { name: 'calculator-emi', path: '/calculators/emi?price=125000000&down=25000000&years=30' },
  { name: 'activity-guest (Phase E)', path: '/account/activity' },
  { name: 'videos', path: '/videos' },
  { name: 'dashboard', path: '/dashboard', auth: OWNER_TOKEN },
  { name: 'dashboard-enquiries', path: '/dashboard/enquiries', auth: OWNER_TOKEN },
  { name: 'dashboard-performance', path: '/dashboard/performance', auth: OWNER_TOKEN },
  { name: 'admin', path: '/admin', auth: ADMIN_TOKEN },
  { name: 'admin-listings', path: '/admin/listings', auth: ADMIN_TOKEN },
  { name: 'admin-moderation', path: '/admin/moderation', auth: ADMIN_TOKEN },
  { name: 'admin-system', path: '/admin/system', auth: ADMIN_TOKEN },
]

// Recorded per element. Rounded box geometry catches a change that moves
// or resizes something even when no listed property changed on it.
const PROPS = [
  'color', 'backgroundColor', 'backgroundImage',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
  'boxShadow', 'outlineColor', 'outlineWidth', 'outlineStyle',
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap',
  'opacity', 'fill', 'stroke', 'backdropFilter', 'transform',
  'transitionProperty', 'transitionDuration', 'transitionTimingFunction', 'transitionDelay',
  'animationName', 'animationDuration', 'animationDelay', 'animationTimingFunction',
  'animationIterationCount', 'animationDirection', 'animationFillMode',
]
const PROTECTED = ['.wh-scene', '.login-art', '.nf-scene']

// Requests the page has made and not finished. Settling waits for 300ms of
// quiet: client data (the saved-listing state that enables the save buttons)
// otherwise races the read. Only same-origin requests count, so a blocked or
// slow third-party host cannot hold the capture.
function trackRequests(page, origin) {
  const inflight = new Set()
  const done = (r) => inflight.delete(r)
  page.on('request', (r) => { if (r.url().startsWith(origin)) inflight.add(r) })
  // A response counts as done: Playwright never reports `requestfinished`
  // for a response whose body the page does not read (the 401 from
  // /api/saved for a guest), which would otherwise hold the capture forever.
  page.on('response', (r) => done(r.request()))
  page.on('requestfinished', done)
  page.on('requestfailed', done)
  return inflight
}

async function quiet(page, inflight) {
  const deadline = Date.now() + 15000
  let since = Date.now()
  while (Date.now() < deadline) {
    if (inflight.size) since = Date.now()
    else if (Date.now() - since >= 300) return
    await page.waitForTimeout(50)
  }
  throw new Error(`requests still pending: ${[...inflight].map((r) => r.url()).join(', ')}`)
}

async function settle(page, inflight) {
  await quiet(page, inflight)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"], template[id^="B:"]'), null, { timeout: 15000 })
  await quiet(page, inflight)
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
  // Make time irrelevant. UI animations (the `motion-*` keyframes, UI-04) and
  // CSS transitions jump to their end, so a just-opened dialog is read at
  // rest rather than mid-entrance; every other animation (the frozen login
  // and 404 scenes' loops and intros) is paused at its start, as it was when
  // the UI-03 baseline was captured, so their fingerprints stay comparable.
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      const name = a.animationName ?? ''
      if (a.transitionProperty || (name.startsWith('motion-') && a.effect?.getTiming().iterations !== Infinity)) a.finish()
      else { a.pause(); a.currentTime = 0 }
    }
  })
}

function readPage({ props, protectedSelectors }) {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META'])
  const path = (el) => {
    const parts = []
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      let i = 1
      for (let s = node.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === node.tagName) i++
      parts.unshift(`${node.tagName.toLowerCase()}:${i}`)
    }
    return parts.join('>')
  }
  const label = (el) => {
    const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? ''
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls.trim().split(/\s+/).slice(0, 4).join('.') : ''}`
  }
  const pick = (cs) => props.map((p) => cs[p])
  const round = (n) => Math.round(n * 2) / 2
  const elements = {}
  for (const el of document.body.querySelectorAll('*')) {
    if (SKIP.has(el.tagName)) continue
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || (!r.width && !r.height)) continue
    const entry = { label: label(el), box: [round(r.left + scrollX), round(r.top + scrollY), round(r.width), round(r.height)], style: pick(cs) }
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo)
      if (ps.content && ps.content !== 'none' && ps.content !== 'normal') entry[pseudo] = pick(ps)
    }
    elements[path(el)] = entry
  }
  const keyframes = []
  for (const sheet of document.styleSheets) {
    let rules
    try { rules = sheet.cssRules } catch { continue }
    const walk = (list) => { for (const rule of list) { if (rule.type === CSSRule.KEYFRAMES_RULE) keyframes.push(rule.cssText); else if (rule.cssRules) walk(rule.cssRules) } }
    walk(rules)
  }
  const scenes = {}
  for (const sel of protectedSelectors) {
    const root = document.querySelector(sel)
    if (!root) continue
    const clone = root.cloneNode(true)
    clone.removeAttribute('data-scene-paused')
    scenes[sel] = { markup: clone.outerHTML, elements: root.querySelectorAll('*').length + 1 }
  }
  return { elements, keyframes: keyframes.sort(), scenes, scrollWidth: document.documentElement.scrollWidth }
}

async function capture(out) {
  const simulator = AUTH_BASE ? await startWorkspaceSimulator(3300) : null
  const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] })
  const result = { capturedAt: new Date().toISOString(), base: BASE, authBase: AUTH_BASE ?? null, props: PROPS, scenarios: {} }
  for (const s of SCENARIOS) {
    const onAuth = Boolean(s.auth) || s.server === 'auth'
    if (onAuth && !AUTH_BASE) { console.log(`skip ${s.name} (no AUTH_BASE)`); continue }
    const origin = onAuth ? AUTH_BASE : BASE
    for (const width of s.widths ?? WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768, reducedMotion: 'no-preference' })
      if (s.auth) await ctx.addCookies([{ name: 'gb-access', value: s.auth, url: origin }])
      const page = await ctx.newPage()
      const inflight = trackRequests(page, origin)
      await page.goto(origin + s.path, { waitUntil: 'load' })
      if (s.open) {
        await settle(page, inflight)
        await page.locator(s.open).first().click()
        await page.waitForSelector('[role="dialog"]', { state: 'visible' })
      }
      if (s.submit) {
        await settle(page, inflight)
        for (const [field, value] of Object.entries(s.fill ?? {})) await page.fill(field, value)
        await page.locator(s.submit).first().click()
        // A state the old form never reaches (its browser bubble blocked the
        // submit) is captured as it stands, and the report shows the change.
        await page.waitForSelector(s.waitFor, { state: 'visible', timeout: 5000 }).catch(() => console.log(`  ${s.name}: ${s.waitFor} never appeared`))
      }
      await settle(page, inflight)
      const data = await page.evaluate(readPage, { props: PROPS, protectedSelectors: PROTECTED })
      for (const scene of Object.values(data.scenes)) {
        scene.hash = createHash('sha256').update(scene.markup).digest('hex')
        delete scene.markup
      }
      data.keyframesHash = createHash('sha256').update(data.keyframes.join('\n')).digest('hex')
      result.scenarios[`${s.name} @${width}`] = data
      console.log(`captured ${s.name} @${width}: ${Object.keys(data.elements).length} elements`)
      await ctx.close()
    }
  }
  await browser.close()
  simulator?.close()
  writeFileSync(out, JSON.stringify(result))
  console.log(`wrote ${out}`)
}

const GEOMETRY = ['left', 'top', 'width', 'height']

function compare(beforeFile, afterFile, reportFile, expectNone) {
  const a = JSON.parse(readFileSync(beforeFile, 'utf8')), b = JSON.parse(readFileSync(afterFile, 'utf8'))
  const props = a.props
  const groups = new Map()   // "prop: from → to" → { count, scenarios:Set, labels:Set }
  const structure = []
  const protectedReport = []
  const uiKeyframes = new Set()
  const perScenario = []
  const add = (key, scenario, label) => {
    const g = groups.get(key) ?? { count: 0, scenarios: new Set(), labels: new Set() }
    g.count++; g.scenarios.add(scenario); if (g.labels.size < 6) g.labels.add(label)
    groups.set(key, g)
  }
  for (const [scenario, before] of Object.entries(a.scenarios)) {
    const after = b.scenarios[scenario]
    if (!after) { structure.push(`${scenario}: missing from the second capture`); continue }
    let changed = 0
    for (const [path, eb] of Object.entries(before.elements)) {
      const ea = after.elements[path]
      if (!ea) { structure.push(`${scenario}: element removed — ${eb.label}`); continue }
      let differs = false
      props.forEach((p, i) => {
        if (eb.style[i] !== ea.style[i]) { add(`${p}: ${eb.style[i]} → ${ea.style[i]}`, scenario, eb.label); differs = true }
        for (const pseudo of ['::before', '::after']) {
          if (eb[pseudo] && ea[pseudo] && eb[pseudo][i] !== ea[pseudo][i]) { add(`${pseudo} ${p}: ${eb[pseudo][i]} → ${ea[pseudo][i]}`, scenario, eb.label); differs = true }
        }
      })
      for (const pseudo of ['::before', '::after']) if (Boolean(eb[pseudo]) !== Boolean(ea[pseudo])) { structure.push(`${scenario}: ${pseudo} ${eb[pseudo] ? 'removed' : 'added'} on ${eb.label}`); differs = true }
      eb.box.forEach((v, i) => { if (Math.abs(v - ea.box[i]) >= 1) { add(`geometry ${GEOMETRY[i]} moved`, scenario, eb.label); differs = true } })
      if (differs) changed++
    }
    for (const path of Object.keys(after.elements)) if (!before.elements[path]) structure.push(`${scenario}: element added — ${after.elements[path].label}`)
    // The UI motion layer's own keyframes (motion-*, UI-04) are reviewed as
    // property changes, not as scene changes; every other @keyframes rule —
    // the login street's and the 404 scene's among them — must stay
    // byte-identical.
    const split = (list) => [list.filter((k) => !/^@keyframes motion-/.test(k)).join('\n'), list.filter((k) => /^@keyframes motion-/.test(k))]
    const [sceneBefore, uiBefore] = split(before.keyframes), [sceneAfter, uiAfter] = split(after.keyframes)
    if (sceneBefore !== sceneAfter) protectedReport.push(`${scenario}: @keyframes text CHANGED`)
    const name = (k) => k.match(/^@keyframes (\S+)/)[1]
    for (const k of uiAfter) if (!uiBefore.includes(k)) uiKeyframes.add(`UI keyframes ${uiBefore.some((b) => name(b) === name(k)) ? 'changed' : 'added'} — ${name(k)}`)
    for (const k of uiBefore) if (!uiAfter.some((a) => name(a) === name(k))) uiKeyframes.add(`UI keyframes removed — ${name(k)}`)
    for (const [sel, scene] of Object.entries(before.scenes)) {
      const other = after.scenes[sel]
      protectedReport.push(`${scenario}: ${sel} ${!other ? 'MISSING' : other.hash === scene.hash ? `markup identical (${scene.elements} elements)` : 'markup CHANGED'}`)
    }
    if (before.scrollWidth !== after.scrollWidth) structure.push(`${scenario}: document width ${before.scrollWidth} → ${after.scrollWidth}`)
    perScenario.push([scenario, Object.keys(before.elements).length, changed])
  }
  structure.unshift(...uiKeyframes)
  const sorted = [...groups.entries()].sort((x, y) => y[1].count - x[1].count)
  const lines = [
    `# Style comparison`, '', `before: ${beforeFile} (${a.capturedAt})`, `after: ${afterFile} (${b.capturedAt})`, '',
    '## Elements changed per screen', '', '| screen | elements | changed |', '|---|---|---|',
    ...perScenario.map(([s, n, c]) => `| ${s} | ${n} | ${c} |`), '',
    '## Protected scenes', '', ...protectedReport.map((l) => `- ${l}`), '',
    '## Structure', '', ...(structure.length ? structure.map((l) => `- ${l}`) : ['- none']), '',
    '## Property changes (grouped)', '', '| change | elements | screens | examples |', '|---|---|---|---|',
    ...sorted.map(([k, g]) => `| \`${k.replaceAll('|', '\\|')}\` | ${g.count} | ${g.scenarios.size} | ${[...g.labels].join('<br>').replaceAll('|', '\\|')} |`),
  ]
  const report = lines.join('\n') + '\n'
  if (reportFile) writeFileSync(reportFile, report)
  const total = sorted.reduce((n, [, g]) => n + g.count, 0)
  const protectedChanged = protectedReport.some((l) => /CHANGED|MISSING/.test(l))
  console.log(`${perScenario.length} screens compared; ${sorted.length} distinct changes on ${total} element-properties; ${structure.length} structural notes; protected scenes ${protectedChanged ? 'CHANGED' : 'unchanged'}`)
  if (reportFile) console.log(`report: ${reportFile}`)
  if (expectNone && (total || structure.length || protectedChanged)) process.exit(1)
}

const [command, ...rest] = process.argv.slice(2)
const expectNone = rest.includes('--expect-none')
const files = rest.filter((r) => !r.startsWith('--'))
if (command === 'capture' && files[0]) await capture(files[0])
else if (command === 'compare' && files[1]) compare(files[0], files[1], files[2], expectNone)
else { console.log('usage: style-diff.mjs capture <out.json> | compare <before.json> <after.json> [report.md] [--expect-none]'); process.exit(2) }
