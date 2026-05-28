# Jaimbo Website — Deployment Guide

This guide covers all deployment options for your permanent Jaimbo website.

## Quick Start (Local Development)

```bash
cd jaimbo-website-permanent
npm install
npm start
```

Visit `http://localhost:3000` in your browser.

---

## Deployment Options

### 1. Netlify (Recommended - Easiest)

**Pros:** Free tier, automatic HTTPS, serverless functions, easy GitHub integration

**Steps:**

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/jaimbo-website.git
git push -u origin main
```

2. **Connect to Netlify:**
   - Go to https://netlify.com
   - Click "New site from Git"
   - Select your GitHub repository
   - Build command: `npm install && npm run build`
   - Publish directory: `public`
   - Click "Deploy"

3. **Custom Domain:**
   - In Netlify dashboard: Domain settings
   - Add your custom domain (e.g., jaimbo.com)
   - Update DNS records with Netlify nameservers

**Cost:** Free tier includes 100GB/month bandwidth

---

### 2. Vercel (Alternative - Also Easy)

**Pros:** Optimized for Node.js, free tier, automatic deployments

**Steps:**

1. **Push to GitHub** (same as Netlify)

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click "Import Project"
   - Select GitHub repository
   - Vercel auto-detects settings
   - Click "Deploy"

3. **Custom Domain:**
   - In Vercel dashboard: Settings → Domains
   - Add your custom domain
   - Update DNS records

**Cost:** Free tier, generous limits

---

### 3. Heroku (Traditional Hosting)

**Pros:** Simple deployment, good for learning, paid tiers available

**Steps:**

1. **Install Heroku CLI:**
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install.sh | sh

# Windows
# Download installer from https://devcenter.heroku.com/articles/heroku-cli
```

2. **Deploy:**
```bash
heroku login
heroku create jaimbo-website
git push heroku main
```

3. **View logs:**
```bash
heroku logs --tail
```

**Cost:** Free tier deprecated; paid dynos start at $7/month

---

### 4. Railway (Modern Alternative)

**Pros:** Simple deployment, GitHub integration, affordable

**Steps:**

1. **Push to GitHub**

2. **Connect to Railway:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Select your repository
   - Railway auto-detects Node.js
   - Click "Deploy"

3. **Custom Domain:**
   - Project settings → Domains
   - Add custom domain
   - Update DNS

**Cost:** $5/month starter plan

---

### 5. DigitalOcean App Platform

**Pros:** Full control, scalable, good documentation

**Steps:**

1. **Push to GitHub**

2. **Create App:**
   - Go to https://cloud.digitalocean.com
   - Click "Create" → "Apps"
   - Select GitHub repository
   - Configure build settings
   - Deploy

3. **Custom Domain:**
   - App settings → Domains
   - Add your domain
   - Update DNS

**Cost:** $5-12/month depending on resources

---

### 6. Self-Hosted VPS (Full Control)

**Pros:** Complete control, no vendor lock-in, scalable

**Providers:** DigitalOcean, Linode, AWS EC2, Vultr, Hetzner

**Steps:**

1. **Create VPS:**
   - Choose Ubuntu 22.04 LTS
   - Minimum: 1GB RAM, 1 vCPU, 25GB SSD
   - Note your IP address

2. **SSH into server:**
```bash
ssh root@your-server-ip
```

3. **Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. **Clone repository:**
```bash
git clone https://github.com/yourusername/jaimbo-website.git
cd jaimbo-website-permanent
npm install
```

5. **Install PM2 (process manager):**
```bash
sudo npm install -g pm2
pm2 start api/server.js --name "jaimbo"
pm2 startup
pm2 save
```

6. **Install Nginx (reverse proxy):**
```bash
sudo apt-get install -y nginx
```

7. **Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/default
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. **Enable SSL (Let's Encrypt):**
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

9. **Restart Nginx:**
```bash
sudo systemctl restart nginx
```

10. **Update DNS:**
    - Point A record to your server IP
    - Wait 24 hours for propagation

**Cost:** $4-6/month for basic VPS

---

## Domain Setup

### DNS Configuration

For all hosting providers, update your domain's DNS records:

**Type:** A Record
**Name:** @ (or leave blank)
**Value:** Your hosting provider's IP or nameservers

**For www subdomain:**
**Type:** CNAME
**Name:** www
**Value:** yourdomain.com

### SSL Certificate

- **Netlify/Vercel:** Automatic (free)
- **Heroku/Railway:** Automatic (free)
- **Self-hosted:** Use Let's Encrypt (free)

---

## Environment Variables

Create `.env` file in project root:

```env
PORT=3000
NODE_ENV=production

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@jaimbo.com
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check if website is up
curl https://yourdomain.com/api/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

### Logs

**Netlify/Vercel:** Dashboard → Logs
**Heroku:** `heroku logs --tail`
**Self-hosted:** `pm2 logs` or `journalctl -u nginx -f`

### Backups

```bash
# Backup submissions
cp data/submissions.json data/submissions.backup.$(date +%Y%m%d).json

# Upload to cloud storage
aws s3 cp data/submissions.backup.*.json s3://your-bucket/backups/
```

---

## Performance Optimization

### Enable Caching

```javascript
// In api/server.js
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=3600');
  next();
});
```

### Enable Compression

```bash
npm install compression
```

```javascript
import compression from 'compression';
app.use(compression());
```

### CDN Setup

**Cloudflare (Free):**
1. Go to cloudflare.com
2. Add your domain
3. Update nameservers
4. Enable caching and optimization

---

## Troubleshooting

### Website not loading

1. Check DNS propagation: https://dnschecker.org
2. Check SSL certificate: https://www.sslshopper.com/ssl-checker.html
3. Check server status: `curl -I https://yourdomain.com`

### Contact form not working

1. Check API health: `curl https://yourdomain.com/api/health`
2. Check server logs
3. Verify CORS settings

### High memory usage

```bash
# Check process memory
ps aux | grep node

# Restart if needed
pm2 restart jaimbo
```

---

## Security Checklist

- [ ] Enable HTTPS/SSL
- [ ] Update Node.js to latest LTS
- [ ] Set strong environment variables
- [ ] Enable rate limiting on API
- [ ] Regular backups of submissions
- [ ] Monitor server logs
- [ ] Keep dependencies updated
- [ ] Use strong database passwords
- [ ] Enable firewall rules

---

## Support

For deployment issues:
- Check hosting provider documentation
- Review server logs
- Test locally first
- Contact hosting support

**Happy deploying! 🚀**
