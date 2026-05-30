# Jaimbo Website

Official website for Jaimbo. Built with Node.js + Express, deployable to Netlify or any server.

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set up environment variables
cp .env.example .env
# Edit .env with your SMTP credentials

# 3. Start the server
npm start
```

Open your browser at **http://localhost:3000**

## Project Structure

```
jaimbo-website-permanent/
├── public/
│   ├── index.html      ← Main website content
│   ├── style.css       ← Styles
│   └── app.js          ← Frontend JavaScript
├── api/
│   └── server.js       ← Express backend server
├── netlify/
│   └── functions/
│       └── contact.js  ← Netlify serverless function
├── .env.example        ← Environment variable template
├── .gitignore
├── netlify.toml        ← Netlify deployment config
├── package.json
└── README.md
```

## Deployment (Netlify)

1. Push this folder to a GitHub repository.
2. Go to [https://app.netlify.com](https://app.netlify.com) and click **New site from Git**.
3. Select your GitHub repository.
4. Build settings are auto-detected from `netlify.toml`:
   - **Build command:** `npm install`
   - **Publish directory:** `public`
5. Click **Deploy site**.

## Email Notifications (Optional)

To receive email alerts when someone submits the contact form:

1. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) and create an app password.
2. In Netlify dashboard → **Site settings → Environment variables**, add:
   - `SMTP_USER` = your Gmail address
   - `SMTP_PASS` = your app password
   - `ADMIN_EMAIL` = the email to receive notifications

## Custom Domain

1. Buy a domain at [Namecheap](https://www.namecheap.com), [GoDaddy](https://www.godaddy.com), or [Google Domains](https://domains.google.com).
2. In Netlify → **Site settings → Domain management → Add custom domain**.
3. Update your domain's nameservers to point to Netlify.
4. Wait 24–48 hours for DNS propagation. Netlify provides a free SSL certificate automatically.

## License

MIT
