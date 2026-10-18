import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@/lib/cn'

/**
 * Variants carry FIXED meaning across the product:
 *   primary   the buyer's action  — Search, Enquire, Save
 *   supply    the seller's action — Post Property, Publish, Renew
 *   secondary the alternative beside a primary
 *   tertiary  low emphasis, inline
 *   outline   a brand action that is not the surface's primary — Review,
 *             Update status, Save description (UI-06: five places drew it
 *             by hand)
 *   secondaryBrand
 *             a tool beside the work — the photo tools, Withdraw to draft,
 *             Preview property, Save & exit (UI-09: eleven places drew it by
 *             hand). Secondary's neutral border with brand text: quieter
 *             than `outline`, and not named after it, because the border
 *             is not brand.
 *   danger    destructive
 *   text      an action inside a sentence or an alert — Reload status, Try
 *             again, Copy link (UI-12)
 *
 * Exactly ONE filled primary per surface. Two competing filled buttons
 * measurably reduce clicks on both.
 */
type Variant = 'primary' | 'supply' | 'secondary' | 'secondaryBrand' | 'tertiary' | 'outline' | 'danger' | 'text'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  // on-brand / on-supply flip to dark ink in dark theme — never hardcode #fff
  primary: 'bg-brand-600 text-on-brand hover:bg-brand-700 border-transparent',
  supply: 'bg-supply-600 text-on-supply hover:brightness-95 border-transparent',
  secondary:
    'bg-transparent text-ink-900 border-border-strong hover:border-ink-500',
  secondaryBrand: 'bg-transparent text-brand-700 border-border-strong hover:bg-brand-100',
  tertiary: 'bg-transparent text-brand-600 border-transparent hover:bg-brand-100',
  outline: 'bg-transparent text-brand-700 border-brand-700 hover:bg-brand-100',
  danger: 'bg-danger-600 text-on-danger border-transparent hover:brightness-95',
  // An action that reads as part of a sentence or an alert: "Reload status",
  // "Try again", "Copy link" (UI-12). Underlined, in the colour of the text
  // around it (a caller may set one), at the size of that text, with the
  // 44px target kept. Eight hand-drawn copies of this looked nearly alike.
  text: 'bg-transparent text-current border-transparent underline underline-offset-4 hover:decoration-2',
}

// The text variant takes its size from the sentence it sits in; only the
// touch target is fixed.
const TEXT_SIZE = 'min-h-11 px-0'

// 44px minimum touch target on md and lg; sm is for dense desktop toolbars only.
const SIZE: Record<Size, string> = {
  sm: 'min-h-8 px-3 text-label',
  md: 'min-h-11 px-4 text-label',
  lg: 'min-h-12 px-6 text-body',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** A dialog's trigger passes one so focus returns to it (React 19 passes refs as props). */
  ref?: Ref<HTMLButtonElement>
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  children: ReactNode
}

/**
 * The button's classes, for a link that must look like one.
 *
 * Navigation is a link, never a <button> inside a link: nesting two
 * interactive elements is invalid HTML, puts two tab stops on one control
 * and announces it twice. A link styled here stays one element with the
 * right role and still looks like every other button.
 */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: { variant?: Variant; size?: Size; fullWidth?: boolean; className?: string } = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md border font-semibold',
    'transition-colors disabled:cursor-not-allowed disabled:opacity-45',
    // Unavailable without being busy — aria-disabled so a focused control
    // keeps focus (UI-09, e.g. "Earlier" on the first photo) — looks as
    // disabled does. A busy button (aria-busy too) keeps its full colour.
    '[&[aria-disabled=true]:not([aria-busy=true])]:cursor-not-allowed [&[aria-disabled=true]:not([aria-busy=true])]:opacity-45',
    VARIANT[variant],
    variant === 'text' ? TEXT_SIZE : SIZE[size],
    fullWidth && 'w-full',
    className,
  )
}

/**
 * A busy button refuses the press instead of becoming `disabled` (UI-07).
 *
 * Disabling the focused button made Chrome move focus to <body> for the
 * whole wait — a keyboard or screen-reader user was dropped at the top of
 * the page just after submitting. `aria-disabled` keeps focus where it was
 * and still says the control is unavailable. Cancelling the click also
 * cancels a form submission, including the one Enter makes in a field (the
 * browser's implicit submission clicks the default button), so a busy form
 * cannot be sent twice.
 */
function refuseWhileBusy(event: React.MouseEvent<HTMLButtonElement>) {
  event.preventDefault()
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  disabled,
  className,
  children,
  onClick,
  ...rest
}: Props) {
  // A caller's aria-disabled (unavailable for now, still focusable — the
  // other action is busy, the photo is already first) is honoured and
  // refused like busy.
  const unavailable = loading || rest['aria-disabled'] === true || rest['aria-disabled'] === 'true'
  return (
    <button
      {...rest}
      disabled={disabled}
      aria-disabled={unavailable || undefined}
      aria-busy={loading || undefined}
      onClick={unavailable ? refuseWhileBusy : onClick}
      className={buttonClassName({ variant, size, fullWidth, className: cn(loading && 'cursor-progress', className) })}
    >
      {/* The button keeps its width while loading — a shrinking button
          moves everything beside it. */}
      {loading && (
        <span
          className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
}
