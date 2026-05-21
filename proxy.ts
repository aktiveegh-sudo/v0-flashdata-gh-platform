import { NextRequest, NextResponse } from 'next/server'

const STATIC_ASSET_PATTERN = /\.(?:css|js|mjs|map|png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json)$/i

export function proxy(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.hostname).toLowerCase()
  const { pathname, search } = request.nextUrl

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || STATIC_ASSET_PATTERN.test(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/store/') || pathname === '/store' || pathname.startsWith('/store-not-found')) {
    return NextResponse.next()
  }

  if (host.includes('flashdatagh.shop')) {
    return NextResponse.next()
  }

  if (host.includes('netbundlegh.store')) {
    const segments = pathname.split('/').filter(Boolean)
    const slug = segments[0]

    if (!slug) {
      const targetUrl = request.nextUrl.clone()
      targetUrl.pathname = '/store-not-found'
      targetUrl.search = search
      return NextResponse.rewrite(targetUrl)
    }

    const remainder = segments.slice(1).join('/')
    const targetUrl = request.nextUrl.clone()
    targetUrl.pathname = remainder ? `/store/${slug}/${remainder}` : `/store/${slug}`
    targetUrl.search = search

    return NextResponse.rewrite(targetUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
