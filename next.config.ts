import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Keep these formats/widths in sync with vercel.json's public image endpoint.
    // Services build the frontend separately from the deployment's image config.
    // Property photography is the heaviest payload on every page.
    formats: ['image/avif', 'image/webp'],
    // Widths match the card, gallery and hero slots we actually render.
    deviceSizes: [390, 412, 640, 768, 1024, 1280, 1440],
    imageSizes: [96, 160, 200, 256, 320, 480],
  },
  // The map's vendored MapLibre modules (UI-21, lib/map/config.ts). The
  // version is in the path, so a file there never changes.
  async headers() {
    return [{ source: '/vendor/maplibre-gl/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }]
  },
}

export default nextConfig
