import { getStore } from '@netlify/blobs'

// Server-authoritative admin credentials, shared across every device.
//
// The admin email and password live in a PRIVATE Netlify Blob (never in the
// public /api/content document), so changing the password on one device takes
// effect everywhere — including phones — and the same secret is used both to
// sign in and to authorize writes. This removes the previous split-brain where
// the login password was kept per-device in localStorage while the server only
// ever accepted the ADMIN_PASSWORD fallback, which silently broke saving and
// sign-in the moment the password was changed in the portal.
//
// On first use the store is seeded from the ADMIN_PASSWORD / ADMIN_EMAIL
// environment variables (falling back to the historical defaults), so existing
// sites keep working with no manual setup.
const STORE_NAME = 'site-config'
const CREDS_KEY = 'admin-credentials'

export interface AdminCreds {
  email: string
  passwordHash: string
}

function seedDefaults(): { email: string; password: string } {
  return {
    email: (Netlify.env.get('ADMIN_EMAIL') || 'hassaniejaimbo@gmail.com').toLowerCase(),
    password: Netlify.env.get('ADMIN_PASSWORD') || 'admin123',
  }
}

function credStore() {
  return getStore({ name: STORE_NAME, consistency: 'strong' })
}

// SHA-256 hex digest. Passwords are never stored in plaintext.
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Returns the stored credentials, seeding them from the environment the first
// time (when the blob is still empty).
export async function getCreds(): Promise<AdminCreds> {
  const store = credStore()
  const existing = (await store.get(CREDS_KEY, { type: 'json' })) as AdminCreds | null
  if (existing && existing.email && existing.passwordHash) return existing

  const { email, password } = seedDefaults()
  const seeded: AdminCreds = { email, passwordHash: await sha256(password) }
  await store.setJSON(CREDS_KEY, seeded)
  return seeded
}

// Replace both email and password.
export async function setCreds(email: string, password: string): Promise<AdminCreds> {
  const creds: AdminCreds = { email: email.trim().toLowerCase(), passwordHash: await sha256(password) }
  await credStore().setJSON(CREDS_KEY, creds)
  return creds
}

// Update only the email, preserving the current password.
export async function updateEmail(email: string): Promise<AdminCreds> {
  const current = await getCreds()
  const next: AdminCreds = { email: email.trim().toLowerCase(), passwordHash: current.passwordHash }
  await credStore().setJSON(CREDS_KEY, next)
  return next
}

// True when the supplied passcode matches the stored admin password.
export async function verifyPasscode(passcode: string): Promise<boolean> {
  if (!passcode) return false
  const creds = await getCreds()
  return (await sha256(passcode)) === creds.passwordHash
}
