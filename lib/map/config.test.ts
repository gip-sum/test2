import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MAPLIBRE_VERSION } from './config'

describe('map config', () => {
  it('serves the installed MapLibre version', () => {
    const pkg = JSON.parse(readFileSync('node_modules/maplibre-gl/package.json', 'utf8')) as { version: string }
    expect(MAPLIBRE_VERSION).toBe(pkg.version)
  })
})
