/**
 * The map on Search (UI-21): where its code and its basemap come from.
 *
 * MapLibre GL JS (BSD-3-Clause) is served as the package's own ES modules
 * from a versioned path under /vendor (scripts/vendor-maplibre.mjs copies
 * them at build), and imported at runtime only when the map view opens.
 * Not bundled: version 6 runs its worker as a module that imports the same
 * shared file as the main thread, so served side by side the browser
 * fetches that ~147 KB file once. Bundled, webpack gives the page and the
 * worker each their own copy (measured: ~298 KB + ~153 KB gzip instead of
 * ~304 KB).
 *
 * The version here must equal the installed package's: a unit test
 * (config.test.ts) fails the build if they drift.
 */
export const MAPLIBRE_VERSION = '6.12.0'
export const MAPLIBRE_BASE = `/vendor/maplibre-gl/${MAPLIBRE_VERSION}`

/**
 * The basemap style. OpenFreeMap's public instance: free, no key, no
 * account, OpenStreetMap data, "as is" with no uptime promise. Production
 * should host its own copy (OpenFreeMap publishes the full stack) and set
 * NEXT_PUBLIC_MAP_STYLE_URL to it. That is a URL, not a credential: there
 * is no secret for this map anywhere.
 */
export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/positron'
