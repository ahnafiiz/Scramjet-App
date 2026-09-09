# Rotating IP - Two Deployment Options

You now have TWO ways to add rotating IPs to your Scramjet app. Pick the one that fits your needs!

## 🏠 Option 1: Local Development (Wireproxy + Mullvad)

**Best for:** Your machine, VPS, or Docker

### What You Need
- ✅ **Free**: Mullvad VPN (no credit card)
- ✅ **Free**: Wireproxy (open source)
- ✅ Unlimited IPs to rotate

### Quick Start
```bash
# 1. Install wireproxy
go install github.com/windtf/wireproxy/cmd/wireproxy@latest

# 2. Run setup
node setup-proxy.js

# 3. Start app
npm start

# 4. Check proxy status
curl http://localhost:8080/api/proxy-status
```

### Read
- **Fast start**: [QUICKSTART.md](./QUICKSTART.md) (5 min)
- **Full guide**: [WIREPROXY_SETUP.md](./WIREPROXY_SETUP.md)

### Pros
- ✅ Unlimited rotations
- ✅ Fully free
- ✅ No dependencies on external services
- ✅ Complete control

### Cons
- ❌ Only works locally/self-hosted
- ❌ Requires setup
- ❌ Need to manage WireGuard configs

---

## 🌐 Option 2: Vercel Deployment (ScraperAPI)

**Best for:** Serverless deployment to Vercel

### What You Need
- ✅ **Free**: ScraperAPI tier (1,000 req/month, no credit card)
- ✅ **Automatic**: IP rotation included
- ✅ **Built-in**: reCaptcha bypass

### Quick Start
```bash
# 1. Sign up (free)
# https://www.scraperapi.com

# 2. Deploy to Vercel
vercel --prod --env SCRAPER_API_KEY=your_api_key

# 3. Test
curl "https://your-app.vercel.app/api/scrape?url=https://ipinfo.io/json"
```

### Read
- **Fast start**: [VERCEL_QUICKSTART.md](./VERCEL_QUICKSTART.md) (3 min)
- **Full guide**: [VERCEL_FREE_PROXY_SETUP.md](./VERCEL_FREE_PROXY_SETUP.md)

### Pros
- ✅ One command deployment
- ✅ Zero maintenance
- ✅ Automatic reCaptcha solving
- ✅ Works worldwide
- ✅ No setup required

### Cons
- ❌ Limited free tier (1,000 req/month)
- ❌ Depends on external service
- ❌ Need API key management

---

## 📊 Comparison

| Feature | Wireproxy | ScraperAPI |
|---------|-----------|-----------|
| **Cost** | Free | Free (1k/mo) |
| **Setup Time** | 10 minutes | 2 minutes |
| **Rotation Limit** | Unlimited | 1,000/month |
| **reCaptcha Bypass** | Manual | Built-in ✅ |
| **Deployment** | Local/VPS | Vercel/Serverless |
| **Maintenance** | Ongoing | Zero |
| **Control** | Full | Limited |
| **Tech Skill** | Medium | Beginner |

---

## 🤔 Which Should I Use?

### Choose **Wireproxy** if:
- ✅ Running on your machine
- ✅ Using a VPS/home server
- ✅ Running in Docker locally
- ✅ Want unlimited rotations
- ✅ Need complete control

### Choose **ScraperAPI** if:
- ✅ Want to deploy to Vercel
- ✅ Want zero maintenance
- ✅ Want automatic reCaptcha bypass
- ✅ Don't need 1000+ requests/month
- ✅ Want easiest setup

---

## 🚀 Get Started Now

### Local? Click here:
👉 [QUICKSTART.md](./QUICKSTART.md)

### Vercel? Click here:
👉 [VERCEL_QUICKSTART.md](./VERCEL_QUICKSTART.md)

---

## 💡 Advanced: Use Both!

You can set up **both** configurations:

**Local Development:**
```bash
# Local testing with wireproxy
npm start
# Uses: config/wireproxy/*.conf
# API: /api/proxy-status
```

**Vercel Production:**
```bash
# Deploy with ScraperAPI
vercel --prod --env SCRAPER_API_KEY=key
# Uses: ScraperAPI endpoints
# API: /api/scrape
```

**Your app automatically detects which to use:**
```javascript
// In src/index.js
if (proxyManager.enabled) {
  // Local wireproxy is running
}

if (process.env.SCRAPER_API_KEY) {
  // ScraperAPI is configured
}
```

---

## 📋 Files You Now Have

```
Your App/
├── src/
│   ├── proxyRotation.js           # Wireproxy integration
│   ├── scraperApi.js              # ScraperAPI integration
│   └── index.js                   # Both configured
├── config/
│   └── wireproxy/
│       ├── example.conf.template
│       └── README.md
├── QUICKSTART.md                  # 5-min local setup
├── VERCEL_QUICKSTART.md          # 3-min Vercel setup
├── WIREPROXY_SETUP.md            # Full wireproxy guide
├── VERCEL_FREE_PROXY_SETUP.md    # Full ScraperAPI guide
├── setup-proxy.js                # Interactive setup
└── .env.example                  # Config template
```

---

## ❓ FAQ

**Q: Is Mullvad really FREE?**
A: Yes! Completely free, no credit card, no time limit. 100% free VPN.

**Q: Do I have to choose one?**
A: No! You can use both - local for development, Vercel for production.

**Q: Can I upgrade later?**
A: Yes! Both services have paid tiers if you need more:
- ScraperAPI: $29/mo (100k req) or $99/mo (unlimited)
- Wireproxy: Just add more VPN configs!

**Q: Which has better IP rotation?**
A: Wireproxy = more control, ScraperAPI = more automatic.

**Q: Can I use Proton instead of Mullvad?**
A: Yes! ProtonVPN also supports WireGuard. See WIREPROXY_SETUP.md.

---

## 🎯 Ready?

1. **Local?** → [QUICKSTART.md](./QUICKSTART.md)
2. **Vercel?** → [VERCEL_QUICKSTART.md](./VERCEL_QUICKSTART.md)

Both are FREE. Both work great. Pick one and get started! 🚀
