/**
 * How the marketplace works.
 *
 * Deliberately framed as product commitments rather than trust badges or
 * statistics. Every line below describes behaviour the system actually
 * implements — no counts, no ratings, no "verified" claims, nothing the
 * platform cannot stand behind. Overstating trust is the one thing on this
 * page that could cause real harm.
 */
const POINTS = [
  {
    title: 'Listings are reviewed before they go live',
    body: 'Every property is checked against our listing rules first. Photos carrying phone numbers or watermarks are sent back for correction.',
  },
  {
    title: 'You choose when to share your number',
    body: 'Your phone number is never shown on a listing page. It is released only when you ask to see a seller’s details, or when someone contacts you.',
  },
  {
    title: 'You always know who is advertising',
    body: 'Every listing states whether it was posted by an owner, an agent or a builder. You can filter by that before you contact anyone.',
  },
  {
    title: 'Carpet area is stated separately',
    body: 'Carpet, built-up and super built-up are different measurements. We show them apart so the price per square foot you compare is the real one.',
  },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="font-display text-heading-3 text-ink-900">
        How this marketplace works
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {POINTS.map((p) => (
          <li
            key={p.title}
            className="glass-card rounded-lg border border-border-subtle p-5"
          >
            <h3 className="text-body font-semibold text-ink-900">{p.title}</h3>
            <p className="mt-1.5 text-body-sm text-ink-700">{p.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
