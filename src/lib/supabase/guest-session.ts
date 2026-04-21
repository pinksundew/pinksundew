type GuestSessionUser = {
  id: string
  is_anonymous?: boolean
}

type GuestSession = {
  user: GuestSessionUser | null
} | null

type GuestSessionResult = {
  data: {
    session: GuestSession
  }
  error: Error | null
}

type GuestSignInResult = {
  data: {
    user: GuestSessionUser | null
    session: GuestSession
  }
  error: Error | null
}

export type GuestSessionAuth = {
  getSession: () => Promise<GuestSessionResult>
  signInAnonymously: () => Promise<GuestSignInResult>
}

export async function getCurrentSessionUser(auth: GuestSessionAuth): Promise<GuestSessionUser | null> {
  const {
    data: { session },
    error,
  } = await auth.getSession()

  if (error) {
    throw error
  }

  return session?.user ?? null
}

export async function getOrCreateGuestSessionUser(
  auth: GuestSessionAuth
): Promise<GuestSessionUser> {
  const existingUser = await getCurrentSessionUser(auth)
  if (existingUser) {
    return existingUser
  }

  const { data, error } = await auth.signInAnonymously()
  if (error) {
    throw error
  }

  const createdUser = data.user ?? data.session?.user ?? (await getCurrentSessionUser(auth))
  if (!createdUser) {
    throw new Error('Unable to create a guest session.')
  }

  return createdUser
}
