import 'server-only'

import { supabaseAdmin } from '@/lib/api/rest'

type CacheEntry = {
  value: string
  expiresAt: number
}

const cacheTtlMs = 60 * 1000
const secretCache = new Map<string, CacheEntry>()

const getCachedSecret = (key: string) => {
  const entry = secretCache.get(key)
  if (!entry) {
    return ''
  }

  if (Date.now() > entry.expiresAt) {
    secretCache.delete(key)
    return ''
  }

  return entry.value
}

const setCachedSecret = (key: string, value: string) => {
  secretCache.set(key, {
    value,
    expiresAt: Date.now() + cacheTtlMs,
  })
}

const readSecretFromDb = async (key: string) => {
  const { data, error } = await supabaseAdmin
    .from('app_secrets')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    return ''
  }

  return String((data as { value?: string } | null)?.value || '')
}

export const getOptionalSecret = async (keys: string[], fallback = '') => {
  for (const key of keys) {
    const cached = getCachedSecret(key)
    if (cached) {
      return cached
    }

    const fromDb = await readSecretFromDb(key)
    if (fromDb) {
      setCachedSecret(key, fromDb)
      return fromDb
    }

    const fromEnv = process.env[key] || ''
    if (fromEnv) {
      return fromEnv
    }
  }

  return fallback
}

export const getRequiredSecret = async (keys: string[], errorMessage: string) => {
  const value = await getOptionalSecret(keys)
  if (!value) {
    throw new Error(errorMessage)
  }

  return value
}
