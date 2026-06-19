'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, Printer, Store } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DashboardPageShell,
  DashboardPanel,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { fetchAgentStore } from '@/lib/dashboard/agent-pages-data'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type AgentStore = {
  id: string
  slug: string
  brand_name: string
  tagline: string | null
  is_active: boolean
}

export default function FlyerPage() {
  const [store, setStore] = useState<AgentStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) {
        setError('Please login again')
        setLoading(false)
        return
      }

      try {
        const data = await fetchAgentStore(userId)
        setStore(data as AgentStore | null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load store')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const storeUrl = useMemo(() => {
    if (!store?.slug || typeof window === 'undefined') return ''
    return `${window.location.origin}/store/${store.slug}`
  }, [store?.slug])

  const copyLink = async () => {
    if (!storeUrl) {
      toast.error('Set up your store slug first')
      return
    }
    await navigator.clipboard.writeText(storeUrl)
    toast.success('Store link copied')
  }

  const printFlyer = () => {
    window.print()
  }

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Store Flyer" description="Printable flyer for your agent store.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Store Flyer"
      description="Share or print a branded flyer with your store link."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void copyLink()} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
          <Button size="sm" onClick={printFlyer} className="gap-2 bg-amber-400 text-black hover:bg-amber-300">
            <Printer className="h-4 w-4" />
            Print Flyer
          </Button>
        </div>
      }
    >
      {!store ? (
        <DashboardPanel>
          <p className="text-sm text-gray-500 dark:text-white/50">
            You have not set up a store yet. Go to Store Settings to create your slug and branding.
          </p>
          <Link href="/dashboard/store-settings" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Store Settings
            </Button>
          </Link>
        </DashboardPanel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardPanel title="Store Link">
            <div className="space-y-3">
              <p className="break-all rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-mono text-sm text-amber-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-amber-400">
                {storeUrl || `/store/${store.slug}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => void copyLink()} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                {storeUrl ? (
                  <a href={storeUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Open Store
                    </Button>
                  </a>
                ) : null}
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Flyer Preview" description="Print-ready card — use Print Flyer above.">
            <div
              id="flyer-preview"
              className="mx-auto max-w-sm rounded-2xl border-2 border-amber-400/30 bg-gradient-to-br from-amber-50 to-white p-8 text-center shadow-lg dark:from-[#0a0a0f] dark:to-[#111118]"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-lg font-black text-black">
                <Store className="h-7 w-7" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                FlashData GH
              </p>
              <h2 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{store.brand_name}</h2>
              {store.tagline ? (
                <p className="mt-2 text-sm text-gray-600 dark:text-white/60">{store.tagline}</p>
              ) : null}
              <div className="mt-6 rounded-xl bg-amber-400/15 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Shop Now
                </p>
                <p className="mt-1 break-all font-mono text-sm font-bold text-gray-900 dark:text-white">
                  /store/{store.slug}
                </p>
              </div>
              <p className="mt-6 text-xs text-gray-500 dark:text-white/40">
                Instant data bundles · MTN · Airtel-Tigo · Telecel
              </p>
            </div>
          </DashboardPanel>
        </div>
      )}
    </DashboardPageShell>
  )
}
