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
  const isPublic =
    path === '/' ||
    path === '/login' ||
    path === '/signup' ||
    path === '/forgot-password' ||
    path === '/update-password' ||
    path === '/terms' ||
    path === '/privacy' ||
    path.startsWith('/auth/') ||
    path === '/api/stripe/webhook'

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/signup'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}