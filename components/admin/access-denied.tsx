'use client'

import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function AccessDenied() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4 text-destructive">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This section is restricted to FlashData GH super administrators only.
      </p>
      <Link href="/dashboard/overview">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  )
}
