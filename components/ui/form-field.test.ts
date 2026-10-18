import { createElement, type FC, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button, buttonClassName } from './Button'
import { FormField, FormFieldset, type FieldControl } from './FormField'
import { StatusBadge } from './StatusBadge'

const html = (type: unknown, props: Record<string, unknown>) => renderToStaticMarkup(createElement(type as FC, props))
const input = (control: FieldControl) => createElement('input', { ...control, name: 'carpet' })

describe('FormField (UI-09)', () => {
  it('ties the label, hint and error to the control, and marks it invalid only with an error', () => {
    const quiet = html(FormField, { id: 'field-carpet', messageId: 'carpet', label: 'Carpet area', hint: 'For example 1,240', children: input })
    expect(quiet).toContain('<label for="field-carpet"')
    expect(quiet).toContain('<p id="carpet-hint"')
    expect(quiet).toMatch(/<input id="field-carpet" aria-describedby="carpet-hint" name="carpet"\/>/)
    expect(quiet).not.toContain('aria-invalid')

    const wrong = html(FormField, { id: 'field-carpet', messageId: 'carpet', label: 'Carpet area', hint: 'For example 1,240', error: 'Enter the carpet area.', children: input })
    expect(wrong).toMatch(/<input id="field-carpet" aria-invalid="true" aria-describedby="carpet-hint carpet-error"/)
    // The error follows the control, and says what it is to a screen reader.
    expect(wrong.indexOf('<input')).toBeLessThan(wrong.indexOf('id="carpet-error"'))
    expect(wrong).toContain('<span class="sr-only">Error: </span>Enter the carpet area.')
  })

  it('names messages after the control by default and marks an optional answer in the label', () => {
    const out = html(FormField, { id: 'location-lat', label: 'Latitude', optional: true, error: 'Enter decimal degrees.', children: input })
    expect(out).toMatch(/aria-describedby="location-lat-error"/)
    expect(out).toMatch(/<label for="location-lat"[^>]*>Latitude<span[^>]*> \(optional\)<\/span><\/label>/)
  })

  it('describes a group of choices on the fieldset, never on a radio', () => {
    const out = html(FormFieldset, { messageId: 'bhk', legend: 'Bedrooms (BHK)', error: 'Choose the number of bedrooms.', children: createElement('input', { type: 'radio', name: 'bhk' }) as ReactNode })
    expect(out).toMatch(/<fieldset aria-describedby="bhk-error"/)
    expect(out).toContain('<legend')
    expect(out).not.toMatch(/type="radio"[^>]*aria-invalid/)
  })
})

describe('Button (UI-09)', () => {
  it('honours an aria-disabled from the caller, which keeps the control focusable', () => {
    const out = html(Button, { 'aria-disabled': true, children: 'Earlier' })
    expect(out).toContain('aria-disabled="true"')
    expect(out).not.toMatch(/\sdisabled=""/)
    // Busy is both; unavailable-but-not-busy is drawn as disabled.
    expect(html(Button, { loading: true, children: 'Saving' })).toMatch(/aria-disabled="true" aria-busy="true"/)
    expect(buttonClassName()).toContain('[&[aria-disabled=true]:not([aria-busy=true])]:opacity-45')
  })

  it('secondaryBrand is the neutral border with brand text the seller tools drew by hand', () => {
    const cls = buttonClassName({ variant: 'secondaryBrand' })
    for (const token of ['border-border-strong', 'text-brand-700', 'bg-transparent', 'hover:bg-brand-100', 'min-h-11']) expect(cls).toContain(token)
  })
})

describe('StatusBadge on seller pages (UI-09)', () => {
  it('draws every lifecycle status from the canonical tone map, including the stored DELETED', () => {
    expect(html(StatusBadge, { status: 'DELETED', role: 'status' })).toMatch(/role="status" class="[^"]*bg-status-neutral-bg text-status-neutral/)
    expect(html(StatusBadge, { status: 'REJECTED' })).toMatch(/bg-status-problem-bg text-status-problem/)
    expect(html(StatusBadge, { status: 'ACTIVE' })).toMatch(/bg-status-live-bg text-status-live/)
  })
})
