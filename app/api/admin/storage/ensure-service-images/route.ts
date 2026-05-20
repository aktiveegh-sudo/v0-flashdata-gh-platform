import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'

const isBucketMissing = (message: string) => {
  const text = message.toLowerCase()
  return text.includes('not found') || text.includes('does not exist') || text.includes('bucket')
}

export async function POST(request: Request) {
  try {
    const supabaseServer = await createSupabaseServerClient()

    const authHeader = request.headers.get('authorization') || ''
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

    let currentUserId = ''
    let currentUserEmail = ''

    if (bearer) {
      const { data: tokenUser, error: tokenError } = await supabaseAdmin.auth.getUser(bearer)
      if (!tokenError && tokenUser.user) {
        currentUserId = tokenUser.user.id
        currentUserEmail = (tokenUser.user.email || '').toLowerCase()
      }
    }

    if (!currentUserId) {
      const { data: authData, error: authError } = await supabaseServer.auth.getUser()
      if (!authError && authData.user) {
        currentUserId = authData.user.id
        currentUserEmail = (authData.user.email || '').toLowerCase()
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .maybeSingle()

    const role = (profile?.role || '').toLowerCase()
    const isAllowedAdmin = role === 'super_admin' || role === 'admin' || currentUserEmail === 'admin@flashdatagh.com'

    if (!isAllowedAdmin) {
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
