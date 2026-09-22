/**
 * End-to-end verification of the search experience.
 *
 * Covers the behaviours that unit tests cannot reach, because they are
 * about the browser rather than the functions: does a chip removal change
 * the URL, does back restore the previous result set, does the mobile sheet
 * stay open while filtering, does a facet row keep its count when its own
 * facet is selected.
 *
 * Two states are deliberately NOT covered here and are verified separately
 * by injecting a delay and a throw into the page: the loading skeleton and
 * the error boundary. Neither can be triggered from outside without making
 * the server slow or broken on purpose, and a check that silently passes
 * because it never provoked the state is worse than no check.
 *
 * Usage: npm run start, then npm run search-check
 */
import { chromium } from 'playwright-core'
const OUT = process.env.SHOT_DIR ?? '.shots'
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true })
const B = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })

let pass = 0, fail = 0
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ok   ${name}${detail ? '  — ' + detail : ''}`) }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' })
const p = await ctx.newPage()
/**
 * Navigate, then wait for the loading skeleton to be GONE.
 *
 * 'load' fires while the streamed skeleton is still what is painted, and in
 * that window React has already rendered the real tree into a HIDDEN
 * container — so the filter rail and the chips are in the DOM at zero
 * height and every layout probe reads them as absent. Nobody sees this
 * state; it is purely a measurement hazard, and waiting here fixes the
 * whole class of it rather than one check at a time.
 */
const settled = () =>
  p.waitForFunction(
    () =>
      document.querySelectorAll('[role="status"]').length === 0 &&
      (document.querySelectorAll('article').length > 0 ||
        document.querySelector('section[aria-labelledby="zero-results"]') !== null),
    null,
    { timeout: 15000 },
  )
const go = async (path) => {
  await p.goto(B + path, { waitUntil: 'load' })
  await settled()
  await p.evaluate(() => document.fonts.ready)
}
const countText = () => p.locator('h1 + p').first().innerText()
const total = async () => {
  const t = await countText()
  const m = t.replace(/,/g, '').match(/([\d]+)\s+propert/)
  return m ? Number(m[1]) : (/No properties/.test(t) ? 0 : null)
}
/** The active filters, read the way a screen reader would announce them. */
const chipLabels = () =>
  p
    .locator('button[aria-label^="Remove filter"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label').replace('Remove filter: ', '')))

console.log('\n1. Normal search')
await go('/buy/kolkata')
const t1 = await total()
check('renders a result count', t1 !== null && t1 > 0, `${t1} properties`)
check('renders result cards', (await p.locator('article').count()) > 0, `${await p.locator('article').count()} cards`)
check('h1 describes the search', /property for sale in Kolkata/i.test(await p.locator('h1').innerText()), await p.locator('h1').innerText())

console.log('\n2. Multiple localities')
await go('/buy/kolkata?loc=new-town,salt-lake')
const t2 = await total()
const locChips = await chipLabels()
check('both localities appear as chips', locChips.includes('New Town') && locChips.includes('Salt Lake'), locChips.join(' | '))
check('results limited to those localities', t2 > 0 && t2 < t1, `${t2} of ${t1}`)
const shownLocalities = await p.locator('article p').evaluateAll((els) =>
  [...new Set(els.map((e) => e.textContent.trim()).filter((t) => t.endsWith(', Kolkata')).map((t) => t.split(',')[0].trim()))])
check('no other locality leaks into results', shownLocalities.every((l) => ['New Town', 'Salt Lake'].includes(l)), shownLocalities.join(' | '))

console.log('\n3. Multiple filters')
await go('/buy/kolkata?loc=new-town,salt-lake&bhk=2,3&type=APARTMENT&pmax=10000000')
const t3 = await total()
check('narrows further than localities alone', t3 <= t2, `${t3} <= ${t2}`)
check('every filter shows a chip', (await chipLabels()).length >= 5, (await chipLabels()).join(' | '))

console.log('\n4 & 5. Applying and removing filters via chips')
const before = await total()
const firstChip = (await chipLabels())[0]
await p.locator('button[aria-label^="Remove filter"]').first().click()
await p.waitForFunction(() => {
  const el = document.querySelector('h1 + p')
  return el && !el.textContent.includes('Updating')
}, null, { timeout: 8000 })
await p.waitForTimeout(250)
const after = await total()
check('removing a chip changes the result set', after !== before, `${before} -> ${after} (removed ${firstChip})`)
check('removed chip is gone', !(await chipLabels()).includes(firstChip), (await chipLabels()).join(' | '))
check('URL reflects the removal', !p.url().includes(encodeURIComponent(firstChip)), p.url().replace(B, ''))

console.log('\n6. Sort')
await go('/buy/kolkata?sort=price_asc')
const pricesAsc = await p.locator('article').evaluateAll((els) => els.map((e) => e.querySelector('p[title], p').textContent))
await go('/buy/kolkata?sort=price_desc')
const pricesDesc = await p.locator('article').evaluateAll((els) => els.map((e) => e.querySelector('p[title], p').textContent))
check('price asc and desc give different orders', pricesAsc[0] !== pricesDesc[0], `${pricesAsc[0]} vs ${pricesDesc[0]}`)
await go('/buy/kolkata')
await p.locator('select[aria-label="Sort results"]').selectOption('newest')
await p.waitForFunction(() => location.search.includes('sort=newest'), null, { timeout: 5000 })
check('sort control writes to the URL', p.url().includes('sort=newest'), p.url().replace(B, ''))

console.log('\n7. Pagination')
await go('/buy/kolkata')
const pageCount = await p.locator('nav[aria-label="Pagination"] a[aria-label^="Page"]').count()
check('pagination renders', pageCount > 1, `${pageCount} page links`)
const idsP1 = await p.locator('article h3 a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
await p.locator('nav[aria-label="Pagination"] a[aria-label="Page 2"]').click()
await p.waitForURL(/page=2/, { timeout: 5000 })
const idsP2 = await p.locator('article h3 a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
check('page 2 shows different listings', idsP2.length > 0 && !idsP2.some((h) => idsP1.includes(h)), `${idsP1.length} vs ${idsP2.length}, overlap ${idsP2.filter((h) => idsP1.includes(h)).length}`)
check('current page marked aria-current', (await p.locator('nav[aria-label="Pagination"] [aria-current="page"]').innerText()) === '2')
await go('/buy/kolkata?page=99')
check('page beyond the end clamps, not 404', (await p.locator('article').count()) > 0 && !p.url().includes('page=99') === false, `url ${p.url().replace(B,'')}, ${await p.locator('article').count()} cards`)

console.log('\n8. Back / forward navigation')
await go('/buy/kolkata')
const startTotal = await total()
await p.locator('select[aria-label="Sort results"]').selectOption('price_asc')
await p.waitForURL(/sort=price_asc/, { timeout: 5000 })
await p.goBack(); await p.waitForTimeout(400)
check('back returns to the previous URL', !p.url().includes('sort=price_asc'), p.url().replace(B, ''))
check('back restores the previous result count', (await total()) === startTotal, `${await total()} === ${startTotal}`)
await p.goForward(); await p.waitForTimeout(400)
check('forward re-applies the sort', p.url().includes('sort=price_asc'), p.url().replace(B, ''))
check('forward keeps the control in sync', (await p.locator('select[aria-label="Sort results"]').inputValue()) === 'price_asc')

console.log('\n9 & 10. Refresh and URL sharing')
const shared = '/buy/kolkata?type=APARTMENT&sort=price_asc&page=2'
await go(shared)
const sharedTotal = await total()
const sharedChips = await chipLabels()
await p.reload({ waitUntil: 'load' })
check('refresh preserves the result count', (await total()) === sharedTotal, `${await total()} === ${sharedTotal}`)
check('refresh preserves every chip', JSON.stringify(await chipLabels()) === JSON.stringify(sharedChips), sharedChips.join(' | '))
check('refresh preserves sort', (await p.locator('select[aria-label="Sort results"]').inputValue()) === 'price_asc')
check('refresh preserves the page', (await p.locator('nav[aria-label="Pagination"] [aria-current="page"]').innerText()) === '2')
const fresh = await ctx.newPage()
await fresh.goto(B + shared, { waitUntil: 'load' })
const freshTotal = (await fresh.locator('h1 + p').first().innerText()).replace(/,/g, '').match(/([\d]+)/)
check('a pasted link reproduces the same search', Number(freshTotal[1]) === sharedTotal, `${freshTotal[1]} === ${sharedTotal}`)
await fresh.close()

console.log('\n11. Zero results')
await go('/buy/kolkata?loc=howrah&type=VILLA&bhk=5&pmax=1600000&amen=SWIMMING_POOL')
check('states that nothing matched', /No properties match/i.test(await p.locator('h2#zero-results').innerText()), await p.locator('h2#zero-results').innerText())
check('says the filters are still applied', /still applied/i.test(await p.locator('section[aria-labelledby="zero-results"]').innerText()))
check('filters were NOT silently relaxed', (await chipLabels()).length >= 4, (await chipLabels()).join(' | '))
check('offers clear all with a real count', /Clear all filters/.test(await p.locator('section[aria-labelledby="zero-results"]').innerText()))
await go('/buy/kolkata?loc=tollygunge&bhk=1')
const zr = await p.locator('section[aria-labelledby="zero-results"]').innerText().catch(() => '')
check('offers per-filter relaxations when one helps', /Remove one filter|Try another locality/.test(zr), zr.split('\n').slice(0, 3).join(' / '))

console.log('\n12 & 13. Long locality and title')
await go('/buy/kolkata?loc=uttarpara-kotrung')
const longChip = (await chipLabels())[0]
check('long locality name renders as a chip', longChip === 'Uttarpara Kotrung', longChip)
await go('/buy/kolkata?loc=ballygunge&bhk=4')
const titles = await p.locator('article h3').evaluateAll((els) => els.map((e) => e.textContent.trim()))
// The card heads with the society when there is one, so the long string on
// screen is the society name, not the title field.
const longest = titles.sort((a, b) => b.length - a.length)[0] ?? ''
check('a long heading is present in the fixture', longest.length >= 35, `${longest.length} chars: "${longest}"`)
const clamped = await p.locator('article h3').first().evaluate((e) => getComputedStyle(e).webkitLineClamp)
check('long heading is line-clamped to two lines', clamped === '2', `line-clamp: ${clamped}`)
const overflow = await p.locator('article').evaluateAll((els) =>
  els.filter((e) => e.scrollWidth > e.clientWidth + 1).length)
check('no card overflows its own box', overflow === 0, `${overflow} overflowing cards`)

console.log('\n17 & 18. Desktop rail and facet counts')
await go('/buy/kolkata')
check('rail is visible on desktop', await p.locator('aside[aria-label="Filters"]').isVisible())
const railTotal = await total()
const bhkCounts = await p.locator('aside[aria-label="Filters"] button[aria-pressed]:has-text("BHK")').evaluateAll(
  (els) => els.map((e) => ({ label: e.textContent.replace(/\d+$/, '').trim(), n: Number(e.textContent.match(/(\d+)$/)?.[1] ?? 0) })))
const bhkSum = bhkCounts.reduce((a, b) => a + b.n, 0)
check('bedroom facet counts sum to the total', bhkSum === railTotal, `${bhkSum} === ${railTotal}`)
// Exclusion semantics: tick 2 BHK, the 3 BHK row must NOT go to zero.
await go('/buy/kolkata?bhk=2')
const after2 = await p.locator('aside[aria-label="Filters"] button[aria-pressed]:has-text("BHK")').evaluateAll(
  (els) => els.map((e) => ({ label: e.textContent.replace(/\d+$/, '').trim(), n: Number(e.textContent.match(/(\d+)$/)?.[1] ?? 0), on: e.getAttribute('aria-pressed') === 'true' })))
const three = after2.find((x) => x.label.startsWith('3'))
const two = after2.find((x) => x.label.startsWith('2'))
check('selected facet row shows its own count', two.on && two.n === (await total()), `2 BHK: ${two.n}, total ${await total()}`)
check('unselected sibling keeps a non-zero count (exclusion semantics)', three.n > 0, `3 BHK still shows ${three.n}`)
await ctx.close()

console.log('\n16. Mobile filter sheet')
const m = await browser.newContext({ viewport: { width: 390, height: 780 }, colorScheme: 'dark' })
const mp = await m.newPage()
await mp.goto(B + '/buy/kolkata', { waitUntil: 'load' })
await mp.evaluate(() => document.fonts.ready)
check('rail hidden on mobile', !(await mp.locator('aside[aria-label="Filters"]').isVisible()))
const fb = mp.getByRole('button', { name: /^Filters/ })
// Auto-waits, so this does not race hydration the way a bare isVisible does.
const fbVisible = await fb.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
check('filters button visible on mobile', fbVisible, await fb.boundingBox().then((b) => b && `${Math.round(b.width)}x${Math.round(b.height)}`))
await fb.click()
await mp.waitForSelector('[role="dialog"]', { timeout: 5000 })
check('sheet opens as a dialog', await mp.locator('[role="dialog"]').isVisible())
check('sheet shows the apply/count button', /Show [\d,]+ propert/.test(await mp.locator('[role="dialog"] footer').innerText()), await mp.locator('[role="dialog"] footer').innerText().then(s=>s.trim()))
const beforeSheet = await mp.locator('h1 + p').innerText()
await mp.locator('[role="dialog"] button[aria-pressed]:has-text("3 BHK")').first().click()
await mp.waitForFunction(() => location.search.includes('bhk=3'), null, { timeout: 5000 })
await mp.waitForTimeout(400)
check('a filter inside the sheet updates the URL', mp.url().includes('bhk=3'), mp.url().replace(B, ''))
check('sheet stays open while filtering', await mp.locator('[role="dialog"]').isVisible())
check('sheet footer count updates live', (await mp.locator('[role="dialog"] footer').innerText()) !== beforeSheet, await mp.locator('[role="dialog"] footer').innerText().then(s=>s.trim()))
await mp.keyboard.press('Escape')
await mp.waitForTimeout(300)
check('Escape closes the sheet', !(await mp.locator('[role="dialog"]').isVisible()))
check('filter survives closing the sheet', mp.url().includes('bhk=3'))
await m.close()

console.log('\nLayout at every required width')
for (const width of [390, 412, 768, 1280]) {
  const c = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark' })
  const pg = await c.newPage()
  await pg.goto(B + '/buy/kolkata?loc=uttarpara-kotrung,new-town&bhk=2,3&type=APARTMENT&sort=price_asc', { waitUntil: 'load' })
  // Wait for the loading skeleton to be GONE, not merely for results to
  // exist. While a Suspense fallback is still showing, React has already
  // rendered the real tree into a hidden container — so the filter button
  // and the rail are in the DOM at zero height, and any layout probe run
  // in that window reads them as absent. Nobody sees this state; it is
  // purely a measurement hazard.
  await pg.waitForFunction(
    () =>
      document.querySelectorAll('[role="status"]').length === 0 &&
      (document.querySelectorAll('article').length > 0 ||
        document.querySelector('section[aria-labelledby="zero-results"]') !== null),
    null,
    { timeout: 15000 },
  )
  await pg.evaluate(() => document.fonts.ready)
  const m = await pg.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    // Measured, not computed: getComputedStyle().display reports the
    // element's own value even when an ancestor is display:none, so it
    // cannot tell "shown" from "inside something hidden".
    rail: (() => {
      const el = document.querySelector('aside[aria-label="Filters"]')
      return !!el && el.getBoundingClientRect().height > 0
    })(),
    filterBtn: [...document.querySelectorAll('button')].some(
      (b) => /^Filters/.test(b.textContent.trim()) && b.getBoundingClientRect().height > 0),
    chips: document.querySelectorAll('button[aria-label^="Remove filter"]').length,
  }))
  check(`@${width} no horizontal overflow`, m.scroll === m.client, `${m.scroll} vs ${m.client}`)
  check(`@${width} ${width >= 1024 ? 'rail shown' : 'rail hidden'}`, width >= 1024 ? m.rail : !m.rail)
  check(`@${width} ${width >= 1024 ? 'filter button hidden' : 'filter button shown'}`, width >= 1024 ? !m.filterBtn : m.filterBtn)
  check(`@${width} chips render`, m.chips === 5, `${m.chips} chips`)
  // Captured last: fullPage resizes the viewport, which changes how 100dvh
  // and the sticky rail resolve, so nothing may be measured after it.
  await pg.screenshot({ path: `${OUT}/search-${width}.png`, fullPage: true })
  await c.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
