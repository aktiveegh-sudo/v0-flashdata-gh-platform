import 'server-only'

import { headers } from 'next/headers'

export const getRequestOrigin = async () => {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || ''
  const protocol = headerStore.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')

  if (host) {
    return `${protocol}://${host}`
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}