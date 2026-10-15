// Shared layout contract for the real workspace pages against local simulators.
// Keep data, authority and mutation assertions in each domain's own suite.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export async function assertWorkspace(page, { area, check, compactRow, maxRowHeight }) {
  const width = page.viewportSize().width
  const contentWidth = await page.evaluate(() => document.documentElement.clientWidth)
  const route = new URL(page.url())
  const label = `workspace ${width} ${route.pathname}${route.search}`
  const report = (name, ok, detail = '') => check(`${label}: ${name}${!ok && detail ? ` (${detail})` : ''}`, ok)
  const shell = page.locator(`[data-workspace="${area}"]`)
  const nav = page.getByRole('navigation', { name: area === 'admin' ? 'Admin sections' : 'Seller sections', exact: true })
  const main = page.locator('#workspace-main')
  const screenshot = async (suffix = '') => {
    if (!process.env.WORKSPACE_SHOT_DIR) return
    mkdirSync(process.env.WORKSPACE_SHOT_DIR, { recursive: true })
    const name = `${route.pathname}${route.search}`.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '')
    await page.screenshot({ path: join(process.env.WORKSPACE_SHOT_DIR, `${name}-${width}${suffix ? `-${suffix}` : ''}.png`), fullPage: true })
  }

  report('one main, title and current role destination without page overflow',
    await shell.count() === 1 && await page.locator('main').count() === 1 && await main.count() === 1 &&
    await page.locator('h1').count() === 1 && await nav.count() === 1 &&
    await nav.locator('a[aria-current="page"]').count() === 1 &&
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))

  // Some domain checks open a disclosure near the page bottom first. Check
  // header hit targets where they are actually on screen, then restore that
  // starting position after exercising the workspace navigation.
  const initial = await page.evaluate(() => ({ x: scrollX, y: scrollY, nav: document.querySelector('.workspace-navigation').scrollLeft }))
  await page.evaluate(() => window.scrollTo(0, 0))

  const geometry = await shell.evaluate((element) => {
    const sidebar = element.querySelector('.workspace-sidebar')
    const topbar = element.querySelector('.workspace-topbar')
    const main = element.querySelector('#workspace-main')
    const title = element.querySelector('h1')
    const nav = element.querySelector('.workspace-navigation')
    const rect = (node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, width: r.width, height: r.height } }
    return {
      sidebar: rect(sidebar), topbar: rect(topbar), main: rect(main), nav: rect(nav),
      sidebarPosition: getComputedStyle(sidebar).position,
      navOverflow: getComputedStyle(nav).overflowX,
      titleSize: parseFloat(getComputedStyle(title).fontSize),
    }
  })
  if (width >= 1024) {
    report('216px sidebar, slim header and compact title leave content clear',
      geometry.sidebarPosition === 'fixed' && Math.abs(geometry.sidebar.x) < 1 && Math.abs(geometry.sidebar.width - 216) < 1 &&
      geometry.topbar.x >= geometry.sidebar.right - 1 && geometry.topbar.height >= 63.5 && geometry.topbar.height <= 66.5 &&
      geometry.main.x >= geometry.sidebar.right - 1 && geometry.main.right <= contentWidth + 1 && Math.abs(geometry.titleSize - 25) < 0.5,
      JSON.stringify(geometry))
  } else {
    report('full-width content and a contained horizontal role navigation',
      geometry.sidebarPosition === 'relative' && Math.abs(geometry.sidebar.width - contentWidth) < 1 &&
      Math.abs(geometry.main.x) < 1 && Math.abs(geometry.main.width - contentWidth) < 1 &&
      geometry.nav.x >= 0 && geometry.nav.right <= contentWidth + 1 && ['auto', 'scroll'].includes(geometry.navOverflow),
      JSON.stringify(geometry))
  }

  const smallChrome = await shell.locator('.workspace-sidebar a, .workspace-topbar a').evaluateAll((nodes) => nodes.flatMap((node) => {
    const r = node.getBoundingClientRect(), style = getComputedStyle(node)
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && (r.width < 43.5 || r.height < 43.5)
      ? [{ text: node.textContent.trim(), width: r.width, height: r.height }] : []
  }))
  report('navigation and header links retain 44px touch targets', smallChrome.length === 0, JSON.stringify(smallChrome))

  // On phones the visible text is hidden; the icon link must still expose
  // its purpose through the browser's computed accessible name.
  const namedAccount = page.getByRole('link', { name: 'My account', exact: true }).and(shell.locator('.workspace-topbar .workspace-account-link'))
  report('header account link retains its accessible name', await namedAccount.count() === 1 && await namedAccount.isVisible())

  const headerTargets = await shell.locator('.workspace-topbar a').evaluateAll((nodes) => nodes.flatMap((node) => {
    const r = node.getBoundingClientRect(), style = getComputedStyle(node)
    if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') return []
    const x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y)
    return [{
      text: node.getAttribute('aria-label') ?? node.textContent.trim(),
      clear: node === hit || node.contains(hit),
      center: { x, y }, hit: { tag: hit?.tagName, class: hit?.getAttribute('class') },
    }]
  }))
  const headerPass = headerTargets.length > 0 && headerTargets.every(target => target.clear)
  if (!headerPass) await screenshot('header-hit-failure')
  report('visible header links receive pointer hits without an overlay', headerPass, JSON.stringify(headerTargets))

  const skip = page.getByRole('link', { name: 'Skip to workspace content', exact: true })
  await skip.focus()
  report('skip link is visible on focus and targets focusable workspace content',
    await skip.getAttribute('href') === '#workspace-main' && await main.getAttribute('tabindex') === '-1' &&
    await skip.evaluate((node) => { const r = node.getBoundingClientRect(); return node === document.activeElement && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= document.documentElement.clientWidth }))

  // Exercise keyboard entry at both ends. Focus must reveal even the last
  // destination in a phone's scrolling rail without moving the whole page.
  const focusStates = []
  for (const link of [nav.getByRole('link').first(), nav.getByRole('link').last()]) {
    await link.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    // Chromium commits a focused rail item's native scroll after paint.
    // Wait for containment rather than mistaking that pending scroll for
    // clipping; a timeout still reaches the unchanged diagnostic assertion.
    const element = await link.elementHandle()
    try {
      const contained = await page.waitForFunction((node) => {
        const r = node.getBoundingClientRect(), parent = node.closest('nav').getBoundingClientRect()
        return r.left >= parent.left - 1 && r.right <= parent.right + 1 && r.left >= -1 && r.right <= document.documentElement.clientWidth + 1
      }, element, { timeout: 2000, polling: 'raf' })
      await contained.dispose()
    } catch (error) {
      if (error.name !== 'TimeoutError') throw error
    } finally {
      await element.dispose()
    }
    focusStates.push(await link.evaluate((node) => {
      const navigation = node.closest('nav'), r = node.getBoundingClientRect(), parent = navigation.getBoundingClientRect(), style = getComputedStyle(node)
      const focusRing = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 1 && style.outlineColor !== 'rgba(0, 0, 0, 0)'
      const nodeActive = node === document.activeElement
      const bounds = (rect) => ({ x: rect.x, y: rect.y, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height })
      return {
        pass: nodeActive && focusRing && r.left >= parent.left - 1 && r.right <= parent.right + 1 && r.left >= -1 && r.right <= document.documentElement.clientWidth + 1,
        text: node.textContent.trim(), nodeActive, focusRing,
        outline: { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor },
        activeElement: { tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim(), href: document.activeElement?.getAttribute('href') },
        rect: bounds(r), parent: bounds(parent), scrollLeft: navigation.scrollLeft,
        window: { left: 0, right: document.documentElement.clientWidth, innerWidth, top: 0, bottom: innerHeight, scrollX, scrollY },
      }
    }))
  }
  const focusPass = focusStates.every(state => state.pass)
  if (!focusPass) await screenshot('focus-failure')
  report('first and last role destinations are reachable with visible keyboard focus', focusPass, JSON.stringify(focusStates))

  await page.evaluate((position) => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    document.querySelector('.workspace-navigation').scrollLeft = position.nav
    window.scrollTo(position.x, position.y)
  }, initial)

  if (width >= 1024 && compactRow) {
    const row = await compactRow.boundingBox()
    report('ordinary collection rows remain compact', Boolean(row && row.height > 0 && row.height <= maxRowHeight), JSON.stringify({ height: row?.height, maximum: maxRowHeight }))
  }

  await screenshot()
}
