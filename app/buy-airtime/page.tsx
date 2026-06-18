import Link from 'next/link'
import { MainSiteShell } from '@/components/public/main-site-shell'
import { Button } from '@/components/ui/button'

export default function BuyAirtimePublicPage() {
  return (
    <MainSiteShell activeTab="buy-airtime">
      <section className="flex min-h-[60vh] items-center justify-center px-4 py-16 sm:px-6">
        <div className="max-w-lg text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Buy Airtime</p>
          <h1 className="mt-2 text-3xl font-black">Airtime purchase coming soon</h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-white/50">
            Public airtime checkout is coming soon. You can buy data bundles instantly while we finish this feature.
          </p>
          <Link href="/buy-data" className="mt-6 inline-block">
            <Button className="rounded-full bg-amber-400 text-black hover:bg-amber-300">Buy Data Instead</Button>
          </Link>
        </div>
      </section>
    </MainSiteShell>
  )
}
