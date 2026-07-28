import Link from 'next/link'
import { StoreNotFoundState } from '@/components/store/store-not-found-state'
import { StoreThemeProvider } from '@/components/store/store-theme-provider'
import { fetchStoreBySlug } from '@/lib/store-fetch'
import { Button } from '@/components/ui/button'
import { Users, Wallet, Store } from 'lucide-react'

type JoinPageProps = {
  params: Promise<{ slug: string }>
}

export default async function StoreJoinSubAgentPage({ params }: JoinPageProps) {
  const { slug } = await params
  const store = await fetchStoreBySlug(slug)

  if (!store) {
    return (
      <StoreThemeProvider>
        <StoreNotFoundState />
      </StoreThemeProvider>
    )
  }

  const authHref = `/agent/auth?as=subagent&store=${encodeURIComponent(store.slug)}`

  return (
    <StoreThemeProvider>
      <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Become a Sub-Agent</p>
          <h1 className="mt-3 text-3xl font-black leading-tight">Join {store.name}</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
            Create an account or sign in to get your own dashboard, wallet, and storefront under {store.name}. You
            buy at wholesale prices set by this agent and resell to your customers.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Wallet, title: 'Own wallet', text: 'Top up and buy at subagent wholesale rates.' },
              { icon: Store, title: 'Own store', text: 'Set your customer prices and share your link.' },
              { icon: Users, title: 'Supported', text: 'Managed by your parent agent — no recruiting needed.' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <item.icon className="h-5 w-5 text-amber-500" />
                <p className="mt-3 text-sm font-bold">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-amber-400 text-black hover:bg-amber-300">
              <Link href={authHref}>Create account or sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/store/${store.slug}`}>Back to store</Link>
            </Button>
          </div>
        </div>
      </main>
    </StoreThemeProvider>
  )
}
