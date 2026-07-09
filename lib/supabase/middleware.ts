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
    path === '/suspended' ||
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

  // Suspension gate. `/suspended` is fully public (see isPublic above) so it
  // never recurses here, and its own log-out form posts back to `/suspended`
  // itself — also public — so signing out can never get caught by this check.
  //
  // Cost: getUser() already does one network round trip to validate the
  // session; this adds a second, targeted round trip (one column, one row)
  // ONLY for authenticated requests to non-public routes — logged-out
  // traffic and static/public pages never pay it.
  // ponytail: real per-request DB call, not free. Ceiling is one extra
  // `profiles` read per authenticated navigation. Upgrade path if this ever
  // shows up in cost/latency: sync is_suspended into a custom JWT claim via
  // a Supabase Auth Hook so this becomes a free read off `user.app_metadata`
  // — no such hook exists yet, out of scope here.
  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.is_suspended) {
      const url = request.nextUrl.clone()
      url.pathname = '/suspended'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}