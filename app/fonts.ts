import { Archivo, IBM_Plex_Sans } from 'next/font/google'

/**
 * Display + price face.
 *
 * `latin-ext` is REQUIRED, not optional: Archivo carries U+20B9 (₹) only in
 * that subset. Dropping it silently falls the rupee sign back to another
 * font on every price in the product — verified against the font binaries
 * in Phase 0.
 */
export const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700'],
  variable: '--font-archivo',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
})

/**
 * UI / body face.
 *
 * Chosen over the reference design system's Instrument Sans, which has no
 * rupee glyph in any subset. IBM Plex Sans has uniform 600-unit digit
 * advances, so prices and areas align in columns without depending on a
 * `tnum` feature that neither face actually ships.
 */
export const plex = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
})
