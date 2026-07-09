import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|(?:.*/)?(?:opengraph-image|twitter-image|icon|apple-icon)(?:-[0-9a-z]{1,6})?$).*)',
  ],
}