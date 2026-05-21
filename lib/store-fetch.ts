import 'server-only'

import { getRequestOrigin } from '@/lib/request-origin'
import type { StoreRecord } from '@/lib/store-tenant'

type StoreApiResponse =
  | { success: true; data: StoreRecord }
  | { success: false; error?: string }

export const fetchStoreBySlug = async (slug: string): Promise<StoreRecord | null> => {
  const normalizedSlug = slug.trim()
  if (!normalizedSlug) {
    return null
  }

  const origin = await getRequestOrigin()
  const response = await fetch(`${origin}/api/stores/${encodeURIComponent(normalizedSlug)}`, {
    method: 'GET',
    cache: 'no-store',
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Unable to load store: ${response.status}`)
  }

  const payload = (await response.json().catch(() => null)) as StoreApiResponse | null
  if (!payload || !payload.success) {
    return null
  }

  return payload.data
}