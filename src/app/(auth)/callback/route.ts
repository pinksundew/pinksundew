import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams, origin } = requestUrl
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') ? rawNext : '/'
  const claimMode =
    searchParams.get('claim') === 'email' || searchParams.get('claim') === 'oauth'
      ? searchParams.get('claim')
      : null

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // Ignore if called from Server Component
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalhost = process.env.NODE_ENV === 'development'

      let redirectBase: string
      if (isLocalhost) {
        redirectBase = origin
      } else if (forwardedHost) {
        redirectBase = `https://${forwardedHost}`
      } else {
        redirectBase = origin
      }

      const redirectUrl = new URL(next, redirectBase)
      if (claimMode && !redirectUrl.searchParams.has('claim')) {
        redirectUrl.searchParams.set('claim', claimMode)
      }

      return NextResponse.redirect(redirectUrl.toString())
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
