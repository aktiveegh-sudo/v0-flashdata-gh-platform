import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StoreRecord } from '@/lib/store-tenant'

type StoreShellProps = {
  store: StoreRecord
  slug: string
  activeTab?: 'home' | 'buy-data' | 'services'
  framelessContent?: boolean
  children: React.ReactNode
}

const getAccentStyle = (color: string) => ({
  '--store-accent': color,
} as React.CSSProperties)

const navItemClass =
  'h-9 rounded-full border border-yellow-300/25 bg-transparent px-4 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-100 hover:border-yellow-300/70 hover:bg-yellow-300/10'

const mobileLinkClass =
  'block rounded-xl border border-yellow-300/20 bg-black/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-zinc-100 hover:bg-yellow-300/10'

export function StoreShell({ store, slug, activeTab = 'home', framelessContent = false, children }: StoreShellProps) {
  return (
    <main className="min-h-screen bg-black text-zinc-50" style={getAccentStyle(store.themeColor)}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_85%_12%,color-mix(in_oklab,var(--store-accent)_44%,transparent),transparent_32%),radial-gradient(circle_at_18%_0%,rgba(250,204,21,0.12),transparent_38%),linear-gradient(180deg,#0a0a0a_0%,#070707_55%,#030303_100%)]" />

      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-3xl border border-yellow-300/20 bg-zinc-950/85 p-4 backdrop-blur-md sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-300 text-sm font-black text-black">
                {store.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">{store.name}</h1>
                  <Badge className="border-yellow-300/25 bg-yellow-300/15 text-yellow-200">Active</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-300">{store.description}</p>
              </div>
            </div>

            <nav className="hidden flex-wrap gap-2 md:flex">
              <Button
                asChild
                variant="ghost"
                className={
                  activeTab === 'home'
                    ? 'h-9 rounded-full border border-yellow-300 bg-yellow-300 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-black hover:bg-yellow-300'
                    : navItemClass
                }
              >
                <Link href={`/${slug}`}>Home</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className={
                  activeTab === 'buy-data'
                    ? 'h-9 rounded-full border border-yellow-300 bg-yellow-300 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-black hover:bg-yellow-300'
                    : navItemClass
                }
              >
                <Link href={`/${slug}/buy-data`}>Buy Data</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className={
                  activeTab === 'services'
                    ? 'h-9 rounded-full border border-yellow-300 bg-yellow-300 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-black hover:bg-yellow-300'
                    : navItemClass
                }
              >
                <Link href={`/${slug}/services`}>Services</Link>
              </Button>
            </nav>

            <details className="relative md:hidden">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-yellow-300/30 bg-transparent text-lg text-yellow-300">
                <span aria-hidden>☰</span>
                <span className="sr-only">Open store menu</span>
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-yellow-300/20 bg-black/95 p-2 shadow-xl backdrop-blur-md">
                <Link href={`/${slug}`} className={mobileLinkClass}>Home</Link>
                <Link href={`/${slug}/buy-data`} className={`${mobileLinkClass} mt-2`}>Buy Data</Link>
                <Link href={`/${slug}/services`} className={`${mobileLinkClass} mt-2`}>Services</Link>
              </div>
            </details>
          </div>
        </header>

        <div className={framelessContent ? 'mt-6 flex-1 p-2 sm:p-3 lg:p-4' : 'mt-6 flex-1 rounded-[2rem] border border-yellow-300/15 bg-zinc-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-6 lg:p-8'}>
          {children}
        </div>

        <footer className="mt-6 rounded-3xl border border-yellow-300/20 bg-zinc-950/80 p-5 text-zinc-300">
          <div className="grid gap-3 sm:grid-cols-3">
            <p className="text-sm"><span className="font-black text-yellow-300">{store.name}</span> agent store</p>
            <p className="text-sm">Fast data delivery and service fulfillment.</p>
            <p className="text-sm sm:text-right">Powered by AktiveeData</p>
          </div>
        </footer>
      </section>
    </main>
  )
}