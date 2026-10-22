import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Animation imports (UI-02, docs/ui-modernization/UI-02-foundation.md).
// One package, one entry point, lazily loaded features: these are the
// mistakes registry code (Kokonut UI, Bklit UI) and habit most often bring in.
const animationImports = {
  paths: [
    { name: 'framer-motion', message: 'Import from "motion/react". framer-motion is the legacy package name; the app pins `motion` only.' },
    { name: 'motion', message: 'React code imports from "motion/react". The bare "motion" entry is the vanilla-JS API.' },
    { name: 'motion/react', importNames: ['motion'], message: 'Use `m` inside <MotionFeatures> (components/motion). `motion.*` bundles every animation feature into the page.' },
    // Measured in UI-02: `m` taken from the motion/react barrel pulls the
    // animation features into the page's first-load chunk (~38.6 KB gzip on
    // the probe page), defeating MotionFeatures' lazy load. The dedicated
    // entry keeps them in a separate chunk fetched after hydration.
    { name: 'motion/react', importNames: ['m'], message: "Import `m` as `import * as m from 'motion/react-m'` so animation features stay lazily loaded." },
    { name: 'motion/react-client', message: "Use `import * as m from 'motion/react-m'` inside a small client leaf wrapped in <MotionFeatures>." },
    { name: 'animejs', message: 'Anime.js is approved but not installed: add it with the first feature that needs a complex timeline (UI-02 decision).' },
  ],
  patterns: [{ group: ['framer-motion/*'], message: 'Import from "motion/react".' }],
}

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { 'no-restricted-imports': ['error', animationImports] } },
  // public/vendor: MapLibre's own built modules, copied at build (UI-21).
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '.shots/**', 'tmp/**', 'public/vendor/**']),
])
