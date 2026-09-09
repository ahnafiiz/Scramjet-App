# Rotating IP Setup Guide - Wireproxy Integration

This guide walks you through setting up rotating IPs using wireproxy to bypass Google reCaptcha and other anti-bot measures on services like ChatGPT, Claude, TikTok, Snapchat, and GeforceNow.

**🎉 Completely FREE!** Using Mullvad VPN (no credit card required)

**📌 Deploying to Vercel?** See [VERCEL_FREE_PROXY_SETUP.md](./VERCEL_FREE_PROXY_SETUP.md) instead

## Overview

The system uses:
- **Wireproxy**: Userspace WireGuard client that exposes SOCKS5/HTTP proxies
- **Multiple VPN peers**: Different IP addresses for rotation
- **Session-sticky rotation**: Same IP per session, rotates between sessions
- **Automatic health tracking**: Removes unhealthy proxies automatically

## Prerequisites

- Node.js 16+ (for Scramjet app)
- Go 1.21+ (to build/install wireproxy)
- A VPN provider with WireGuard support

## Step 1: Install Wireproxy

### Windows (Recommended: Use Go)

```powershell
# Install Go from https://golang.org/dl if not already installed

# Install wireproxy
go install github.com/windtf/wireproxy/cmd/wireproxy@latest

# Add to PATH if needed - the binary will be at:
# $env:GOPATH\bin\wireproxy.exe (usually C:\Users\YourUsername\go\bin\)

# Verify installation
wireproxy --version
```

**Alternative: Download Pre-built Binary**
1. Go to https://github.com/windtf/wireproxy/releases
2. Download `wireproxy_windows_amd64.exe`
3. Rename to `wireproxy.exe`
4. Add to PATH or keep in project directory

### macOS

```bash
# Using Homebrew
brew install wireproxy

# Or using Go
go install github.com/windtf/wireproxy/cmd/wireproxy@latest

# Verify
wireproxy --version
```

### Linux

```bash
# Ubuntu/Debian (if available)
sudo apt-get install wireproxy

# Or using Go
go install github.com/windtf/wireproxy/cmd/wireproxy@latest

# Verify
wireproxy --version
```

## Step 2: Choose and Set Up VPN Provider

### Option A: Mullvad VPN (FREE - Recommended for Beginners)

**Why Mullvad?**
- ✅ **Completely FREE** - No payment required, ever
- ✅ No account needed
- ✅ No credit card required
- ✅ Excellent WireGuard support
- ✅ Can rotate through 80+ locations
- ✅ Privacy-focused
- ✅ Easy to set up

**Setup Steps:**

1. Visit https://mullvad.net/en/account/#/wireguard-config/
2. Click "Generate new key"
3. You'll see a screen with your credentials

4. Create `config/wireproxy/proxy1.conf`:
```ini
[Interface]
Address = 10.64.XX.XX/32
PrivateKey = [Copy from Mullvad]
DNS = 1.1.1.1

[Peer]
PublicKey = [Mullvad Sweden key - see table below]
Endpoint = 193.67.79.5:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Socks5]
BindAddress = 127.0.0.1:9001
```

5. Repeat for different Mullvad locations to create proxy2.conf, proxy3.conf, etc.

**Mullvad Endpoints (Sample):**
```
Sweden (Gothenburg):     193.67.79.5:51820
Germany (Berlin):        212.102.49.1:51820
Netherlands (Amsterdam): 185.218.125.1:51820
France (Paris):          193.32.127.1:51820
UK (Manchester):         185.194.16.1:51820
US (New York):           45.33.97.1:51820
US (Chicago):            45.76.118.1:51820
Japan (Tokyo):           103.245.75.132:51820
Singapore:               103.245.75.132:51820
Australia (Sydney):      203.0.113.1:51820
```

See full list at: https://mullvad.net/en/servers

### Option B: Proton VPN

1. Create account at protonvpn.com (free or paid)
2. Download WireGuard config files from Account > Downloads
3. Extract credentials and create proxy configs

### Option C: NordVPN

1. Create account at nordvpn.com
2. Go to Account > Downloads > WireGuard
3. Select countries for rotation
4. Download configs for each

### Option D: Multiple Providers

Mix and match providers for even better rotation:

```
config/wireproxy/
├── mullvad-se.conf   (Mullvad Sweden)
├── mullvad-us.conf   (Mullvad USA)
├── proton-nl.conf    (ProtonVPN Netherlands)
└── nord-jp.conf      (NordVPN Japan)
```

## Step 3: Create Proxy Configuration Files

You need at least 2-3 configs for effective rotation. More is better.

### Create `config/wireproxy/proxy1.conf`:
```ini
[Interface]
Address = 10.64.1.1/32
PrivateKey = aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsT=
DNS = 1.1.1.1

[Peer]
PublicKey = <MULLVAD_PUBLIC_KEY_HERE>
Endpoint = 193.67.79.5:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Socks5]
BindAddress = 127.0.0.1:9001
```

