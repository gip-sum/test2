// Animation performance at 390px on a throttled CPU (UI-04).
//
//   node scripts/motion-perf.mjs            # 4x CPU slowdown, 3 runs each
//   CPU=6 RUNS=5 node scripts/motion-perf.mjs
//
// For each animated moment it records, inside the page, every frame interval
// (requestAnimationFrame) and every long task (> 50ms main-thread work)
// across the window in which the animation runs. Frame intervals say whether
// the motion was smooth; long tasks say how much of that window the main
// thread spent busy — mostly React opening or closing the surface, which is
// the cost of the feature, not of its animation.
//
// It is a measurement, not a gate: throttled timings on a shared runner are
// too noisy to fail a build on. Run it before and after a motion change and
// compare (UI-04 records both against the UI-03 build).
import { chromium } from 'playwright-core'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const CPU = Number(process.env.CPU ?? 4)
const RUNS = Number(process.env.RUNS ?? 3)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })

async function page(path, before) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await context.newPage()
  p.prefetched = new Set()
  const settled = (r) => { if (r.headers()['next-router-prefetch']) p.prefetched.add(new URL(r.url()).pathname) }
  p.on('requestfinished', settled)
  p.on('requestfailed', settled)
  await p.addInitScript(() => {
    window.__longTasks = []
    new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__longTasks.push([e.startTime, e.duration]) }).observe({ type: 'longtask', buffered: true })
  })
  if (before) await before(p)
  // 'commit', not 'load': with photos held, load would never fire.
  await p.goto(base + path, { waitUntil: 'commit' })
  await p.locator('header.app-bar').waitFor()
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(800)
  const cdp = await context.newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  return p
}

const startFrames = (p) => p.evaluate(() => {
  window.__frames = []
  window.__t0 = performance.now()
  window.__recording = true
  let last = performance.now()
  const tick = (now) => { window.__frames.push(now - last); last = now; if (window.__recording) requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
})
const stopFrames = (p) => p.evaluate(() => {
  window.__recording = false
  const f = window.__frames.slice(1).sort((a, b) => a - b)
  const t0 = window.__t0
  const tasks = window.__longTasks.filter(([s]) => s >= t0)
  return {
    frames: f.length,
    p50: f[Math.floor(f.length * 0.5)] ?? 0,
    p95: f[Math.floor(f.length * 0.95)] ?? 0,
    max: f.at(-1) ?? 0,
    over50: f.filter((x) => x > 50).length,
    longTasks: tasks.length,
    longTaskMs: tasks.reduce((sum, [, d]) => sum + d, 0),
  }
})
const settle = (p) => p.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished)))

const openSheet = async (p, trigger) => { await trigger.click(); await p.waitForSelector('[data-sheet][data-state="open"]'); await settle(p) }
const filters = (p) => p.getByRole('button', { name: /^Filters/ }).first()
const menu = (p) => p.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('button', { name: 'Menu', exact: true })

// Each scenario: the page it starts on, optional preparation (not measured),
// and the measured window, which ends when the animation has finished.
const scenarios = [
  { name: 'Filters Sheet open', path: '/buy/kolkata', measure: (p) => openSheet(p, filters(p)) },
  {
    name: 'Filters Sheet close', path: '/buy/kolkata',
    prepare: (p) => openSheet(p, filters(p)),
    measure: async (p) => { await p.keyboard.press('Escape'); await p.locator('[data-sheet]').waitFor({ state: 'detached' }) },
  },
  { name: 'Header menu open (phone)', path: '/', measure: (p) => openSheet(p, menu(p)) },
  {
    name: 'Header menu close (phone)', path: '/',
    prepare: (p) => openSheet(p, menu(p)),
    measure: async (p) => { await p.keyboard.press('Escape'); await p.locator('[data-sheet]').waitFor({ state: 'detached' }) },
  },
  {
    name: 'Card press and release', path: '/buy/kolkata',
    measure: async (p) => {
      // Headless Chromium does not set :active from synthetic touch; force it.
      const cdp = await p.context().newCDPSession(p)
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
      const { root } = await cdp.send('DOM.getDocument')
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.property-card' })
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] }); await p.waitForTimeout(150)
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }); await p.waitForTimeout(250)
    },
  },
  {
    name: 'Skeleton shimmer (1.6s)', path: '/', hold: true,
    prepare: async (p) => {
      const link = p.locator('a[href="/buy/kolkata/2-bhk"]:visible').first()
      await link.scrollIntoViewIfNeeded(); await link.hover()
      for (let i = 0; i < 200 && !p.prefetched.has('/buy/kolkata/2-bhk'); i++) await p.waitForTimeout(50)
      // .animate-pulse is the pre-UI-04 skeleton, so the script can measure a
      // build from before the motion layer for comparison.
      await link.click(); await p.locator('.skeleton, .animate-pulse').first().waitFor()
    },
    measure: (p) => p.waitForTimeout(1600),
  },
  {
    name: 'Photo fade-in', path: '/buy/kolkata', holdImages: true,
    measure: async (p, release) => {
      release()
      // Ends when the first held photo has arrived and had time to fade
      // (written without data-fade so a pre-UI-04 build measures too).
      await p.waitForFunction(() => [...document.querySelectorAll('.property-card img')].some((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 })
      await p.waitForTimeout(400)
    },
  },
]

const results = {}
try {
  for (const s of scenarios) {
    results[s.name] = []
    for (let i = 0; i < RUNS; i++) {
      let release
      const held = new Promise((r) => { release = r })
      const p = await page(s.path, async (q) => {
        if (s.hold) await q.route('**/buy/kolkata/2-bhk**', async (route) => { const h = route.request().headers(); if (h.rsc && !h['next-router-prefetch']) await held; await route.continue() })
        if (s.holdImages) await q.route('**/_next/image**', async (route) => { await held; await route.continue() })
      })
      if (s.holdImages) await p.waitForFunction(() => document.querySelector('.property-card img'), null, { timeout: 15000 })
      if (s.prepare) await s.prepare(p)
      await startFrames(p)
      await s.measure(p, release)
      results[s.name].push(await stopFrames(p))
      release()
      await p.context().close()
    }
  }
} finally {
  await browser.close()
}

const round = (x) => Math.round(x * 10) / 10
console.log(`\nAnimation performance at 390px, CPU ${CPU}x slower, ${RUNS} runs (median run by p95)\n`)
console.log('scenario                     frames  p50ms  p95ms  maxms  >50ms  longtasks  longtask-ms')
const summary = {}
for (const [name, runs] of Object.entries(results)) {
  const m = [...runs].sort((a, b) => a.p95 - b.p95)[Math.floor(runs.length / 2)]
  summary[name] = { ...m, p50: round(m.p50), p95: round(m.p95), max: round(m.max), longTaskMs: round(m.longTaskMs) }
  console.log(`${name.padEnd(28)} ${String(m.frames).padStart(6)} ${String(round(m.p50)).padStart(6)} ${String(round(m.p95)).padStart(6)} ${String(round(m.max)).padStart(6)} ${String(m.over50).padStart(6)} ${String(m.longTasks).padStart(10)} ${String(round(m.longTaskMs)).padStart(12)}`)
}
if (process.env.OUT) (await import('node:fs')).writeFileSync(process.env.OUT, JSON.stringify({ cpu: CPU, runs: RUNS, base, summary, results }, null, 2))
