import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api/rest'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('promo_banners')
    .select('id,image_url,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data || [] })
}
