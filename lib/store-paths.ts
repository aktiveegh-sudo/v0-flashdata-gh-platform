const MAIN_APP_HOST_MARKERS = ['flashdatagh.shop', 'localhost', '127.0.0.1']

export const getStoreDomainHost = () => {
  const configured = (process.env.NEXT_PUBLIC_STORE_DOMAIN || 'https://netbundlegh.store')
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .toLowerCase()

  return configured || 'netbundlegh.store'
}

export const isStorePublicHost = (hostOrOrigin: string) => {
  const host = hostOrOrigin.includes('://')
    ? (() => {
        try {
          return new URL(hostOrOrigin).host.toLowerCase()
        } catch {
          return hostOrOrigin.toLowerCase()
        }
      })()
    : hostOrOrigin.toLowerCase()

  if (!host) {
    return false
  }

  if (MAIN_APP_HOST_MARKERS.some((marker) => host.includes(marker))) {
    return false
  }

  return host.includes(getStoreDomainHost())
}

export const getStoreHomePath = (slug: string, hostOrOrigin?: string) => {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) {
    return '/'
  }

  if (hostOrOrigin && isStorePublicHost(hostOrOrigin)) {
    return `/${normalizedSlug}`
  }

  return `/store/${normalizedSlug}`
}

export const getStorePaymentCompletePath = (slug: string, hostOrOrigin?: string) => {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) {
    return '/payments/success'
  }

  if (hostOrOrigin && isStorePublicHost(hostOrOrigin)) {
    return `/${normalizedSlug}/payment-complete`
  }

  return `/store/${normalizedSlug}/payment-complete`
}

export const normalizeStorePaymentRedirectPath = (path: string, hostOrOrigin?: string) => {
  const match = path.match(/^\/(?:store\/)?([^/]+)\/payment-complete\/?$/)
  if (!match?.[1]) {
    return path
  }

  return getStorePaymentCompletePath(match[1], hostOrOrigin)
}

export const isStorePaymentCompletePath = (path: string) =>
  /^\/(?:store\/[^/]+|[^/]+)\/payment-complete\/?$/.test(path)
