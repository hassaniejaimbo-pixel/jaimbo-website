import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

// Stores admin-uploaded files (photos and attachments) for articles, posts and
// the gallery. Uploads (POST) require the admin passcode; serving (GET) is
// public so the files can be shown on the website.
const STORE_NAME = 'media-uploads'

// Extension → MIME map used to serve uploads back with the right content type.
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
}

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB per upload

function extFor(name: string, contentType: string): string {
  const fromName = (name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (fromName && MIME_BY_EXT[fromName]) return fromName
  // Fall back to deriving the extension from the content type.
  const match = Object.entries(MIME_BY_EXT).find(([, mime]) => mime === contentType)
  return match ? match[0] : 'bin'
}

export default async (req: Request, _context: Context) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })
  const url = new URL(req.url)

  // ── Serve an uploaded file: GET /api/media/<key> ──
  if (req.method === 'GET') {
    const key = decodeURIComponent(url.pathname.replace(/^\/api\/media\/?/, ''))
    if (!key) return new Response('Not found', { status: 404 })

    const data = (await store.get(key, { type: 'arrayBuffer' })) as ArrayBuffer | null
    if (!data) return new Response('Not found', { status: 404 })

    const ext = (key.split('.').pop() || '').toLowerCase()
    const contentType = MIME_BY_EXT[ext] || 'application/octet-stream'
    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        // Uploads are immutable (unique keys), so they can be cached hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  // ── Upload a file: POST /api/media (admin only) ──
  if (req.method === 'POST') {
    const expected = Netlify.env.get('ADMIN_PASSWORD') || 'admin123'
    if ((req.headers.get('x-admin-passcode') || '') !== expected) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.arrayBuffer()
    if (body.byteLength === 0) {
      return Response.json({ error: 'No file received.' }, { status: 400 })
    }
    if (body.byteLength > MAX_BYTES) {
      return Response.json({ error: 'File is too large (max 25 MB).' }, { status: 413 })
    }

    const contentType = req.headers.get('content-type') || 'application/octet-stream'
    let fileName = 'upload'
    try {
      fileName = decodeURIComponent(req.headers.get('x-file-name') || 'upload').slice(0, 200)
    } catch {
      fileName = (req.headers.get('x-file-name') || 'upload').slice(0, 200)
    }
    const ext = extFor(fileName, contentType)

    // Unique, path-safe key. Randomness keeps keys from colliding within a ms.
    const rand = Math.random().toString(36).slice(2, 10)
    const key = `uploads/${Date.now()}-${rand}.${ext}`

    await store.set(key, body)

    return Response.json({
      url: `/api/media/${key}`,
      key,
      name: fileName,
      type: contentType,
      size: body.byteLength,
    })
  }

  return new Response('Method Not Allowed', { status: 405 })
}

export const config: Config = {
  path: ['/api/media', '/api/media/*'],
  method: ['GET', 'POST'],
}
