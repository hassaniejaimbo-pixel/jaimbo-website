import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

// Stores the single "current live video" link for the whole site.
// Read is public (viewers); writes require the admin passcode.
const STORE_NAME = 'site-config'
const KEY = 'live-video'

interface LiveVideo {
  url: string | null
  title: string
  updatedAt: string | null
}

const EMPTY: LiveVideo = { url: null, title: '', updatedAt: null }

export default async (req: Request, context: Context) => {
  // Strong consistency so an admin update is visible to viewers immediately.
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })

  if (req.method === 'GET') {
    const data = (await store.get(KEY, { type: 'json' })) as LiveVideo | null
    return Response.json(data ?? EMPTY)
  }

  // Everything below mutates state and requires the admin passcode.
  const expected = Netlify.env.get('ADMIN_PASSWORD') || 'admin123'

  if (req.method === 'DELETE') {
    if ((req.headers.get('x-admin-passcode') || '') !== expected) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    await store.delete(KEY)
    return Response.json(EMPTY)
  }

  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    if ((String(body.passcode ?? '')) !== expected) {
      return Response.json({ error: 'Invalid admin passcode.' }, { status: 401 })
    }

    const rawUrl = String(body.url ?? '').trim()

    // An empty URL clears the live video (admin is going offline).
    if (!rawUrl) {
      await store.delete(KEY)
      return Response.json(EMPTY)
    }

    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      return Response.json({ error: 'Please enter a valid URL.' }, { status: 400 })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return Response.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
    }

    const record: LiveVideo = {
      url: parsed.toString(),
      title: String(body.title ?? '').trim().slice(0, 200),
      updatedAt: new Date().toISOString(),
    }
    await store.setJSON(KEY, record)
    return Response.json(record)
  }

  return new Response('Method Not Allowed', { status: 405 })
}

export const config: Config = {
  path: '/api/live-video',
  method: ['GET', 'POST', 'DELETE'],
}