### Create `config/wireproxy/proxy2.conf`:
```ini
[Interface]
Address = 10.64.2.2/32
PrivateKey = xXyYzZaaBBccDDeEfFgGhHiIjJkKlLmMnNoO=
DNS = 1.1.1.1

[Peer]
PublicKey = <MULLVAD_PUBLIC_KEY_HERE>
Endpoint = 212.102.49.1:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Socks5]
BindAddress = 127.0.0.1:9002
```

### Create `config/wireproxy/proxy3.conf`:
```ini
[Interface]
Address = 10.64.3.3/32
PrivateKey = qQrRsStTuUvVwWxXyYzZaAbBcCdDeEfFgGhI=
DNS = 1.1.1.1

[Peer]
PublicKey = <MULLVAD_PUBLIC_KEY_HERE>
Endpoint = 185.218.125.1:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Socks5]
BindAddress = 127.0.0.1:9003
```

## Step 4: Test Wireproxy Manually

Before running the full app, test individual proxies:

### Terminal 1: Start first proxy
```powershell
# Windows
wireproxy -c config/wireproxy/proxy1.conf

# Linux/macOS
wireproxy -c config/wireproxy/proxy1.conf
```

### Terminal 2: Start second proxy
```powershell
wireproxy -c config/wireproxy/proxy2.conf
```

### Terminal 3: Test proxies
```powershell
# Install curl if needed
# choco install curl (Windows)
# or use Windows built-in curl

# Test proxy 1
curl -x socks5://127.0.0.1:9001 https://ipinfo.io/json

# Test proxy 2
curl -x socks5://127.0.0.1:9002 https://ipinfo.io/json

# Test proxy 3
curl -x socks5://127.0.0.1:9003 https://ipinfo.io/json
```

You should see different IP addresses for each! ✅

## Step 5: Run Scramjet App with Proxy Rotation

### Option A: Automatic (Recommended)

```powershell
npm start
```

The app will automatically:
- Discover proxy configs in `config/wireproxy/`
- Start managing them
- Rotate IPs per session for all target domains

### Option B: Manual Proxy Management

Start proxies in separate terminals, then start the app:

```powershell
# Terminal 1
wireproxy -c config/wireproxy/proxy1.conf -d

# Terminal 2
wireproxy -c config/wireproxy/proxy2.conf -d

# Terminal 3
wireproxy -c config/wireproxy/proxy3.conf -d

# Terminal 4
npm start
```

## Step 6: Configure Environment Variables (Optional)

Create a `.env` file:
```env
# Enable/disable proxy rotation
PROXY_ROTATION_ENABLED=true

# Path to proxy configs
PROXY_CONFIG_PATH=./config/wireproxy

# Rotation strategy: round-robin, random, least-used
PROXY_ROTATION_STRATEGY=round-robin

# Session timeout (ms) - how long IP stays sticky
PROXY_SESSION_TIMEOUT=3600000

# App port
PORT=8080
```

Load with `.env` file:
```powershell
# PowerShell
$env:PROXY_ROTATION_ENABLED = "true"
npm start

# Or use dotenv package (optional install)
npm install --save-dev dotenv
```

## Step 7: Monitor Proxy Status

The app exposes health endpoints:

```bash
# Check proxy rotation status
curl http://localhost:8080/api/proxy-status

# Expected response:
# {
#   "enabled": true,
#   "activeProxies": 3,
#   "activeSessions": 5,
#   "rotationStrategy": "round-robin",
#   "statistics": {
#     "proxy1": {
#       "usageCount": 45,
#       "healthy": true,
#       "successCount": 43,
#       "errorCount": 2
#     },
#     "proxy2": {
#       "usageCount": 42,
#       "healthy": true,
#       "successCount": 42,
#       "errorCount": 0
#     }
#   }
# }

# Check general health
curl http://localhost:8080/api/health
```

## How IP Rotation Works for reCaptcha Avoidance

### Without Rotation:
```
Request 1 → IP 203.0.113.1 → Google detects repeat IP
Request 2 → IP 203.0.113.1 → Google flags as suspicious
Request 3 → IP 203.0.113.1 → reCaptcha triggered! ❌
```

### With Rotation:
```
Session 1 (User A) → IP 193.67.79.5  → Normal request ✅
Session 2 (User B) → IP 212.102.49.1 → Different IP ✅
Session 3 (User C) → IP 185.218.125.1 → Different IP ✅
```

### Key Points:
- **Per-session rotation**: Same user/session maintains same IP (sticky)
- **Different sessions get different IPs**: Looks like different users
- **Automatic health tracking**: Bad proxies removed automatically
- **Transparent to application**: Handled automatically

## Supported Target Domains

Automatically rotated for:
- ✅ ChatGPT (openai.com)
- ✅ Claude (claude.ai, anthropic.com)
- ✅ GeforceNow (nvidia.com, play.geforcenow.com)
- ✅ TikTok (tiktok.com, vm.tiktok.com)
- ✅ Snapchat (snap.com, snapchat.com)
- ✅ Instagram (instagram.com)
- ✅ Facebook (facebook.com)
- ✅ Twitter/X (twitter.com, x.com)
- ✅ Discord (discord.com)
- ✅ Google (google.com, recaptcha.net)
- ✅ And all other domains by default

