import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api/rest'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('online_services')
      .select('id,name,category,agent_price,public_price,description,image_url')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to fetch services' },
      { status: 500 }
    )
  }
}
