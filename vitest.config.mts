import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Vitest needs the same `@/` alias tsconfig gives the app, or a module that
 * imports across domain folders type-checks but fails to run under test —
 * which is the worst of both worlds.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
})
