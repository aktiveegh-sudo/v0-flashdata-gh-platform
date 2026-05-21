'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, MessageCircle, Phone, Mail, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
            This store runs as a separate tenant with its own catalog, pricing, and navigation. Buyers stay inside the store experience from start to finish.
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
              Clean mobile-friendly layout
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
                      <p className="text-xs text-slate-400">{item.network} {item.validity}</p>
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
      </div>
        >
          <MessageCircle className="h-4 w-4" />
          Join WhatsApp Group
        </a>
      ) : null}

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="border-yellow-300/20 bg-zinc-950/95 text-white backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {checkoutType === 'service'
                ? 'Complete your service purchase'
                : isAfaRegistration
                  ? 'Complete your AFA registration'
                  : 'Complete your data purchase'}
            </DialogTitle>
            <DialogDescription>
              {checkoutType === 'service'
                ? `${selectedService?.online_services?.name || 'Service'} - ${formatGhs(selectedService?.selling_price || 0)}`
                : `${selectedPackage?.data_packages?.network} ${selectedPackage?.data_packages?.amount} - ${formatGhs(selectedPackage?.selling_price || 0)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {checkoutType === 'data' || checkoutType === 'service' ? (
              <div className="space-y-1.5">
                <Label htmlFor="recipient">{isAfaRegistration ? 'Phone Number' : 'Recipient Number'}</Label>
                <Input
                  id="recipient"
                  placeholder="e.g. 024XXXXXXX"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </div>
            ) : null}

            {isAfaRegistration ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="afa-full-name">Full Name</Label>
                  <Input
                    id="afa-full-name"
                    value={afaFullName}
                    onChange={(e) => setAfaFullName(e.target.value)}
                    placeholder="As it appears on Ghana Card"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="afa-ghana-card">Ghana Card Number</Label>
                  <Input
                    id="afa-ghana-card"
                    value={afaGhanaCardNumber}
                    onChange={(e) => setAfaGhanaCardNumber(e.target.value.toUpperCase())}
                    placeholder="GHA-123456789-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="afa-location">Location</Label>
                  <Input
                    id="afa-location"
                    value={afaLocation}
                    onChange={(e) => setAfaLocation(e.target.value)}
                    placeholder="Town / Area"
                  />
                </div>
              </>
            ) : null}

            <div className="rounded-xl border border-yellow-300/25 bg-yellow-300/10 p-3 text-sm text-yellow-100">
              <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Secure Paystack checkout will open next.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="border-white/20 bg-white/5 text-zinc-100 hover:bg-white/10" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button className="border border-yellow-300 bg-yellow-300 text-black hover:bg-yellow-200" onClick={() => void submitStoreOrder()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay {formatGhs(checkoutType === 'service' ? selectedService?.selling_price || 0 : selectedPackage?.selling_price || 0)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
