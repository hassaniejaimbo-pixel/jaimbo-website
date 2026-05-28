# Jaimbo Website — Complete Step-by-Step Guide

Follow these steps to get your website live in 30 minutes.

---

## PART 1: Test Locally (5 minutes)

### Step 1: Open Terminal/Command Prompt

**Windows:**
- Press `Win + R`
- Type `cmd` and press Enter

**Mac:**
- Press `Cmd + Space`
- Type `terminal` and press Enter

**Linux:**
- Press `Ctrl + Alt + T`

### Step 2: Navigate to Project

```bash
cd jaimbo-website-permanent
```

If you're not sure where the folder is, you can find it:
- **Windows:** Usually in `C:\Users\YourName\Documents\jaimbo-website-permanent`
- **Mac/Linux:** Usually in `~/jaimbo-website-permanent`

### Step 3: Install Dependencies

```bash
npm install
```

This downloads all required packages. **Wait for it to finish** (may take 2-3 minutes).

### Step 4: Start the Server

```bash
npm start
```

You should see:
```
🚀 Jaimbo website running on http://localhost:3000
```

### Step 5: Test Locally

1. Open your browser
2. Go to `http://localhost:3000`
3. You should see your website!
4. Test the contact form by filling it out and clicking "Send Message"

✅ **If everything works, proceed to Part 2**

To stop the server: Press `Ctrl + C` in terminal

---

## PART 2: Push Code to GitHub (5 minutes)

### Step 1: Create GitHub Account

1. Go to https://github.com/signup
2. Enter email, password, username
3. Verify email
4. Done!

### Step 2: Create New Repository

1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** `jaimbo-website`
   - **Description:** `Official website for Jaimbo`
   - **Public** (select this)
3. Click "Create repository"

### Step 3: Install Git

**Windows:**
1. Go to https://git-scm.com/download/win
2. Download and run installer
3. Accept all defaults

**Mac:**
1. Open Terminal
2. Run: `brew install git`

**Linux:**
```bash
sudo apt-get install git
```

### Step 4: Configure Git (First Time Only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and email.

### Step 5: Initialize Repository

In your project folder:

```bash
git init
git add .
git commit -m "Initial commit - Jaimbo website"
```

### Step 6: Connect to GitHub

Copy this from your GitHub repository page (it will show after you create it):

```bash
git remote add origin https://github.com/YOUR-USERNAME/jaimbo-website.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

✅ **Your code is now on GitHub!**

---

## PART 3: Deploy to Netlify (10 minutes) — EASIEST OPTION

### Step 1: Sign Up for Netlify

1. Go to https://netlify.com
2. Click "Sign up"
3. Click "GitHub"
4. Authorize Netlify to access your GitHub
5. Done!

### Step 2: Create New Site

1. Click "New site from Git"
2. Select "GitHub"
3. Search for `jaimbo-website` repository
4. Click to select it

### Step 3: Configure Build Settings

You should see:

```
Build command: npm run build
Publish directory: public
```

**If these are NOT filled in, enter them manually:**
- Build command: `npm install && npm run build`
- Publish directory: `public`

Then click "Deploy site"

### Step 4: Wait for Deployment

You'll see a status page showing:
- Building...
- Deploying...
- Published ✅

This takes 2-3 minutes. **Don't close the page.**

### Step 5: Get Your Live URL

Once deployed, you'll see a URL like:
```
https://jaimbo-website-abc123.netlify.app
```

✅ **Your website is now LIVE!**

Visit this URL in your browser to see it online.

---

## PART 4: Set Up Custom Domain (Optional - 10 minutes)

### Step 1: Buy a Domain

Go to one of these sites:
- https://www.namecheap.com
- https://www.godaddy.com
- https://domains.google.com

Search for `jaimbo.com` or your preferred domain.

**Cost:** Usually $10-15/year

### Step 2: Add Domain to Netlify

1. In Netlify dashboard, go to "Site settings"
2. Click "Domain management"
3. Click "Add custom domain"
4. Enter your domain (e.g., `jaimbo.com`)
5. Click "Verify"

### Step 3: Update DNS Records

Netlify will show you nameservers to add to your domain registrar.

**In your domain registrar (Namecheap, GoDaddy, etc.):**

1. Find "Nameservers" or "DNS Settings"
2. Replace existing nameservers with Netlify's nameservers
3. Save changes

**Wait 24-48 hours for DNS to propagate.**

### Step 4: Verify SSL Certificate

Netlify automatically creates a free SSL certificate.

Once DNS propagates:
- Your site will be at `https://yourdomain.com` (with HTTPS)
- Automatic redirects from `http://` to `https://`

