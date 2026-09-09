# Quick Start: Rotating IPs for Scramjet

**🎉 100% FREE** - No credit card required!

## 🚀 Start Here (5 Minutes)

### 1. Install Wireproxy

```bash
# Windows (PowerShell)
go install github.com/windtf/wireproxy/cmd/wireproxy@latest

# macOS
brew install wireproxy

# Linux
sudo apt-get install wireproxy  # or use Go
```

Don't have Go? Download pre-built binary: https://github.com/windtf/wireproxy/releases

### 2. Get VPN Credentials (2 Minutes)

**FREE Option: Mullvad**
1. Visit https://mullvad.net/en/account/#/wireguard-config/
2. Click "Generate new key"
3. Copy these values:
   - `Address`: e.g., `10.64.1.1/32`
   - `PrivateKey`: Your private key
   - Choose 3+ locations from table:
     - Sweden: `193.67.79.5:51820`
     - Germany: `212.102.49.1:51820`
     - Netherlands: `185.218.125.1:51820`
   - Public Key for each location: Look in Mullvad UI

### 3. Create Proxy Configs (2 Minutes)

Run the setup helper:
```bash
node setup-proxy.js
```

Select option 1 and enter the credentials from Mullvad.

Repeat 3 times for different locations to create:
- `config/wireproxy/proxy1.conf`
- `config/wireproxy/proxy2.conf`
- `config/wireproxy/proxy3.conf`

### 4. Test Proxies (1 Minute)

In Terminal 1:
```bash
wireproxy -c config/wireproxy/proxy1.conf
```

In Terminal 2:
```bash
curl -x socks5://127.0.0.1:9001 https://ipinfo.io/json
```

You should see your VPN's IP! ✅

### 5. Start App

In a new terminal:
```bash
npm start
```

Visit: http://localhost:8080

The app now has rotating IPs! 🎉

---

## 📊 Monitor Rotation

```bash
# Check proxy status
curl http://localhost:8080/api/proxy-status

# Check health
curl http://localhost:8080/api/health
```

---

## ⚙️ Configuration

Create `.env` file to customize:
```env
PROXY_ROTATION_ENABLED=true
PROXY_ROTATION_STRATEGY=round-robin  # or random, least-used
PROXY_SESSION_TIMEOUT=3600000        # 1 hour (in milliseconds)
PORT=8080
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| `wireproxy: command not found` | `go install github.com/windtf/wireproxy/cmd/wireproxy@latest` |
| Port 9001 refused | Start wireproxy first in separate terminal |
| No IP rotation | Verify proxies in `config/wireproxy/` folder |
| Slow performance | Use geographically closer VPN servers |

---

## 📚 Full Documentation

- **Detailed Setup**: See [WIREPROXY_SETUP.md](./WIREPROXY_SETUP.md)
- **Wireproxy Docs**: https://github.com/windtf/wireproxy
- **API Reference**: [config/wireproxy/README.md](./config/wireproxy/README.md)

---

## 💡 Tips

✅ Use 3-5 different proxy locations for best rotation
✅ Keep credentials in `config/wireproxy/` (add to `.gitignore`)
✅ Monitor `/api/proxy-status` endpoint
✅ Use `random` strategy to avoid detection patterns
✅ Combine with different user-agents for better results

---

## 🎯 Use Cases

- ✅ Bypass reCaptcha on ChatGPT, Claude, TikTok, Snapchat
- ✅ Access geo-restricted content
- ✅ Rotate through different VPN locations
- ✅ Avoid IP bans from repeated requests
- ✅ Test applications with multiple IPs

---

Ready to bypass reCaptcha? You're all set! 🚀

For issues or questions, see the full guide: [WIREPROXY_SETUP.md](./WIREPROXY_SETUP.md)
