// Copies MapLibre GL JS's ES modules and stylesheet to a versioned path under
// public/vendor, where the map view imports them at runtime (lib/map/config.ts
// explains why they are served rather than bundled). Runs before build and
// dev; the output is generated, so it is git-ignored.
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const src = 'node_modules/maplibre-gl'
const { version } = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'))
const root = 'public/vendor/maplibre-gl'
const out = join(root, version)
rmSync(root, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const file of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css']) cpSync(join(src, 'dist', file), join(out, file))
cpSync(join(src, 'LICENSE.txt'), join(out, 'LICENSE.txt'))
console.log(`maplibre-gl ${version} → ${out}`)
