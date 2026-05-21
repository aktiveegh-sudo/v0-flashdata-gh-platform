import Link from 'next/link'
import { ArrowRight, BadgeCheck, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StoreNotFoundState } from '@/components/store/store-not-found-state'
import { StoreShell } from '@/components/store/store-shell'
import { fetchStoreBySlug } from '@/lib/store-fetch'

type StorePageProps = {
  params: Promise<{ slug: string }>
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

export default async function StoreBuyDataPage({ params }: StorePageProps) {
  const { slug } = await params
  const store = await fetchStoreBySlug(slug)

  if (!store) {
    return <StoreNotFoundState />
  }

  return (
    <StoreShell store={store} slug={store.slug} activeTab="buy-data">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <p className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-yellow-100">
            <ShoppingCart className="h-3.5 w-3.5" /> Buy Data
          </p>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">Data bundles inside {store.name}</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">
            Pick a bundle, pay quickly, and receive delivery in seconds.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-full bg-yellow-300 px-5 font-semibold text-black hover:bg-yellow-200">
              <Link href={`/${store.slug}/services`}>
                View Services <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-yellow-300/40 bg-transparent px-5 text-zinc-100 hover:bg-yellow-300/10 hover:text-white">
              <Link href={`/${store.slug}`}>Back to Store Home</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-2xl border border-yellow-300/15 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200">
              <BadgeCheck className="h-4 w-4 text-yellow-300" /> Fast checkout flow
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-yellow-300/15 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200">
              <BadgeCheck className="h-4 w-4 text-yellow-300" /> Tenant-specific pricing
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {store.dataPackages.map((item) => (
            <Card key={item.id} className="border-yellow-300/20 bg-zinc-900/80 text-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-400">{item.network}</p>
                  </div>
                  <p className="text-base font-semibold text-yellow-300">{formatGhs(item.price)}</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">
                  Amount: {item.amount} · Validity: {item.validity}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </StoreShell>
  )
}