'use client'

import dynamic from 'next/dynamic'

/**
 * The map's code, fetched only when the map view renders (UI-21): the list
 * view, the default, carries none of it. Client-only, because a map has
 * nothing to show before the browser draws it; until then the frame says
 * it is loading, in the same words the map uses.
 */
export const LazyLocalityMap = dynamic(() => import('./LocalityMap').then((m) => m.LocalityMap), {
  ssr: false,
  loading: () => <div className="map-view"><div className="map-frame" data-status="loading"><p className="map-status" role="status">Loading the map…</p></div></div>,
})
