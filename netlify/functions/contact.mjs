import nodemailer from "nodemailer";

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method Not Allowed" }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { firstName, lastName, email, subject, message } = body;

  if (!firstName || !lastName || !email || !subject || !message) {
    return Response.json({ error: "All fields are required." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Response.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  console.log(`Contact form: ${firstName} ${lastName} <${email}> - ${subject}`);

  if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.ADMIN_EMAIL) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
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
          <p>${String(message).replace(/\n/g, "<br/>")}</p>
        `,
      });
    } catch (error) {
      console.error("Email error:", error.message);
    }
  }

  return Response.json({ message: "Message received! We will get back to you soon." });
};

export const config = {
  path: "/api/contact",
};
