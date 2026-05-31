import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

// Receives contact-form submissions from the public site.
// Each submission is appended to a list in Netlify Blobs so the admin
// dashboard ("Messages" tab) can read them back. Email notification is
// optional and only attempted when SMTP env vars are configured.
const STORE_NAME = 'site-config'
const KEY = 'submissions'

interface Submission {
  id: string
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
  timestamp: string
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const email = String(body.email ?? '').trim()
  const subject = String(body.subject ?? '').trim()
  const message = String(body.message ?? '').trim()

  if (!firstName || !lastName || !email || !message) {
    return Response.json({ error: 'Please fill in your name, email, and message.' }, { status: 400 })
  }
  if (!emailRegex.test(email)) {
    return Response.json({ error: 'Please provide a valid email address.' }, { status: 400 })
  }

  const record: Submission = {
    id: crypto.randomUUID(),
    firstName: firstName.slice(0, 100),
    lastName: lastName.slice(0, 100),
    email: email.slice(0, 200),
    subject: (subject || 'General').slice(0, 200),
    message: message.slice(0, 5000),
    timestamp: new Date().toISOString(),
  }

  // Persist to Netlify Blobs (append to the stored list).
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })
  const existing = ((await store.get(KEY, { type: 'json' })) as Submission[] | null) ?? []
  existing.push(record)
  await store.setJSON(KEY, existing)

  // Optional email notification — never let a mail failure break the submission.
  const smtpUser = Netlify.env.get('SMTP_USER')
  const smtpPass = Netlify.env.get('SMTP_PASS')
  const adminEmail = Netlify.env.get('ADMIN_EMAIL')
  if (smtpUser && smtpPass && adminEmail) {
    try {
      const nodemailer = (await import('nodemailer')).default
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass },
      })
      await transporter.sendMail({
        from: `"Jaimbo Website" <${smtpUser}>`,
        to: adminEmail,
        replyTo: record.email,
        subject: `[Jaimbo Contact] ${record.subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${record.firstName} ${record.lastName}</p>
          <p><strong>Email:</strong> ${record.email}</p>
          <p><strong>Subject:</strong> ${record.subject}</p>
          <p><strong>Message:</strong></p>
          <p>${record.message.replace(/\n/g, '<br/>')}</p>
        `,
      })
    } catch (err) {
      console.error('Contact email notification failed:', (err as Error).message)
    }
  }

  return Response.json({ message: 'Message received! We will get back to you soon.' })
}

export const config: Config = {
  path: '/api/contact',
  method: ['POST'],
}
