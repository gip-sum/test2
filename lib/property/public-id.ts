/**
 * The public identity of a listing, and how it travels in a URL.
 *
 * Canonical route grammar (approved):
 *
 *     /property/{slug}-p{id}
 *     /property/2-bhk-flat-for-sale-in-behala-pc70il
 *
 * The stored `publicId` keeps its own `p_` prefix (`p_c70il`) — existing
 * ids are preserved rather than regenerated, so a listing keeps its
 * identity across this change. Only the *rendering* differs: the prefix is
 * normalised away and the grammar's own `p` reintroduced, which is what
 * makes `pc70il` rather than `pp_c70il`.
 *
 * Why the id may not contain a hyphen: the slug does, and parsing splits on
 * the LAST one. `…-in-park-pc70il` resolves correctly precisely because the
 * id after that split is `pc70il` and nothing else. Allowing hyphens in ids
 * would make the boundary ambiguous and the route unparseable.
 *
 * Legacy `-p_c70il` links from before this grammar was adopted still
 * resolve, and the route 301s them to canonical — a development URL that
 * someone bookmarked should not 404.
 */

/** `a–z0–9`, 4–16 characters, no hyphens. */
const ID_BODY = /^[a-z0-9]{4,16}$/

/** Stored id → the token that appears after the slug. `p_c70il` → `pc70il`. */
export function toUrlToken(publicId: string): string {
  return `p${publicId.replace(/^p_/, '')}`
}

/** Stored id → the full path. */
export function propertyPath(slug: string, publicId: string): string {
  return `/property/${slug}-${toUrlToken(publicId)}`
}

export type ParsedHandle = {
  /** The stored publicId this handle refers to. */
  publicId: string
  /** The slug as it appeared in the URL, for canonicalisation. */
  slug: string
  /** True when the handle used the pre-grammar `-p_id` form. */
  legacy: boolean
}

/**
 * Split `{slug}-p{id}` (or the legacy `{slug}-p_{id}`) into its parts.
 *
 * Returns null for anything that is not a well-formed handle, so the route
 * can 404 rather than guess. A bare id, a trailing hyphen, an empty slug
 * and an over-long id all return null.
 */
export function parsePropertyHandle(handle: string): ParsedHandle | null {
  const cut = handle.lastIndexOf('-')
  if (cut <= 0) return null

  const slug = handle.slice(0, cut)
  const token = handle.slice(cut + 1)
  if (!slug || !token.startsWith('p')) return null

  const legacy = token.startsWith('p_')
  const body = legacy ? token.slice(2) : token.slice(1)
  if (!ID_BODY.test(body)) return null

  return { publicId: `p_${body}`, slug, legacy }
}
