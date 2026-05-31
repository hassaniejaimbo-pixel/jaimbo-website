import type { Config, Context } from '@netlify/functions'
import { getCreds, setCreds, updateEmail, verifyPasscode, sha256 } from '../shared/admin-auth.mts'

// Server-side admin authentication, shared across every device.
//
//   POST /api/auth/login   { email, password }                       → 200 / 401
//   POST /api/auth/change  { email, currentPassword?, newPassword? } → 200 / 401
//
// Credentials are stored (hashed) in a private Netlify Blob, so a password set
// on one device works on all of them — and the same secret authorizes writes
// to /api/content and /api/media.
export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const url = new URL(req.url)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  // ── Sign in ──
  if (/\/login\/?$/.test(url.pathname)) {
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const creds = await getCreds()
    const ok = email === creds.email && (await sha256(password)) === creds.passwordHash
    if (!ok) {
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 })
    }
    return Response.json({ ok: true, email: creds.email })
  }

  // ── Change email and/or password ──
  if (/\/change\/?$/.test(url.pathname)) {
    // The current password authorizes the change. Accept it from the header
    // (the passcode the admin is already signed in with) or the request body.
    const provided = req.headers.get('x-admin-passcode') || String(body.currentPassword ?? '')
    if (!(await verifyPasscode(provided))) {
      return Response.json({ error: 'Current password is incorrect.' }, { status: 401 })
    }

    const current = await getCreds()
    const email = String(body.email ?? '').trim().toLowerCase() || current.email
    const newPassword = String(body.newPassword ?? '')

    if (newPassword) {
      if (newPassword.length < 6) {
        return Response.json({ error: 'New password must be at least 6 characters.' }, { status: 400 })
      }
      const creds = await setCreds(email, newPassword)
      return Response.json({ ok: true, email: creds.email })
    }

    const creds = await updateEmail(email)
    return Response.json({ ok: true, email: creds.email })
  }

  return Response.json({ error: 'Not found.' }, { status: 404 })
}

export const config: Config = {
  path: ['/api/auth/login', '/api/auth/change'],
  method: ['POST'],
}