✅ **Your website is now on a custom domain with HTTPS!**

---

## PART 5: Test Everything (5 minutes)

### Test 1: Visit Your Website

1. Go to your Netlify URL or custom domain
2. Scroll through the page
3. Check that everything looks correct

### Test 2: Test Contact Form

1. Scroll to "Contact" section
2. Fill in all fields:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `your-email@gmail.com`
   - Subject: `Test`
   - Message: `This is a test`
3. Click "Send Message"
4. You should see: "Message received! We will get back to you soon."

### Test 3: Mobile Responsiveness

1. On your computer, press `F12` (Developer Tools)
2. Click the phone icon (Toggle device toolbar)
3. Scroll through your website on mobile view
4. Everything should work smoothly

### Test 4: Check Submissions

In Netlify:
1. Go to "Functions" tab
2. Look for contact submissions
3. Your test submission should appear

✅ **Everything is working!**

---

## PART 6: Update Website Content (Optional)

### To Change Text/Images:

1. Edit files locally:
   - `public/index.html` — Main content
   - `api/server.js` — Backend logic

2. Save changes

3. Push to GitHub:
```bash
git add .
git commit -m "Update content"
git push origin main
```

4. Netlify automatically redeploys (takes 1-2 minutes)

---

## PART 7: Add Email Notifications (Optional)

To receive emails when someone submits the contact form:

### Option A: Use Formspree (Easiest)

1. Go to https://formspree.io
2. Sign up with email
3. Create new form
4. Get the form endpoint
5. Update `public/app.js` to use Formspree

### Option B: Use Gmail SMTP

1. Enable 2-factor authentication on Gmail
2. Create app password: https://myaccount.google.com/apppasswords
3. Add to `.env` file:
```
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=your-email@gmail.com
```

---

## TROUBLESHOOTING

### "npm: command not found"

**Solution:** Install Node.js from https://nodejs.org

### "Port 3000 already in use"

**Solution:** 
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### Website shows "404 Not Found"

**Solution:**
1. Wait 5 minutes for Netlify to deploy
2. Refresh browser (Ctrl + Shift + R)
3. Check if build succeeded in Netlify dashboard

### Contact form not working

**Solution:**
1. Open browser DevTools (F12)
2. Go to "Console" tab
3. Look for error messages
4. Check Netlify logs for backend errors

### DNS not propagating

**Solution:**
1. Wait 24-48 hours
2. Check propagation: https://dnschecker.org
3. Verify nameservers are correct

---

## QUICK REFERENCE

### Commands You'll Use

```bash
# Test locally
npm start

# Push to GitHub
git add .
git commit -m "Your message"
git push origin main

# Stop server
Ctrl + C

# Check if port is free
lsof -i :3000  (Mac/Linux)
netstat -ano | findstr :3000  (Windows)
```

### Important URLs

- **Local:** http://localhost:3000
- **Netlify Dashboard:** https://app.netlify.com
- **GitHub:** https://github.com/your-username/jaimbo-website
- **Your Live Site:** https://yourdomain.com

### Files to Know

- `public/index.html` — Main website content
- `api/server.js` — Backend server
- `package.json` — Dependencies
- `.env` — Environment variables (create if needed)

---

## NEXT STEPS

After deployment:

1. ✅ Share your website URL with friends
2. ✅ Update social media with link
3. ✅ Monitor contact form submissions
4. ✅ Keep content updated
5. ✅ Monitor website performance

---

## SUPPORT

If you get stuck:

1. **Check error messages** — Read them carefully
2. **Google the error** — Usually someone has solved it
3. **Check Netlify logs** — Dashboard → Deploys → View logs
4. **Check GitHub** — Make sure code was pushed correctly

---

## CONGRATULATIONS! 🎉

Your website is now live and accessible to the world!

**Next time you want to update it:**
1. Edit files locally
2. `git add .`
3. `git commit -m "Update message"`
4. `git push origin main`
5. Netlify auto-deploys in 1-2 minutes

**That's it!**
