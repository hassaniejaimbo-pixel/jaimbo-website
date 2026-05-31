import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

// Central cloud-sync store for the whole site.
//
// This replaces the previous third-party jsonblob.com endpoint, which expired
// (jsonblob deletes blobs that go untouched for ~30 days) and silently broke
// every sync between the public website and the admin portal. The full site
// state — live stream, articles, posts, gallery, music, visitor messages and
// all content/appearance settings — is stored as a single JSON document in
// Netlify Blobs, which persists permanently across deploys.
//
// GET  /api/sync  → returns the stored state object (or {} when nothing saved)
// PUT  /api/sync  → overwrites the stored state with the request body
//
// The shape is intentionally identical to the old jsonblob contract: a GET
// returns the state object directly, and a PUT accepts the whole state as the
// body. This keeps the existing front-end code working unchanged apart from
// the endpoint URL.
const STORE_NAME = 'site-config'
const KEY = 'site-state'

export default async (req: Request, _context: Context) => {
  // Strong consistency so an admin save is immediately visible to visitors
  // (and so a visitor's new message is immediately visible to the admin).
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })

  if (req.method === 'GET') {
    const data = (await store.get(KEY, { type: 'json' })) as Record<string, unknown> | null
    return Response.json(data ?? {}, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  if (req.method === 'PUT') {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ error: 'Body must be a JSON object.' }, { status: 400 })
    }
    await store.setJSON(KEY, body)
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } })
  }

  return new Response('Method Not Allowed', { status: 405 })
}

export const config: Config = {
  path: '/api/sync',
  method: ['GET', 'PUT'],
}
