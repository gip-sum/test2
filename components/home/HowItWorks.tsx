const POINTS = [
  { title: 'Find your corner of the city', body: 'Choose your neighbourhoods, budget and bedrooms. Shape the search around the life you want.' },
  { title: 'Get a feel for the details', body: 'Explore photos, compare clearly labelled areas and see whether an owner, agent or builder is advertising.' },
  { title: 'Keep your favourites close', body: 'Save homes to your account and return when you are ready to take a closer look.' },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="home-how">
      <p className="text-overline uppercase tracking-[0.16em] text-brand-600">A little clarity. A big decision.</p>
      <h2 id="how-it-works" className="mt-1 font-display text-ink-900">A simpler way to find home.</h2>
      <ol className="how-steps">
        {POINTS.map((point, index) => (
          <li key={point.title} className="how-step">
            <span className="how-number" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <h3 className="text-body font-semibold text-ink-900 sm:text-body-lg">{point.title}</h3>
              <p className="mt-1 text-body-sm text-ink-700 sm:text-body">{point.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
