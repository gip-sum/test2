import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The @theme type scale in app/globals.css, by name. cn.test.ts fails if
 * the two drift apart.
 *
 * tailwind-merge only knows Tailwind's default sizes (`text-sm`,
 * `text-lg` …). Every other `text-*` it files as a COLOUR, so out of the
 * box `cn('text-body-sm', 'text-ink-700')` returns `text-ink-700` alone and
 * the size silently disappears — on almost every line of text in the
 * product. Naming the scale here is what stops that.
 */
export const TYPE_SCALE = [
  'display-xl', 'display-1', 'heading-1', 'heading-2', 'heading-3',
  'body-lg', 'body', 'body-sm', 'label', 'overline', 'caption',
  'price-lg', 'price', 'stat',
] as const

/** The @theme elevation scale and role shadows. Unlisted, `shadow-e2 shadow-none` would keep both. */
export const SHADOW_SCALE = ['e0', 'e1', 'e2', 'e3', 'float', 'panel', 'glass', 'tile', 'raised', 'lift', 'hero'] as const

/** The @theme font families (`font-sans`, `font-display`). */
export const FONT_FAMILIES = ['sans', 'display'] as const

const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...TYPE_SCALE],
      shadow: [...SHADOW_SCALE],
      font: [...FONT_FAMILIES],
    },
  },
  override: {
    conflictingClassGroups: {
      // tailwind-merge drops an earlier `leading-*` when a text size follows
      // it. In Tailwind v4 that is wrong for this project: every type token
      // compiles to `line-height: var(--tw-leading, <token leading>)`, so an
      // explicit `leading-*` wins whatever the order. Removing it would
      // change what renders.
      'font-size': [],
    },
  },
})

/**
 * Join class names and resolve Tailwind conflicts: the LAST conflicting
 * utility wins (`cn('h-11', 'h-12')` → `h-12`), which is what lets a
 * caller's `className` override a primitive's defaults.
 *
 * Accepts everything the old dependency-free join did (strings and falsy
 * values) plus clsx arrays and objects, which components adapted from the
 * Kokonut UI and Bklit UI registries use.
 */
export function cn(...parts: ClassValue[]): string {
  return merge(clsx(parts))
}
