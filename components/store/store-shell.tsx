import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StoreRecord } from '@/lib/store-tenant'

type StoreShellProps = {
  store: StoreRecord
  slug: string
  activeTab?: 'home' | 'buy-data' | 'services'
  children: React.ReactNode
}

const getAccentStyle = (color: string) => ({
  '--store-accent': color,
} as React.CSSProperties)

export function StoreShell({ store, slug, activeTab = 'home', children }: StoreShellProps) {
  return (
    <main className="min-h-screen bg-[#07111b] text-slate-50" style={getAccentStyle(store.themeColor)}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_18%,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_82%_12%,color-mix(in_oklab,var(--store-accent)_35%,transparent),transparent_34%),linear-gradient(160deg,#08111a_0%,#091a27_54%,#07111b_100%)]" />

      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-bold text-white">
                {store.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{store.name}</h1>
                  <Badge className="border-emerald-300/25 bg-emerald-300/15 text-emerald-100">Active</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">{store.description}</p>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              <Button asChild variant={activeTab === 'home' ? 'default' : 'outline'} className="rounded-full">
                <Link href={`/${slug}`}>Home</Link>
              </Button>
              <Button asChild variant={activeTab === 'buy-data' ? 'default' : 'outline'} className="rounded-full">
                <Link href={`/${slug}/buy-data`}>Buy Data</Link>
              </Button>
              <Button asChild variant={activeTab === 'services' ? 'default' : 'outline'} className="rounded-full">
                <Link href={`/${slug}/services`}>Services</Link>
              </Button>
            </nav>
          </div>
        </header>

        <div className="mt-6 flex-1 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-6 lg:p-8">
          {children}
        </div>
      </section>
    </main>
  )
}