'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type AdminComingSoonProps = {
  title: string
  description?: string
}

export function AdminComingSoon({
  title,
  description = 'This FlashData admin module is coming soon. The navigation matches SwiftData GH for parity while we finish the backend.',
}: AdminComingSoonProps) {
  return (
    <Card className="overflow-hidden border-amber-400/20 bg-white shadow-sm dark:border-white/8 dark:bg-[#0a110d]">
      <CardContent className="relative p-8 text-center sm:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="relative mt-5 text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">{title}</h1>
        <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-500 dark:text-white/60">
          {description}
        </p>
        <div className="relative mt-6">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/admin/overview">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Overview
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
