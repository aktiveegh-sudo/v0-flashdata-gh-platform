import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

const GH_PHONE_REGEX = /^\+233[0-9]{9}$/

const safePhone = (value: string | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  return GH_PHONE_REGEX.test(trimmed) ? trimmed : null
}

export async function ensureProfileAndWalletForUser(user: User) {
  const metadata = user.user_metadata as { full_name?: string; phone?: string } | null
  const appMetadata = user.app_metadata as { role?: string } | null

  const { data: existingProfile } = await supabase.client
    .from('profiles')
    .select('role,status')
    .eq('id', user.id)
    .maybeSingle()

  const shouldBeAdmin =
    existingProfile?.role === 'super_admin' ||
    appMetadata?.role === 'super_admin' ||
    (user.email || '').toLowerCase() === 'admin@flashdatagh.com'

  const payload = {
    id: user.id,
    full_name: metadata?.full_name?.trim() || null,
    phone: safePhone(metadata?.phone),
    email: user.email || null,
    role: shouldBeAdmin ? 'super_admin' : existingProfile?.role || 'user',
    status: existingProfile?.status || 'active',
  }

  const { error: profileError } = await supabase.client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })

  if (profileError) {
    return profileError
  }

  const { error: walletError } = await supabase.client
    .from('wallets')
    .upsert({ user_id: user.id }, { onConflict: 'user_id' })

  if (walletError) {
    return walletError
  }

  return null
}
