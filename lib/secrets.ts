import 'server-only'

import { supabaseAdmin } from '@/lib/api/rest'

type SecretCacheEntry = {
  value: string | null
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
const secretCache = new Map<string, SecretCacheEntry>()

const readFromCache = (key: string) => {
  const cached = secretCache.get(key)
  if (!cached) {
    return null
  }

  if (cached.expiresAt < Date.now()) {
    secretCache.delete(key)
    return null
  }

  return cached.value
}

const writeToCache = (key: string, value: string | null) => {
  secretCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

const readSecretValue = async (key: string) => {
  const cached = readFromCache(key)
  if (cached !== null) {
    return cached
  }

  const { data, error } = await supabaseAdmin
    .from('app_secrets')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const value = (data?.value || '').trim() || null
  writeToCache(key, value)
  return value
}

export const clearSecretsCache = (keys?: string[]) => {
  if (!keys || keys.length === 0) {
    secretCache.clear()
    return
  }

  for (const key of keys) {
    secretCache.delete(key)
  }
}

export const getOptionalSecret = async (keys: string[]) => {
  for (const key of keys) {
    const dbValue = await readSecretValue(key)
    if (dbValue) {
      return dbValue
    }

    const envValue = (process.env[key] || '').trim()
    if (envValue) {
      return envValue
    }
  }

  return null
}

export const getRequiredSecret = async (keys: string[], errorMessage: string) => {
  const value = await getOptionalSecret(keys)
  if (!value) {
    throw new Error(errorMessage)
  }

  return value
}

export const listAdminSecrets = async (keys: string[]) => {
  const { data, error } = await supabaseAdmin
    .from('app_secrets')
    .select('key,value,description,is_secret,updated_at')
    .in('key', keys)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data || []) as Array<{
    key: string
    value: string
    description: string | null
    is_secret: boolean | null
    updated_at: string | null
  }>

  return rows
}

export const upsertAdminSecrets = async (input: Array<{ key: string; value: string; description?: string; isSecret?: boolean; updatedBy?: string | null }>) => {
  if (input.length === 0) {
    return
  }

  const payload = input.map((item) => ({
    key: item.key,
    value: item.value,
    description: item.description || null,
    is_secret: item.isSecret ?? true,
    updated_by: item.updatedBy || null,
  }))

  const { error } = await supabaseAdmin.from('app_secrets').upsert(payload, { onConflict: 'key' })
  if (error) {
    throw new Error(error.message)
  }

  clearSecretsCache(input.map((item) => item.key))
}
