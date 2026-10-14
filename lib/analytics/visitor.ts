// The view-counting cookie's shape, without node:crypto, so the proxy can
// issue it. What a view is, and why, is in ./views.ts.
export const VISITOR_COOKIE = 'gb-visitor'
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365
// crypto.randomUUID() is always version 4.
export const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
