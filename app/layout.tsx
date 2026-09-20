import type { Metadata, Viewport } from 'next'
import { archivo, plex } from './fonts'
import { BRAND } from '@/lib/brand'
import './globals.css'

/**
 * Metadata architecture.
 *
 * Every brand-dependent value resolves from lib/brand.ts, so inserting the
 * real name and domain later is a one-file change — no page needs editing.
 * `title.template` means each route sets only its own title.
 */
export const metadata: Metadata = {
  metadataBase: new URL(BRAND.origin),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.shortName}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    locale: 'en_IN',
  },
  // The card image itself comes from app/opengraph-image.png by file
  // convention; Twitter needs the card type declared or it degrades to a
  // thumbnail even when an image is present.
  twitter: { card: 'summary_large_image' },
  // The placeholder origin must never be indexed. Phase 8 flips this once a
  // real domain exists.
  robots: BRAND.isPlaceholder ? { index: false, follow: false } : undefined,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7f7' },
    { media: '(prefers-color-scheme: dark)', color: '#141d1c' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${archivo.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  )
}
