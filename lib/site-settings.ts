import 'server-only'

import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

type PublicSiteSettings = {
  site_name: string | null
  hero_text: string | null
  hero_video_url: string | null
  whatsapp_channel_url: string | null
}

let cachedClient: ReturnType<typeof createClient> | null = null

const getAdminClient = () => {
  if (cachedClient) {
    return cachedClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  return cachedClient
}

const fetchPublicSiteSettings = async (): Promise<PublicSiteSettings | null> => {
  const adminClient = getAdminClient()
  if (!adminClient) {
    return null
  }

  const { data, error } = await adminClient
    .from('site_settings')
    .select('site_name,hero_text,hero_video_url,whatsapp_channel_url')
    .limit(1)
    .maybeSingle()

  if (error) {
    return null
  }

  return (data as PublicSiteSettings | null) || null
}

export const getPublicSiteSettings = unstable_cache(fetchPublicSiteSettings, ['public-site-settings'], {
  revalidate: 60,
})
