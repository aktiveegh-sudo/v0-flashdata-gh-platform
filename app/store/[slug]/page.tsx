import Link from 'next/link'
import { ArrowRight, BadgeCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StoreNotFoundState } from '@/components/store/store-not-found-state'
import { StoreShell } from '@/components/store/store-shell'
import { fetchStoreBySlug } from '@/lib/store-fetch'

type StorePageProps = {
  params: Promise<{ slug: string }>
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

export default async function PublicAgentStorePage({ params }: StorePageProps) {
  const { slug } = await params
  const store = await fetchStoreBySlug(slug)

  if (!store) {
    return <StoreNotFoundState />
  }

  return (
    <StoreShell store={store} slug={store.slug} activeTab="home">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
            <Sparkles className="h-3.5 w-3.5" />
            Independent store
          </div>

          <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {store.heroText}
          </h2>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            This tenant storefront is isolated from the main website and keeps all navigation, catalog, and checkout inside the store domain.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-full px-5">
              <Link href={`/${store.slug}/buy-data`}>
                Buy Data <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full px-5 text-white">
              <Link href={`/${store.slug}/services`}>View Services</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              Fast data fulfillment
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              Mobile-friendly tenant layout
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="border-white/10 bg-white/5 text-white">
            <CardContent className="p-5">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Catalog summary</p>
              <div className="mt-4 space-y-3">
                {store.dataPackages.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {item.network} {item.validity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-200">{formatGhs(item.price)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardContent className="p-5">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Live services</p>
              <div className="mt-4 space-y-3">
                {store.services.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.category}</p>
                      </div>
                      <p className="text-sm font-semibold text-emerald-200">{formatGhs(item.price)}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </StoreShell>
  )
}
