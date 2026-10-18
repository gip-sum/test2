// Client JavaScript cost per route, measured from a production build.
//
// UI modernization (docs/ui-modernization/) adds client libraries; this is
// the number each stage is compared against. It measures what a browser
// downloads before the page is interactive: the <script src> tags the
// server puts in a route's HTML, sized from the files in .next/static
// (raw, gzip -9 and brotli -11, so the result does not depend on a CDN).
//
// Why the served HTML and not the build manifests: Next 16's per-route
// client-reference manifest lists every client chunk a route *could* load,
// including chunks only fetched later (by next/dynamic or by a nested
// segment), so summing it over-counts. The HTML is the truth about the
// first load. The cost is that the app must be running, and that signed-in
// routes need a session. Pass COOKIE to measure them from HTML; without one
// they fall back to the manifest and are marked "upper bound", never mixed
// silently with first-load figures.
//
//   npm run build && npm run start           (port 3100)
//   npm run bundle-report                    print the table
//   npm run bundle-report -- --json out.json also write the measurements
//   npm run bundle-report -- --compare docs/ui-modernization/bundle-baseline.json
//
// The polyfill chunk is excluded: it is a nomodule script that no browser
// GharBazaar supports downloads.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const BASE = process.env.BASE ?? 'http://127.0.0.1:3100'
const STATIC = join(process.cwd(), '.next')
export const ROUTES = [
  ['Home', '/'],
  ['Search (buy)', '/buy/kolkata'],
  ['Search (rent)', '/rent/kolkata'],
  ['Search (filtered)', '/buy/kolkata?loc=uttarpara-kotrung,ballygunge&bhk=2,3,4&type=APARTMENT&sort=price_desc'],
  ['Property details', '/property/4-bhk-flat-for-sale-in-ballygunge-p5d40ab'],
  ['Login', '/login'],
  ['Post property', '/post'],
  // Behind sign-in (a guest is redirected), so measured from its manifest:
  // the photo manager and its reorder animation live here (UI-08).
  ['Post photos', '/post/photos', 'post/photos'],
  ['EMI calculator', '/calculators/emi'],
  ['Activity (guest)', '/account/activity'],
  ['Not found (404)', '/this-page-does-not-exist'],
  ['Seller dashboard', '/dashboard', 'dashboard'],
  ['Seller performance', '/dashboard/performance', 'dashboard/performance'],
  ['Admin overview', '/admin', 'admin'],
]

const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }

const sizeCache = new Map()
function size(file) {
  if (!sizeCache.has(file)) {
    const buf = readFileSync(join(STATIC, file))
    sizeCache.set(file, {
      raw: buf.length,
      gzip: gzipSync(buf, { level: 9 }).length,
      brotli: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
    })
  }
  return sizeCache.get(file)
}

function sum(files) {
  const total = { raw: 0, gzip: 0, brotli: 0 }
  for (const f of files) { const s = size(f); total.raw += s.raw; total.gzip += s.gzip; total.brotli += s.brotli }
  return total
}

/** Every chunk a route could load: the root main files plus its client-reference manifest. */
function manifestFiles(segment) {
  const file = join(STATIC, 'server/app', segment, 'page_client-reference-manifest.js')
  if (!existsSync(file)) return null
  const ctx = {}
  ctx.globalThis = ctx
  runInNewContext(readFileSync(file, 'utf8'), ctx)
  const manifest = Object.values(ctx.__RSC_MANIFEST)[0]
  const files = new Set(JSON.parse(readFileSync(join(STATIC, 'build-manifest.json'), 'utf8')).rootMainFiles)
  for (const mod of Object.values(manifest.clientModules)) for (const c of mod.chunks) if (String(c).endsWith('.js')) files.add(c)
  return [...files].sort()
}

async function measure(path, segment) {
  const res = await fetch(BASE + path, { redirect: 'manual', headers: process.env.COOKIE ? { cookie: process.env.COOKIE } : {} })
  if (res.status >= 300 && res.status < 400) {
    const files = segment && manifestFiles(segment)
    return files
      ? { status: res.status, method: 'manifest upper bound', files, ...sum(files) }
      : { status: res.status, redirect: res.headers.get('location') }
  }
  const html = await res.text()
  const files = [...new Set([...html.matchAll(/<script[^>]*\ssrc="\/_next\/(static\/[^"]+\.js)"[^>]*>/g)]
    .filter((m) => !/\snoModule|\snomodule/.test(m[0]))
    .map((m) => decodeURIComponent(m[1])))].sort()
  return { status: res.status, method: 'first load (HTML)', files, ...sum(files) }
}

const kb = (n) => (n / 1024).toFixed(1)
const results = {}
for (const [name, path, segment] of ROUTES) results[name] = { path, ...(await measure(path, segment)) }

const baseline = flag('--compare') ? JSON.parse(readFileSync(flag('--compare'), 'utf8')).routes : null
console.log(`Client JS on first load — ${BASE}`)
console.log('route'.padEnd(22), 'files'.padStart(5), 'raw KB'.padStart(8), 'gzip KB'.padStart(8), 'br KB'.padStart(7), baseline ? 'Δ gzip KB'.padStart(10) : '')
for (const [name, r] of Object.entries(results)) {
  if (!r.files) { console.log(name.padEnd(22), `  ${r.status} → ${r.redirect} (needs a session; not measured)`); continue }
  const b = baseline?.[name]
  const delta = b?.gzip != null ? (r.gzip - b.gzip >= 0 ? '+' : '') + kb(r.gzip - b.gzip) : baseline ? 'n/a' : ''
  console.log(name.padEnd(22), String(r.files.length).padStart(5), kb(r.raw).padStart(8), kb(r.gzip).padStart(8), kb(r.brotli).padStart(7), delta.padStart(10), r.method === 'first load (HTML)' ? '' : `  (${r.method})`)
}
if (flag('--json')) {
  const buildId = readFileSync(join(STATIC, 'BUILD_ID'), 'utf8').trim()
  writeFileSync(flag('--json'), JSON.stringify({ measuredAt: new Date().toISOString(), buildId, base: BASE, routes: results }, null, 2) + '\n')
  console.log(`\nwrote ${flag('--json')}`)
}
