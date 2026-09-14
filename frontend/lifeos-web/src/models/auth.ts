export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out'; message?: string }
  | { status: 'expired'; message?: string }
  | { status: 'unauthorized'; message?: string }
  | { status: 'unavailable'; message?: string }
  | { status: 'signed-in'; displayName: string }

export type AuthSessionResponse = {
  isAuthenticated: boolean
  displayName?: string | null
  reason?: string | null
}
