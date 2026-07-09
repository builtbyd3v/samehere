import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  // Metadata image routes (opengraph-image, twitter-image, icon, apple-icon) must be
  // anon-reachable so link previews render for logged-out crawlers (Twitter/LinkedIn/
  // iMessage/Slack). They only read anon-safe SECURITY DEFINER RPCs, never session data.
  // Next appends a deterministic hash suffix (e.g. `-5zn1l9`) when the file lives inside
  // a route group like `(app)` (see next/dist/lib/metadata/get-metadata-route.js) — that
  // suffixed path is the real URL Next puts in <head>, so match it too.
  const isMetadataImage = /\/(?:opengraph-image|twitter-image|icon|apple-icon)(?:-[0-9a-z]{1,6})?$/.test(path)
  const isPublic =
    path === '/' ||
    path === '/pricing' ||
    path === '/login' ||
    path === '/signup' ||
    path === '/forgot-password' ||
    path === '/update-password' ||
    path === '/terms' ||
    path === '/privacy' ||
    path.startsWith('/auth/') ||
    path === '/api/stripe/webhook' ||
    isMetadataImage

  if (user && (path === '/' || path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/signup'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}