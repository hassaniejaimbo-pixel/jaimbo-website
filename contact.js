// ===========================
// NETLIFY SERVERLESS FUNCTION
// netlify/functions/contact.js
// ===========================
// This file handles the contact form when deployed on Netlify.
// It mirrors the logic in api/server.js for serverless environments.

const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const { firstName, lastName, email, subject, message } = body;

  if (!firstName || !lastName || !email || !subject || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'All fields are required.' }) };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please provide a valid email address.' }) };
  }

  console.log(`Contact form: ${firstName} ${lastName} <${email}> — ${subject}`);

  if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.ADMIN_EMAIL) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: `"Jaimbo Website" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `[Jaimbo Contact] ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br/>')}</p>
        `,
      });
    } catch (err) {
      console.error('Email error:', err.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Message received! We will get back to you soon.' }),
  };
};
