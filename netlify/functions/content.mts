import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { verifyPasscode } from '../shared/admin-auth.mts'

// Single source of truth for all editable site content: articles, posts,
// gallery, music, live-stream config, site identity, brand, social links and
// the visitor messages collected by the contact form. The admin portal reads
// and writes this document; the public website reads it to render the page.
//
//   GET  /api/content          → return the full content document (public)
//   PUT  /api/content          → replace the whole document (admin passcode)
//   POST /api/content/message  → append one visitor message (public)
//
// Persistence is Netlify Blobs so the data survives deploys and is shared
// across every visitor and admin device. It replaces the previous third-party
// jsonblob store, where every visitor's contact-form submission rewrote the
// entire document — a full-state overwrite that could silently clobber
// articles and other content added from another session.
const STORE_NAME = 'site-content'
const KEY = 'state'

// One-time migration source: the legacy third-party blob that previously held
// the live content. The first read seeds Netlify Blobs from it so the cutover
// loses nothing. After the seed, this is never read again.
const LEGACY_URL = 'https://api.jsonblob.com/019e7981-efa3-7fa6-a5b8-4ae7ab4bf7b0'

type ContentDoc = Record<string, unknown> & { messages?: unknown[] }

async function readDoc(store: ReturnType<typeof getStore>): Promise<ContentDoc | null> {
  const raw = (await store.get(KEY, { type: 'json' })) as ContentDoc | null
  return raw && typeof raw === 'object' ? raw : null
}

// Returns the current document, seeding from the legacy store the first time
// (when Netlify Blobs is still empty). Seeding failures are non-fatal — an
// empty document is returned and the admin can repopulate it.
async function readOrSeed(store: ReturnType<typeof getStore>): Promise<ContentDoc> {
  const existing = await readDoc(store)
  if (existing) return existing

  try {
    const res = await fetch(LEGACY_URL + '?_=' + Date.now(), {
      headers: { 'Cache-Control': 'no-store' },
    })
    if (res.ok) {
      const seeded = (await res.json()) as ContentDoc
      if (seeded && typeof seeded === 'object') {
        await store.setJSON(KEY, seeded)
        return seeded
      }
    }
  } catch {
    // ignore — fall through to an empty document
  }
  return {}
}

export default async (req: Request, _context: Context) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })
  const url = new URL(req.url)

  // ── Read the full content document ──
  if (req.method === 'GET') {
    const doc = await readOrSeed(store)
    return Response.json(doc, { headers: { 'Cache-Control': 'no-store' } })
  }

  // ── Append a single visitor message (public) ──
  // Visitors only ever add to the messages list; they never rewrite the rest
  // of the document. The append is done server-side under strong consistency
  // so concurrent admin edits to articles/posts/etc. are never lost.
  if (req.method === 'POST' && /\/message\/?$/.test(url.pathname)) {
    let msg: Record<string, unknown>
    try {
      msg = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON.' }, { status: 400 })
    }
    if (!msg || typeof msg !== 'object' || !msg.message) {
      return Response.json({ error: 'Missing message.' }, { status: 400 })
    }

    const doc = await readOrSeed(store)
    const messages = Array.isArray(doc.messages) ? doc.messages : []
    messages.push(msg)
    doc.messages = messages
    doc.lastUpdated = new Date().toISOString()
    await store.setJSON(KEY, doc)
    return Response.json({ ok: true })
  }

  // ── Replace the whole document (admin only) ──
  if (req.method === 'PUT') {
    if (!(await verifyPasscode(req.headers.get('x-admin-passcode') || ''))) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    let doc: ContentDoc
    try {
      doc = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON.' }, { status: 400 })
    }
    if (!doc || typeof doc !== 'object') {
      return Response.json({ error: 'Invalid document.' }, { status: 400 })
    }
    await store.setJSON(KEY, doc)
    return Response.json({ ok: true })
  }

  return new Response('Method Not Allowed', { status: 405 })
}

export const config: Config = {
  path: ['/api/content', '/api/content/*'],
  method: ['GET', 'POST', 'PUT'],
}
