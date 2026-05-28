# DNS Fix Guide - jaimbo.live on Netlify

**Problem:** DNS verification stuck on "Pending" after 48+ hours

**Solution:** Update nameservers in Namecheap to point to Netlify

---

## STEP 1: Get Netlify Nameservers

1. Go to **Netlify Dashboard** → https://app.netlify.com
2. Select your site: **jaimbolive**
3. Go to **Site Settings** → **Domain Management**
4. Look for your domain **jaimbo.live**
5. You should see a section that says "Nameservers" with 4 entries

**Copy these 4 nameservers** (they look like):
```
ns1.netlify.com
ns2.netlify.com
ns3.netlify.com
ns4.netlify.com
```

⚠️ **IMPORTANT:** Your actual nameservers might be slightly different. Copy exactly what Netlify shows you.

---

## STEP 2: Log Into Namecheap

1. Go to https://www.namecheap.com
2. Click **Sign In** (top right)
3. Enter your email and password
4. Click **Sign In**

---

## STEP 3: Find Your Domain

1. After logging in, you should see **Dashboard**
2. Look for **Domain List** on the left sidebar
3. Click **Domain List**
4. Find **jaimbo.live** in the list
5. Click on it

---

## STEP 4: Access Nameserver Settings

1. You're now on your domain page
2. Look for the **Nameservers** section
3. You should see a dropdown that says something like:
   - "Namecheap BasicDNS" OR
   - "Custom DNS" OR
   - A list of current nameservers

4. Click on the **dropdown** or **Edit** button next to Nameservers

---

## STEP 5: Change to Custom Nameservers

1. Select **Custom DNS** from the dropdown (if not already selected)
2. You'll see 4 empty fields for nameservers
3. Delete any existing nameservers
4. Enter the **Netlify nameservers** you copied earlier:

```
Field 1: ns1.netlify.com
Field 2: ns2.netlify.com
Field 3: ns3.netlify.com
Field 4: ns4.netlify.com
```

⚠️ **Make sure you enter them EXACTLY as shown** (including the dots and spelling)

---

## STEP 6: Save Changes

1. Look for a **Save** or **Update** button
2. Click it
3. You should see a confirmation message: "Nameservers updated successfully"

---

## STEP 7: Wait for Propagation

DNS changes take **24-48 hours** to fully propagate globally.

**But you can check if it's working immediately:**

### Option A: Check DNS Propagation (Recommended)

1. Go to https://dnschecker.org
2. Enter your domain: `jaimbo.live`
3. Select **Nameserver** from dropdown
4. Click **Check**
5. You should see all 4 Netlify nameservers listed

### Option B: Check in Terminal

**Mac/Linux:**
```bash
nslookup jaimbo.live
```

**Windows:**
```bash
nslookup jaimbo.live
```

You should see Netlify nameservers in the response.

---

## STEP 8: Verify in Netlify

1. Go back to **Netlify Dashboard**
2. Go to **Site Settings** → **Domain Management**
3. Look at **jaimbo.live**
4. Status should change from "Pending" to **"Active"** or **"Connected"**

This might take a few minutes to update.

---

## STEP 9: Test Your Domain

Once DNS is verified:

1. Open your browser
2. Go to **https://jaimbo.live**
3. You should see your website!
4. Check that it's using HTTPS (lock icon in address bar)

---

## IF IT'S STILL NOT WORKING

### Check 1: Verify Nameservers Were Actually Changed

1. Go back to Namecheap
2. Check the Nameservers section again
3. Make sure it shows the 4 Netlify nameservers
4. If it still shows old nameservers, repeat STEP 5 and STEP 6

### Check 2: Clear Browser Cache

1. Press **Ctrl + Shift + Delete** (Windows) or **Cmd + Shift + Delete** (Mac)
2. Select "All time"
3. Check "Cookies and other site data"
4. Click "Clear data"
5. Try visiting jaimbo.live again

### Check 3: Try Different Browser

Sometimes browser cache causes issues:
1. Try Chrome, Firefox, or Safari
2. Visit jaimbo.live
3. See if it works in a different browser

### Check 4: Wait Longer

DNS propagation can take up to 48 hours in some cases:
- Check again in 24 hours
- Use https://dnschecker.org to monitor progress

### Check 5: Contact Namecheap Support

If nameservers are correct but still not working:
1. Go to Namecheap support: https://www.namecheap.com/support/
2. Click "Contact Us"
3. Explain: "I updated nameservers to Netlify but DNS isn't resolving"
4. They can help troubleshoot

---

## TROUBLESHOOTING CHECKLIST

- [ ] Copied Netlify nameservers correctly
- [ ] Logged into Namecheap
- [ ] Found jaimbo.live in Domain List
- [ ] Changed to Custom DNS
- [ ] Entered all 4 Netlify nameservers
- [ ] Clicked Save/Update
- [ ] Checked propagation at dnschecker.org
- [ ] Verified in Netlify dashboard
- [ ] Cleared browser cache
- [ ] Waited 24-48 hours
- [ ] Tried different browser

---

## QUICK REFERENCE

| Step | Action | Where |
|------|--------|-------|
| 1 | Get Netlify nameservers | Netlify Dashboard → Domain Management |
| 2 | Log into Namecheap | https://namecheap.com |
| 3 | Find your domain | Domain List → jaimbo.live |
| 4 | Click Nameservers | Domain page |
| 5 | Select Custom DNS | Dropdown menu |
| 6 | Enter 4 Netlify nameservers | Custom DNS fields |
| 7 | Click Save | Bottom of form |
| 8 | Check propagation | https://dnschecker.org |
| 9 | Test domain | https://jaimbo.live |

---

## EXPECTED TIMELINE

- **Immediately:** Nameservers updated in Namecheap
- **5-30 minutes:** Some DNS resolvers see the change
- **1-4 hours:** Most DNS resolvers see the change
- **24 hours:** Nearly all DNS resolvers see the change
- **48 hours:** 100% propagation (guaranteed)

---

## WHAT YOU'LL SEE WHEN IT'S WORKING

✅ Visit https://jaimbo.live
✅ See your Jaimbo website
✅ Lock icon in address bar (HTTPS)
✅ Netlify dashboard shows "Connected"
✅ Contact form works
✅ All pages load correctly

---

## STILL STUCK?

Reply with:
1. **Screenshot of Namecheap nameservers** (show what's currently set)
2. **Screenshot of Netlify Domain Management** (show what it's asking for)
3. **Result of dnschecker.org** (show what DNS is resolving to)

I can then provide more specific guidance!

---

**Good luck! Your domain should be working within 24 hours.** 🚀
