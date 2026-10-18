'use client'
import { Button } from '@/components/ui/Button'

export function ReloadDraft() { return <Button type="button" variant="text" onClick={() => window.location.reload()} className="text-brand-700">Try again</Button> }
