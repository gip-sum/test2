'use client'

import { useFormStatus } from 'react-dom'
import { Button } from './Button'

/**
 * The submit button of a server-action form, busy while the form is pending
 * (UI-09).
 *
 * A server component's form cannot hold state, so the shared Button's
 * `loading` has nothing to read; this client leaf reads the enclosing form's
 * status instead. While pending it refuses a second press without becoming
 * `disabled` (focus stays on it), and it is an ordinary submit button
 * before hydration or without JavaScript, when the browser posts the form.
 */
export function SubmitButton(props: Omit<React.ComponentProps<typeof Button>, 'type' | 'loading'>) {
  const { pending } = useFormStatus()
  return <Button {...props} type="submit" loading={pending} />
}
