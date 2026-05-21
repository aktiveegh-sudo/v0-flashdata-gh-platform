export const STORE_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_STORE_DOMAIN || 'https://netbundlegh.store').replace(/\/$/, '')

export const getStorePublicUrl = (slug: string) => {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) {
    return STORE_PUBLIC_BASE_URL
  }

  return `${STORE_PUBLIC_BASE_URL}/${normalizedSlug}`
}
