import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'

const isBucketMissing = (message: string) => {
  const text = message.toLowerCase()
  return text.includes('not found') || text.includes('does not exist') || text.includes('bucket')
}

export async function POST() {
  try {
    const supabaseServer = await createSupabaseServerClient()
    const { data: authData, error: authError } = await supabaseServer.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    const isSuperAdmin =
      profile?.role === 'super_admin' ||
      (authData.user.email || '').toLowerCase() === 'admin@flashdatagh.com'

    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    if (listError) {
      return NextResponse.json({ success: false, error: listError.message }, { status: 500 })
    }

    const exists = (buckets || []).some((bucket) => bucket.name === 'service-images' || bucket.id === 'service-images')

    if (!exists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket('service-images', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      })

      if (createError && !isBucketMissing(createError.message)) {
        return NextResponse.json({ success: false, error: createError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to ensure storage bucket' },
      { status: 500 }
    )
  }
}
