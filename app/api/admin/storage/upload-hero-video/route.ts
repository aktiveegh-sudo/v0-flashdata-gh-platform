import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'

const allowedMimeTypes = ['video/mp4']
const bucketFileSizeLimitBytes = 2 * 1024 * 1024 * 1024
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

  const existingBucket = (buckets || []).find((bucket) => bucket.name === bucketName || bucket.id === bucketName)
  if (existingBucket) {
    const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucketName, {
      public: true,
      fileSizeLimit: bucketFileSizeLimitBytes,
      allowedMimeTypes,
    })

    if (updateError) {
      return updateError.message
    }

    return null
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: bucketFileSizeLimitBytes,
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

    const body = (await request.json().catch(() => null)) as {
      fileName?: string
      fileType?: string
      fileSize?: number
    } | null

    const fileName = (body?.fileName || '').trim()
    const fileType = (body?.fileType || '').trim().toLowerCase()
    const fileSize = Number(body?.fileSize || 0)

    if (!fileName || !fileType || !Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid upload request payload' }, { status: 400 })
    }

    if (!allowedMimeTypes.includes(fileType)) {
      return NextResponse.json({ success: false, error: 'Only MP4 video files are allowed' }, { status: 400 })
    }

    const filePath = `home-hero/${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`

    const { data: signedUploadData, error: signedUploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath)

    if (signedUploadError || !signedUploadData?.token) {
      return NextResponse.json({ success: false, error: signedUploadError?.message || 'Unable to initialize upload' }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      data: {
        filePath,
        path: signedUploadData.path,
        token: signedUploadData.token,
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
