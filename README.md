# Jaimbo — Digital Creator Website

A professional, production-ready website for Jaimbo featuring a landing page, contact form, and backend API.

## Features

- **Hero Section** — Stunning hero with profile photo, verified badge, and engagement stats
- **About Section** — Brand story with core pillars (Fact-Based Analysis, Civic Education, Bold Commentary, Community Voice)
- **Content Cards** — Featured content showcasing political analysis, social commentary, video reels, and fact-checking
- **Social Proof** — Engagement metrics and community testimonials
- **Contact Form** — Fully functional contact form with backend validation and submission storage
- **Responsive Design** — Mobile-first, works on all devices
- **Dark Theme** — Facebook-inspired dark aesthetic with blue and red accents
- **SEO Optimized** — Meta tags, Open Graph, Twitter Card support
- **API Backend** — Express.js server with contact form handling

## Project Structure

```
jaimbo-website-permanent/
├── public/
│   ├── index.html          # Main HTML file with embedded styles
│   └── app.js              # Client-side JavaScript
├── api/
│   └── server.js           # Express.js backend server
├── data/
│   └── submissions.json    # Contact form submissions (auto-created)
├── config/
├── package.json            # Dependencies
└── README.md               # This file
```

## Installation

### Prerequisites

- Node.js 16+ and npm/pnpm
- Git (optional)

### Setup

1. **Install dependencies:**

```bash
cd jaimbo-website-permanent
npm install
# or
pnpm install
```

2. **Start the development server:**

```bash
npm run dev
# or
pnpm dev
```

The website will be available at `http://localhost:3000`

## Deployment

### Option 1: Netlify (Recommended for Static + Serverless)

1. Push your code to GitHub
2. Connect repository to Netlify
3. Build command: `npm run build`
4. Publish directory: `public`

### Option 2: Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Vercel automatically detects Node.js project
4. Deploy

### Option 3: Traditional Hosting (Heroku, Railway, etc.)

1. Set `PORT` environment variable
2. Run: `npm start`
3. Website runs on specified port

### Option 4: Self-Hosted (VPS/Dedicated Server)

1. SSH into your server
2. Clone repository
3. Install Node.js
4. Run: `npm install && npm start`
5. Use PM2 or systemd for process management

```bash
# Using PM2
npm install -g pm2
pm2 start api/server.js --name "jaimbo-website"
pm2 startup
pm2 save
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=production

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@jaimbo.com
```

### Custom Domain

To use a custom domain:

1. **Netlify/Vercel:** Add domain in dashboard
2. **Self-hosted:** Update DNS records to point to your server IP
3. **SSL Certificate:** Use Let's Encrypt (free)

```bash
# Using Certbot for Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com
```

## API Endpoints

### POST /api/contact

Submit a contact form message.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "subject": "Collaboration",
  "message": "I'd like to collaborate..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message received! We will get back to you soon.",
  "submissionId": 1234567890
}
```

### GET /api/submissions

Retrieve all contact form submissions (admin only in production).

**Response:**
```json
{
  "success": true,
  "count": 5,
  "submissions": [...]
}
```

### GET /api/stats

Get website statistics.

**Response:**
```json
{
  "followers": 84000,
  "topReactions": 3200,
  "comments": 226,
  "verified": true,
  "platform": "Facebook",
  "uptime": "99.9%"
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-25T18:15:00.000Z",
  "uptime": 3600
}
```

## Email Integration (Optional)

To enable email notifications for contact form submissions:

1. Install nodemailer:
```bash
npm install nodemailer
```

2. Update `api/server.js` to send emails:
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send email on contact form submission
await transporter.sendMail({
  from: process.env.SMTP_USER,
  to: process.env.ADMIN_EMAIL,
  subject: `New message from ${firstName} ${lastName}`,
  html: `<p>${message}</p><p>Reply to: ${email}</p>`,
});
```

## Database Integration (Optional)

To use a database instead of JSON files:

1. Install database driver:
```bash
npm install mongodb  # or mysql2, pg, etc.
```

2. Update `api/server.js` to use database queries

## Performance Optimization

- **Images:** All images are embedded as base64 (no external requests)
- **CSS:** Inline styles for faster initial load
- **Caching:** Set appropriate cache headers
- **Compression:** Enable gzip compression

```javascript
import compression from 'compression';
app.use(compression());
```

## Security

- ✅ CORS enabled (configure for production)
- ✅ Input validation on contact form
- ✅ Email validation
- ✅ Rate limiting (add in production)

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.post('/api/contact', limiter, (req, res) => {
  // ...
});
```

## Monitoring & Maintenance

### Logs

Check server logs:
```bash
# PM2 logs
pm2 logs jaimbo-website

# Systemd logs
journalctl -u jaimbo-website -f
```

### Backups

Regular backup of submissions:
```bash
cp data/submissions.json data/submissions.backup.$(date +%Y%m%d).json
```

### Updates

Keep dependencies updated:
```bash
npm update
npm audit fix
```

## Troubleshooting

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### CORS errors

Update CORS configuration in `api/server.js`:
```javascript
app.use(cors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
}));
```

### Contact form not working

1. Check browser console for errors
2. Verify API endpoint is accessible: `curl http://localhost:3000/api/health`
3. Check server logs for submission errors

## Support & Contact

- **Facebook:** https://www.facebook.com/profile.php?id=61578836424894
- **Email:** [Add contact email]
- **Website:** https://jaimbo.com (when deployed)

## License

MIT License - Feel free to use and modify

## Changelog

### v1.0.0 (May 25, 2026)
- Initial release
- Landing page with hero, about, content cards, social proof
- Contact form with backend validation
- API endpoints for submissions and stats
- Responsive design
- Dark theme with Facebook aesthetic

---

**Built with ❤️ for Jaimbo**