## Troubleshooting

### Issue: "wireproxy command not found"

**Solution:**
```powershell
# Check if installed
go list -m all | grep wireproxy

# Reinstall
go install github.com/windtf/wireproxy/cmd/wireproxy@latest

# Verify Go binary path
echo $env:GOPATH
# Add to PATH: C:\Users\YourUsername\go\bin
```

### Issue: "Connection refused" on localhost:9001

**Solutions:**
1. Make sure wireproxy is running:
   ```powershell
   Get-Process wireproxy  # Should show wireproxy process
   ```

2. Check port is listening:
   ```powershell
   netstat -an | Select-String ":900"  # Should show ports 9001, 9002, etc.
   ```

3. Check firewall isn't blocking:
   ```powershell
   # Windows Defender may block local ports
   # Try disabling temporarily for testing
   ```

### Issue: "No proxy configurations found"

**Solution:**
```powershell
# Make sure config directory and files exist
ls config/wireproxy/*.conf

# Should show: proxy1.conf, proxy2.conf, proxy3.conf, etc.

# If not, create them with proper WireGuard credentials
```

### Issue: Proxy returns 403/429 errors

**Causes:**
- Target site blocks VPN IPs
- Proxy rotating too fast (aggressive rate limiting)
- Need residential proxy instead of VPN

**Solutions:**
1. Use residential proxy services instead:
   - Bright Data
   - Oxylabs
   - SmartProxy
   - ISP proxies

2. Add delays between requests:
   ```javascript
   // In your request code
   await new Promise(r => setTimeout(r, 2000)); // 2 second delay
   ```

3. Rotate user-agents and headers:
   ```javascript
   // Vary headers per request to seem more like real browser
   headers: {
     'User-Agent': randomUserAgent(),
     'Accept-Language': randomLanguage(),
   }
   ```

### Issue: DNS resolution fails

**Solution:**
- Update DNS in proxy config:
```ini
[Interface]
DNS = 8.8.8.8
# Or try:
DNS = 1.1.1.1
# Or:
DNS = 208.67.222.222
```

### Issue: High latency through proxy

**Solutions:**
1. Choose closer geographic locations:
   ```
   Instead of: Japan from USA
   Choose: US East Coast proxy
   ```

2. Reduce rotation frequency:
   ```env
   PROXY_SESSION_TIMEOUT=7200000  # 2 hours instead of 1
   ```

## Performance Optimization

### For ChatGPT/Claude:
```env
PROXY_ROTATION_STRATEGY=least-used
PROXY_SESSION_TIMEOUT=1800000  # 30 minutes
```

### For TikTok/Snapchat:
```env
PROXY_ROTATION_STRATEGY=random
PROXY_SESSION_TIMEOUT=600000  # 10 minutes
```

### For GeforceNow:
```env
PROXY_ROTATION_STRATEGY=round-robin
PROXY_SESSION_TIMEOUT=3600000  # 1 hour (sticky!)
```

## Advanced: Using with Your Own VPN Servers

If you have WireGuard servers:

1. Generate WireGuard keys:
   ```bash
   wg genkey | tee privatekey | wg pubkey > publickey
   ```

2. Configure in your proxy config:
   ```ini
   [Interface]
   Address = 10.200.200.2/32
   PrivateKey = <YOUR_KEY>
   DNS = <YOUR_DNS>

   [Peer]
   PublicKey = <SERVER_KEY>
   Endpoint = your-server.com:51820
   AllowedIPs = 0.0.0.0/0
   PersistentKeepalive = 25

   [Socks5]
   BindAddress = 127.0.0.1:9001
   ```

## Security Considerations

⚠️ **Never commit secrets to git:**
```bash
# Create .gitignore
echo "config/wireproxy/*.conf" >> .gitignore
echo ".env" >> .gitignore
echo "config/wireproxy/**" >> .gitignore
```

⚠️ **Use strong VPN credentials:**
- Don't reuse passwords
- Rotate keys periodically
- Monitor account for suspicious activity

⚠️ **Respect legal boundaries:**
- Only use for legitimate purposes
- Comply with website Terms of Service
- Don't use for unauthorized scraping
- Check local VPN regulations

## Support & Resources

- **Wireproxy GitHub**: https://github.com/windtf/wireproxy
- **WireGuard Protocol**: https://www.wireguard.com
- **Mullvad VPN**: https://mullvad.net
- **reCAPTCHA Documentation**: https://developers.google.com/recaptcha

## Next Steps

1. ✅ Install wireproxy
2. ✅ Set up VPN provider accounts
3. ✅ Create proxy config files
4. ✅ Test individual proxies
5. ✅ Start Scramjet app
6. ✅ Monitor proxy status
7. ✅ Access your app at http://localhost:8080

That's it! Your rotating IP system is ready. 🚀
