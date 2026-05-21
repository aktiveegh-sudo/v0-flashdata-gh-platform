import { NextResponse } from 'next/server'
import { getMockStoreBySlug } from '@/lib/store-tenant'

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const store = getMockStoreBySlug(slug)

  if (!store || !store.active) {
    return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: store })
}