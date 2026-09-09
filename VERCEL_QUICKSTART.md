# Deploy Vercel with Free IP Rotation

One-command deployment with automatic IP rotation for reCaptcha bypass.

## ⚡ Quick Setup (3 Minutes)

### 1. Get Free API Key
```bash
# Sign up at: https://www.scraperapi.com
# Free tier: 1,000 requests/month
# No credit card required
```

### 2. Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (reads SCRAPER_API_KEY from terminal)
vercel --prod --env SCRAPER_API_KEY=your_api_key
```

### 3. Done! ✅
```bash
# Your app is live at:
# https://your-project.vercel.app
```

---

## 🌍 Use It

### Scrape with Rotating IP
```bash
# Simple scraping
curl "https://your-app.vercel.app/api/scrape?url=https://ipinfo.io/json"

# From specific country
curl "https://your-app.vercel.app/api/scrape?url=https://example.com&country=DE"

# With JavaScript rendering
curl "https://your-app.vercel.app/api/scrape?url=https://example.com&render=true"
```

### Check Status
```bash
curl https://your-app.vercel.app/api/scraper-health
```

---

## 📋 Setup Vercel Dashboard (Better Way)

### 1. Add to GitHub
```bash
git add .
git commit -m "Add Vercel deployment"
git push
```

### 2. Connect to Vercel
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import from GitHub (your repo)
4. Click "Deploy"

### 3. Add Environment Variable
In Vercel Dashboard:
1. Settings → Environment Variables
2. Name: `SCRAPER_API_KEY`
3. Value: Your API key from ScraperAPI
4. Save and redeploy

### 4. Redeploy
```bash
git push  # Triggers automatic deployment
```

---

## 💻 Local Testing Before Deploy

### Test locally first:
```bash
# 1. Set environment variable
export SCRAPER_API_KEY=your_api_key  # Linux/macOS
# or
set SCRAPER_API_KEY=your_api_key     # Windows

# 2. Start local server
npm start

# 3. Test scraper
curl "http://localhost:8080/api/scrape?url=https://ipinfo.io/json"
```

---

## 🎯 Use Cases

### ✅ ChatGPT / Claude Proxy
```javascript
const response = await fetch(
  'https://your-app.vercel.app/api/scrape?url=https://chat.openai.com',
  { method: 'POST' }
);
```

### ✅ TikTok / Snapchat Scraping
```javascript
const tiktokData = await fetch(
  'https://your-app.vercel.app/api/scrape?url=https://tiktok.com/@username&render=true'
);
```

### ✅ Geo-Targeted Requests
```javascript
// Visit from Germany
const deData = await fetch(
  'https://your-app.vercel.app/api/scrape?url=https://example.de&country=DE'
);

// Visit from Japan
const jpData = await fetch(
  'https://your-app.vercel.app/api/scrape?url=https://example.jp&country=JP'
);
```

---

## 📊 Free Tier Details

| Metric | Free Limit |
|--------|-----------|
| **Requests/Month** | 1,000 |
| **Bandwidth** | Unlimited |
| **Concurrent** | 10 |
| **Countries** | All 200+ |
| **reCaptcha Bypass** | ✅ Yes |
| **JavaScript Render** | ✅ Yes |
| **Cost** | $0 (free) |

---

## 💰 When to Upgrade

- $29/mo: 100,000 req/mo
- $99/mo: Unlimited requests
- Pay-as-you-go: $0.01-0.05/request

Good for scaling your app! 📈

---

## 🔍 Monitor Usage

### In Vercel Dashboard:
```
Project → Analytics → API Routes
Shows real-time request counts
```

### Check Scraper Health:
```bash
curl https://your-app.vercel.app/api/scraper-health

# Response:
# {
#   "status": "ready",
#   "apiKeyConfigured": true,
#   "cacheStats": {"cachedUrls": 42}
# }
```

---

## ⚠️ Troubleshooting

### "SCRAPER_API_KEY not found"
```bash
# Verify environment variable in Vercel Dashboard
Settings → Environment Variables → Check SCRAPER_API_KEY exists
```

### "403 Forbidden" from API
```
Likely wrong API key. Verify at https://www.scraperapi.com/dashboard
```

### "Rate limit exceeded"
```
Hit 1,000 req/month limit. Check usage dashboard or upgrade plan.
```

---

## 🚀 Next Steps

1. ✅ Sign up at https://www.scraperapi.com
2. ✅ Copy API key
3. ✅ Deploy with: `vercel --prod --env SCRAPER_API_KEY=key`
4. ✅ Test at: `https://your-app.vercel.app/api/scraper-health`

**Done!** Your app rotates IPs automatically. 🎉

---

## 📚 Resources

- **ScraperAPI Docs**: https://www.scraperapi.com/documentation
- **Vercel Docs**: https://vercel.com/docs
- **API Endpoints**: See [VERCEL_FREE_PROXY_SETUP.md](./VERCEL_FREE_PROXY_SETUP.md)
