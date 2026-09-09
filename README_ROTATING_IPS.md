# Scramjet App - Rotating IP Proxy Support

This is the demo application for Scramjet, a high-performance web proxy with built-in rotating IP support for bypassing reCaptcha and IP bans.

## 🆕 Rotating IP Features

### Local Development: Wireproxy + WireGuard
- Seamless IP rotation using multiple VPN connections
- Session-sticky IPs for consistency
- Automatic health monitoring
- Perfect for development/testing

### Production (Vercel): ScraperAPI
- Deploy serverless to Vercel
- Automatic IP rotation with reCaptcha bypass
- Free tier: 1,000 requests/month
- Zero maintenance

## 📖 Choose Your Path

### 🏠 Local Development
Perfect if you're running on **your machine, VPS, or Docker**.

- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup
- **[WIREPROXY_SETUP.md](./WIREPROXY_SETUP.md)** - Full guide
- **Tools**: Wireproxy + Mullvad/ProtonVPN (free)

### 🌐 Vercel Production Deployment
Perfect if you're using **Vercel's serverless platform**.

- **[VERCEL_QUICKSTART.md](./VERCEL_QUICKSTART.md)** - 3-minute setup
- **[VERCEL_FREE_PROXY_SETUP.md](./VERCEL_FREE_PROXY_SETUP.md)** - Full guide
- **Tools**: ScraperAPI free tier

## 🚀 Get Started in 5 Minutes

### 1. Install Wireproxy
```bash
go install github.com/windtf/wireproxy/cmd/wireproxy@latest
```

### 2. Run Setup Helper
```bash
node setup-proxy.js
```
Select option 1 to create proxy configurations with your VPN credentials.

### 3. Start App
```bash
npm start
```

### 4. Verify
```bash
curl http://localhost:8080/api/proxy-status
```

Done! Your app now rotates IPs automatically. 🎉

## 📖 API Endpoints

```bash
# Get proxy rotation status
GET /api/proxy-status
# Returns: enabled, activeProxies, activeSessions, statistics

# Health check
GET /api/health
# Returns: status, timestamp, proxyRotation enabled/disabled
```

## ⚙️ Configuration

Create `.env` file:
```env
PROXY_ROTATION_ENABLED=true
PROXY_ROTATION_STRATEGY=round-robin
PROXY_SESSION_TIMEOUT=3600000
```

See `.env.example` for all options.

## 🔐 VPN Providers

Recommended providers with WireGuard support:
- **Mullvad** (FREE) - Easy setup, many locations
- **ProtonVPN** - Privacy-focused
- **NordVPN** - Large network
- **IVPN** - Supports manual key management

## 🎯 API Endpoints

### Local (Wireproxy)
```bash
# Proxy rotation status
GET /api/proxy-status

# Health check
GET /api/health
```

### Vercel (ScraperAPI)
```bash
# Scrape with rotating IP
GET /api/scrape?url=https://example.com

# Check scraper status
GET /api/scraper-health

# Specify country
GET /api/scrape?url=https://example.com&country=DE

# With JavaScript rendering
GET /api/scrape?url=https://example.com&render=true
```

## 🛠️ Project Structure

```
Scramjet-App/
├── src/
│   ├── index.js                    # Main app
│   ├── proxyRotation.js            # Local IP rotation (wireproxy)
│   └── scraperApi.js               # Vercel IP rotation (ScraperAPI)
├── config/wireproxy/
│   ├── example.conf.template
│   └── README.md
├── QUICKSTART.md                   # Local setup (5 min)
├── VERCEL_QUICKSTART.md           # Vercel setup (3 min)
├── WIREPROXY_SETUP.md             # Local detailed guide
├── VERCEL_FREE_PROXY_SETUP.md     # Vercel detailed guide
├── setup-proxy.js                 # Interactive setup
└── .env.example
```

## 📚 Quick Links

| Path | Best For |
|------|----------|
| [QUICKSTART.md](./QUICKSTART.md) | Local development |
| [VERCEL_QUICKSTART.md](./VERCEL_QUICKSTART.md) | Vercel deployment |
| [WIREPROXY_SETUP.md](./WIREPROXY_SETUP.md) | Local advanced |
| [VERCEL_FREE_PROXY_SETUP.md](./VERCEL_FREE_PROXY_SETUP.md) | Vercel advanced |
| [config/wireproxy/](./config/wireproxy/README.md) | VPN config reference |

## 🎯 Use Cases

- ✅ **Bypass reCaptcha** - Rotate IPs automatically
- ✅ **ChatGPT/Claude Access** - Avoid IP limits
- ✅ **TikTok/Snapchat Scraping** - Multiple rotating IPs
- ✅ **GeforceNow Access** - Different IP per session
- ✅ **Avoid IP Bans** - Seamless rotation
- ✅ **Geo-Spoofing** - Access region content

## 🔧 Scripts

```bash
# Local: Start with wireproxy rotation
npm start

# Local: Interactive setup
node setup-proxy.js

# Vercel: Deploy with ScraperAPI
vercel --prod --env SCRAPER_API_KEY=key

# Code: Format & lint
npm run format
npm run lint
```

## ⚠️ Important

✅ **Completely Free:**
- Local: Mullvad (unlimited)
- Vercel: ScraperAPI (1,000 req/mo)

✅ **No Credit Card Required** for free tiers

✅ **reCaptcha Bypass** included in both

---

**Choose your path:**
- 🏠 Local? → [QUICKSTART.md](./QUICKSTART.md)
- 🌐 Vercel? → [VERCEL_QUICKSTART.md](./VERCEL_QUICKSTART.md)
