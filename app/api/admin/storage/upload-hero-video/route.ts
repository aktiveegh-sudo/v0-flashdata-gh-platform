import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'

const allowedMimeTypes = ['video/mp4']
const maxFileSizeBytes = 50 * 1024 * 1024
const bucketName = 'hero-videos'

const isBucketMissing = (message: string) => {
  const text = message.toLowerCase()
  return text.includes('not found') || text.includes('does not exist') || text.includes('bucket')
}

const getRequestUser = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

  if (bearer) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearer)
    if (!error && data.user) {
      return data.user
    }
  }

  const supabaseServer = await createSupabaseServerClient()
  const { data, error } = await supabaseServer.auth.getUser()

  if (error || !data.user) {
    return null
  }

  return data.user
}

const assertAdmin = async (request: Request) => {
  const user = await getRequestUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role,status')
    .eq('id', user.id)
    .maybeSingle()

  const role = String(profile?.role || '').toLowerCase()
  const isSuperAdmin = role === 'super_admin' || (user.email || '').toLowerCase() === 'admin@flashdatagh.com'

  if (!isSuperAdmin || profile?.status === 'suspended') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  return null
}

const ensureBucket = async () => {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
  if (listError) {
    return listError.message
  }

  const exists = (buckets || []).some((bucket) => bucket.name === bucketName || bucket.id === bucketName)
  if (exists) {
    return null
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: maxFileSizeBytes,
    allowedMimeTypes,
  })

  if (createError && !isBucketMissing(createError.message)) {
    return createError.message
  }

  return null
}

export async function POST(request: Request) {
  try {
    const forbidden = await assertAdmin(request)
    if (forbidden) {
      return forbidden
    }

    const bucketError = await ensureBucket()
    if (bucketError) {
      return NextResponse.json({ success: false, error: bucketError }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Video file is required' }, { status: 400 })
    }

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Only MP4 video files are allowed' }, { status: 400 })
    }

    if (file.size > maxFileSizeBytes) {
      return NextResponse.json({ success: false, error: 'Video size must be 50MB or less' }, { status: 400 })
    }

    const filePath = `home-hero/${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`

    const { error: uploadError } = await supabaseAdmin.storage.from(bucketName).upload(filePath, file, {
      upsert: true,
      contentType: 'video/mp4',
    })

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      data: {
        filePath,
        publicUrl: publicUrlData.publicUrl,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to upload video' },
      { status: 500 }
    )
  }
}
