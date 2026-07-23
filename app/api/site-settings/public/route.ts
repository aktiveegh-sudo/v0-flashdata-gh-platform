import { NextResponse } from 'next/server'
import { getPublicSiteSettings } from '@/lib/site-settings'

export const revalidate = 60

export async function GET() {
  const settings = await getPublicSiteSettings()

  return NextResponse.json({
    success: true,
    data: {
      whatsappChannelUrl: settings?.whatsapp_channel_url?.trim() || '',
      siteName: settings?.site_name || 'FlashData GH',
    },
  })
}
