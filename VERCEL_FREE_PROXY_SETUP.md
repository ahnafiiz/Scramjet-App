# Vercel Deployment with Free IP Rotation

Deploy your Scramjet app to Vercel with free IP rotation using proxy APIs.

## 🎯 Best Free Options for Vercel

### Option 1: **ScraperAPI (Recommended - Easiest)**
- ✅ Free tier: 1,000 requests/month
- ✅ Automatic IP rotation
- ✅ Built-in reCaptcha bypass
- ✅ No setup required
- 📊 Perfect for: ChatGPT, Claude, TikTok, etc.

**Setup:**
1. Sign up: https://www.scraperapi.com (free)
2. Get API key from dashboard
3. Add to Vercel `.env`:
```env
SCRAPER_API_KEY=your_api_key_here
```

**Use in code:**
```javascript
// In your Vercel function or Scramjet app
const scraperApiUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;

const response = await fetch(scraperApiUrl);
const data = await response.text();
```

---

### Option 2: **Bright Data Free Tier**
- ✅ Free tier: 1GB/month
- ✅ Residential proxies
- ✅ Automatic rotation
- ⚠️ Requires credit card (won't charge if under free limit)

**Setup:**
1. Sign up: https://brightdata.com (free)
2. Create Smart Proxy in dashboard
3. Get proxy credentials

**Use in code:**
```javascript
const ProxyAgent = require('proxy-agent');
const agent = new ProxyAgent(`http://${username}:${password}@proxy.provider.com:port`);

fetch('https://example.com', { agent });
```

---

### Option 3: **ProtonVPN Free Tier + DIY**
- ⚠️ Free tier: 3 servers only (limited rotation)
- ✅ Completely free
- ❌ Need your own VPS to run wireproxy (costs money)
- ⚠️ Not recommended for Vercel

---

## ⭐ RECOMMENDED: ScraperAPI (Easiest)

### Step 1: Sign Up
```
1. Go to https://www.scraperapi.com
2. Click "Sign Up" (free account)
3. Verify email
4. Copy your API key from dashboard
```

### Step 2: Create Vercel Project

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy your Scramjet app
vercel

# Or link existing project
vercel link
```

### Step 3: Add Environment Variables to Vercel

In Vercel Dashboard:
1. Go to Settings > Environment Variables
2. Add:
   - Name: `SCRAPER_API_KEY`
   - Value: Your API key from ScraperAPI
   - Environments: Production, Preview, Development

Or via CLI:
```bash
vercel env add SCRAPER_API_KEY
# Enter your API key
```

### Step 4: Integrate into Your App

**Create `src/scraperApi.js`:**
```javascript
/**
 * ScraperAPI Integration for IP Rotation on Vercel
 */

export async function fetchWithRotatingIP(targetUrl, options = {}) {
  const apiKey = process.env.SCRAPER_API_KEY;

  if (!apiKey) {
    throw new Error('SCRAPER_API_KEY not configured');
  }

  // ScraperAPI handles:
  // - Automatic IP rotation
  // - reCaptcha solving
  // - User-agent rotation
  // - Browser rendering

  const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}`;

  const response = await fetch(scraperUrl, {
    method: 'GET',
    headers: {
      'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  });

  if (!response.ok) {
    throw new Error(`ScraperAPI error: ${response.status}`);
  }

  return response.text();
}

// Optional: Use with different proxy locations
export async function fetchWithProxyLocation(targetUrl, country = 'US') {
  const apiKey = process.env.SCRAPER_API_KEY;

  if (!apiKey) {
    throw new Error('SCRAPER_API_KEY not configured');
  }

  // ScraperAPI geo-targeting
  const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&country_code=${country}`;

  const response = await fetch(scraperUrl);
  return response.text();
}
```

**Update `src/index.js` to use it:**
```javascript
import { fetchWithRotatingIP } from './scraperApi.js';

// Example: Proxy requests through ScraperAPI
fastify.get('/scrape', async (request, reply) => {
  try {
    const targetUrl = request.query.url;
    const content = await fetchWithRotatingIP(targetUrl);
    return reply.type('text/html').send(content);
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});
```

### Step 5: Deploy to Vercel

```bash
# Deploy
vercel --prod

# View logs
vercel logs

# Monitor usage
# Dashboard > ScraperAPI > Usage
```

---

## 📊 Free Tier Limits

| Service | Free Limit | Rotation | reCaptcha | Best For |
|---------|-----------|----------|-----------|----------|
| **ScraperAPI** | 1,000 req/mo | ✅ Yes | ✅ Built-in | ChatGPT, Claude, TikTok |
| **Bright Data** | 1GB/mo | ✅ Yes | ⚠️ Manual | General proxying |
| **ProtonVPN** | 3 servers | ⚠️ Limited | ❌ No | Not recommended |

---

## 💡 Tips for Free Tier

### Maximize Requests
```javascript
// Cache responses to reduce API calls
const cache = new Map();

export async function fetchCached(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const result = await fetchWithRotatingIP(url);
  cache.set(url, result);
  return result;
}
```

### Monitor Usage
ScraperAPI Dashboard shows:
- Requests used
- Bandwidth consumed
- Success rate
- Average response time

### Upgrade When Needed
- Pay-as-you-go after free tier
- $0.03-0.10 per successful request
- Perfect for small projects

---

## 🚀 Complete Vercel Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create `vercel.json`
```json
{
  "env": {
    "SCRAPER_API_KEY": "@scraper_api_key"
  }
}
```

### 3. Deploy
```bash
vercel --prod
```

### 4. Test
```bash
# Test the scraping endpoint
curl "https://your-app.vercel.app/scrape?url=https://ipinfo.io/json"
```

---

## 🔒 Security Notes

✅ **API key is safe:**
- Stored in Vercel environment variables
- Never exposed to client
- Only visible to deployed functions

✅ **Add rate limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute
});

fastify.use(limiter);
```

---

## 📈 Comparison: Local vs Vercel

| Feature | Local (Wireproxy) | Vercel (ScraperAPI) |
|---------|------------------|-------------------|
| Setup | Complex (5+ steps) | Simple (2 steps) |
| Free? | ✅ Yes (Mullvad) | ✅ Yes (1k req/mo) |
| IP Rotation | ✅ Excellent | ✅ Excellent |
| reCaptcha Bypass | ⚠️ Manual | ✅ Built-in |
| Latency | Low | Medium |
| Scalability | Limited | ✅ Unlimited |
| Maintenance | Ongoing | Zero |
| Best For | Development | Production |

---

## 🎯 Which Should You Choose?

### Use **Local Wireproxy** if:
- ✅ You want free, unlimited IPs
- ✅ You're developing locally
- ✅ You need maximum control
- ✅ You have a home server

### Use **Vercel + ScraperAPI** if:
- ✅ You need to deploy to production
- ✅ You want automatic reCaptcha bypass
- ✅ You prefer serverless (no maintenance)
- ✅ You have 1,000+ requests/month

---

## 📚 Quick Links

- **ScraperAPI**: https://www.scraperapi.com
- **Vercel Docs**: https://vercel.com/docs
- **Pricing**: https://www.scraperapi.com/pricing

---

Ready to deploy? Start with ScraperAPI free tier! 🚀
