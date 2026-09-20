import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Property photography is the heaviest payload on every page.
    formats: ['image/avif', 'image/webp'],
    // Widths match the card, gallery and hero slots we actually render.
    deviceSizes: [390, 412, 640, 768, 1024, 1280, 1440],
    imageSizes: [96, 160, 200, 256, 320, 480],
  },
}

export default nextConfig
