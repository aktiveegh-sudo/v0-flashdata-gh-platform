'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Compass, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  dashboardMainNavItems,
  dashboardMoreNavItems,
  type DashboardNavItem,
} from '@/lib/dashboard/nav'

const STORAGE_KEY = 'flashdata-nav-tour-dismissed'

type TourItem = DashboardNavItem & {
  section: 'Main' | 'More Options'
  keywords: string
}

function buildTourItems(): TourItem[] {
  const main = dashboardMainNavItems.map((item) => ({
    ...item,
    section: 'Main' as const,
    keywords: `${item.label} ${item.href}`.toLowerCase(),
  }))

  const more = dashboardMoreNavItems.map((item) => ({
    ...item,
    section: 'More Options' as const,
    keywords: `${item.label} ${item.href}`.toLowerCase(),
  }))

  return [...main, ...more]
}

export function DashboardNavTour() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const items = useMemo(() => buildTourItems(), [])

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return
    const timer = window.setTimeout(() => setOpen(true), 900)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.keywords.includes(q))
  }, [items, query])

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  const goTo = (href: string) => {
    dismiss()
    router.push(href)
  }

  const grouped = {
    Main: filtered.filter((item) => item.section === 'Main'),
    'More Options': filtered.filter((item) => item.section === 'More Options'),
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="fixed bottom-24 right-5 z-40 hidden gap-2 rounded-full border-amber-400/40 bg-white shadow-lg dark:bg-[#0d140d] lg:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Compass className="h-4 w-4 text-amber-500" />
        Find a page
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-100 px-6 py-5 dark:border-white/10">
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <Compass className="h-5 w-5 text-amber-500" />
              Dashboard Navigator
            </DialogTitle>
            <DialogDescription>
              Search or browse every page on your FlashData agent dashboard.
            </DialogDescription>
            <div className="relative pt-2">
              <Search className="absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages... e.g. wallet, store, data"
                className="pl-10"
              />
            </div>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto px-3 py-3">
            {(['Main', 'More Options'] as const).map((section) =>
              grouped[section].length ? (
                <div key={section} className="mb-4">
                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{section}</p>
                  <div className="space-y-1">
                    {grouped[section].map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => goTo(item.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-amber-400/10"
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-amber-500" />
                        <span className="flex-1">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            )}

            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">No pages match your search.</p>
            ) : null}
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-between dark:border-white/10">
            <Button variant="ghost" onClick={dismiss} className="gap-2">
              <X className="h-4 w-4" />
              Skip for now
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/utilities" onClick={dismiss}>
                Other Services hub
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
