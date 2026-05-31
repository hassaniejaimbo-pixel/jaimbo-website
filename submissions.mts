import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

// Returns stored contact-form submissions for the admin dashboard.
// Reading submissions exposes visitor contact details, so it requires the
// admin passcode (same scheme as the live-video function).
const STORE_NAME = 'site-config'
const KEY = 'submissions'

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const expected = Netlify.env.get('ADMIN_PASSWORD') || 'admin123'
  if ((req.headers.get('x-admin-passcode') || '') !== expected) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const store = getStore({ name: STORE_NAME, consistency: 'strong' })
  const submissions = ((await store.get(KEY, { type: 'json' })) as unknown[] | null) ?? []

  // Newest first for the dashboard.
  submissions.reverse()
  return Response.json({ submissions })
}

export const config: Config = {
  path: '/api/submissions',
  method: ['GET'],
}
