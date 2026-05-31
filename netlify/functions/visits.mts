import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

// Tracks a simple, persistent website visit counter.
//   POST /api/visits → increment by one and return the new total
//   GET  /api/visits → return the current total (read-only, for the admin)
// The count is stored in Netlify Blobs so it survives deploys and is shared
// across every visitor.
const STORE_NAME = 'site-visits'
const KEY = 'total'

async function readCount(store: ReturnType<typeof getStore>): Promise<number> {
  const raw = (await store.get(KEY, { type: 'text' })) as string | null
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export default async (req: Request, _context: Context) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })

  if (req.method === 'GET') {
    const count = await readCount(store)
    return Response.json({ count }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (req.method === 'POST') {
    // Read-modify-write. For a personal site's traffic the small chance of a
    // racing write losing a single increment is acceptable.
    const count = (await readCount(store)) + 1
    await store.set(KEY, String(count))
    return Response.json({ count }, { headers: { 'Cache-Control': 'no-store' } })
  }

  return new Response('Method Not Allowed', { status: 405 })
}

export const config: Config = {
  path: '/api/visits',
  method: ['GET', 'POST'],
}
