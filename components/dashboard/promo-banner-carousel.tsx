'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

type PromoBanner = {
  id: string
  image_url: string
  sort_order: number
}

export function PromoBannerCarousel() {
  const [banners, setBanners] = useState<PromoBanner[]>([])
  const [index, setIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('flashdata-dismiss-promo-banners') === '1') {
      setDismissed(true)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/promo-banners/active')
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        data?: PromoBanner[]
      } | null

      if (response.ok && payload?.success) {
        setBanners(payload.data || [])
      }
    }

    void load()
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % banners.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [banners.length])

  if (dismissed || banners.length === 0) return null

  const current = banners[index]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
      <img src={current.image_url} alt="Promo banner" className="aspect-[21/9] w-full object-cover" />

      {banners.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Next banner"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((banner, dotIndex) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Show banner ${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
                className={`h-2 rounded-full transition ${dotIndex === index ? 'w-6 bg-amber-400' : 'w-2 bg-white/70'}`}
              />
            ))}
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem('flashdata-dismiss-promo-banners', '1')
          setDismissed(true)
        }}
        className="absolute right-3 top-3 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/60"
        aria-label="Dismiss promo banners"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
