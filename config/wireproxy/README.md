# Wireproxy Rotating IP Setup Guide

This directory contains WireGuard configurations for wireproxy-based IP rotation.

## Quick Start

### 1. Install Wireproxy

**Windows (PowerShell):**
```powershell
# Using Go
go install github.com/windtf/wireproxy/cmd/wireproxy@latest

# Or download pre-built binary from:
# https://github.com/windtf/wireproxy/releases
```

**macOS:**
```bash
brew install wireproxy
# or
go install github.com/windtf/wireproxy/cmd/wireproxy@latest
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install wireproxy

# Or
go install github.com/windtf/wireproxy/cmd/wireproxy@latest
```

### 2. Obtain WireGuard Credentials

Choose one of these VPN providers that support WireGuard:

#### Option A: Mullvad (FREE, Recommended)
1. Go to https://mullvad.net/en/account/#/wireguard-config/
2. Click "Generate new key" 
3. Copy the config details:
   - Private Key
   - Public Key
   - Address
4. Choose an endpoint location from the list

#### Option B: Proton VPN
1. Sign up at protonvpn.com
2. Go to Account Settings > Downloads > WireGuard Configuration
3. Download config file(s)
4. Extract Private Key, Public Key, etc.

#### Option C: NordVPN
1. Create account at nordvpn.com
2. Go to Account > Downloads > WireGuard
3. Select countries for IP rotation
4. Download configs

#### Option D: Other Providers
- IVPN
- PureVPN  
- ExpressVPN (some plans)
- AirVPN
- Any provider supporting WireGuard

### 3. Create Proxy Configuration Files

Create multiple `.conf` files in this directory for rotation:

**proxy1.conf:**
```ini
[Interface]
Address = 10.64.XX.XX/32
PrivateKey = XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=
DNS = 1.1.1.1

[Peer]
PublicKey = YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY=
Endpoint = 193.67.79.5:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Socks5]
BindAddress = 127.0.0.1:9001
```

**proxy2.conf:** (Different endpoint for rotation)
```ini
[Interface]
Address = 10.64.YY.YY/32
PrivateKey = ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ=
DNS = 1.1.1.1

[Peer]
PublicKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
Endpoint = 212.102.49.1:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Socks5]
BindAddress = 127.0.0.1:9002
```

**proxy3.conf:** (Another location)
```ini
[Interface]
Address = 10.64.ZZ.ZZ/32
PrivateKey = BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
DNS = 1.1.1.1

[Peer]
PublicKey = CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=
Endpoint = 185.218.125.1:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Socks5]
BindAddress = 127.0.0.1:9003
```

### 4. Test Individual Proxies

```bash
# Terminal 1: Start first proxy
wireproxy -c config/wireproxy/proxy1.conf

# Terminal 2: Start second proxy
wireproxy -c config/wireproxy/proxy2.conf

# Terminal 3: Test with curl
curl -x socks5://127.0.0.1:9001 https://ipinfo.io/json
curl -x socks5://127.0.0.1:9002 https://ipinfo.io/json
curl -x socks5://127.0.0.1:9003 https://ipinfo.io/json
```

You should see different IP addresses for each proxy!

### 5. Start Rotating Proxies (Automated)

The application will automatically start and manage the proxies:

```bash
npm start
# The proxyRotation.js module handles rotation automatically
```

Or manually start all proxies in background:

**Windows (PowerShell):**
```powershell
$configs = Get-ChildItem "config/wireproxy/*.conf"
$configs | ForEach-Object {
    Start-Process wireproxy -ArgumentList "-c", $_.FullName, "-d"
}
```

**Linux/macOS:**
```bash
for config in config/wireproxy/*.conf; do
    wireproxy -c "$config" -d &
done
```

## Configuration Options

Each proxy configuration has these main sections:

### [Interface]
- `Address`: Your IP in the VPN network (e.g., 10.64.1.1/32)
- `PrivateKey`: Your private WireGuard key
- `DNS`: DNS servers to use (optional)
- `ListenPort`: If you want to accept incoming connections

### [Peer]
- `PublicKey`: The VPN provider's public key
- `Endpoint`: VPN server address and port
- `AllowedIPs`: Networks to route (0.0.0.0/0 = all traffic)
- `PersistentKeepalive`: Keeps connection alive (set to 25 for better reliability)

### [Socks5]
- `BindAddress`: Where to expose the proxy (IP:port)
- `Username/Password`: Optional authentication
- `TunnelDomains`: Optional domain whitelist

### [http]
- Similar to Socks5 but HTTP instead of SOCKS5 protocol

## Integration with Scramjet

The proxy rotation is automatically integrated via `src/proxyRotation.js`:

```javascript
import { ProxyRotationManager } from './proxyRotation.js';

const proxyManager = new ProxyRotationManager({
    enabled: true,
    configPath: './config/wireproxy',
    rotationStrategy: 'round-robin', // or 'random', 'least-used'
    sessionTimeout: 3600000, // 1 hour per IP
});

await proxyManager.init();

// Get proxy for a session
const proxy = proxyManager.getProxyForSession(sessionId);
// Returns: { name: 'proxy1', id: 'proxy1', configPath: '...', port: 9001 }

// Record success/error for health tracking
proxyManager.recordSuccess('proxy1');
proxyManager.recordError('proxy1');
```

## Rotation Strategies

### Round-Robin (Default)
- Cycles through proxies in order
- Predictable, ensures even load
- Best for: General purpose

### Random
- Randomly selects a proxy
- Less predictable to external observers
- Best for: Avoiding detection of rotation pattern

### Least-Used
- Selects the proxy with fewest requests
- Balances load intelligently
- Best for: Optimizing throughput

## Health Monitoring

The system automatically:
- Tracks successful and failed requests per proxy
- Marks proxies unhealthy after 5+ failures
- Excludes unhealthy proxies from rotation
- Re-enables proxies when success rate recovers to >70%

Check health status:
```javascript
const stats = proxyManager.getStats();
console.log(stats);
// Output:
// {
//   proxy1: { usageCount: 45, healthy: true, successCount: 43, errorCount: 2 },
//   proxy2: { usageCount: 42, healthy: false, successCount: 30, errorCount: 12 }
// }
```

## Troubleshooting

### "Connection refused" error
- Make sure wireproxy is running: `ps aux | grep wireproxy`
- Verify port bindings: `lsof -i :9001` (on Linux/macOS)
- Check firewall settings

### Proxy returns 403/429 errors
- The target site may detect proxy usage
- Try using real residential proxies instead
- Add delays between requests
- Rotate user-agents and headers

### DNS issues
- Verify DNS settings in [Interface] section
- Try using 1.1.1.1 or 8.8.8.8
- Check that DNS is reachable from the VPN network

### WireGuard connection fails
- Verify Endpoint is correct and accessible
- Check that PublicKey and PrivateKey are valid
- Ensure Address is within the VPN provider's network range
- Try different endpoint locations

## Advanced: Multiple Accounts

For even better rotation, create accounts with different providers:

```
config/wireproxy/
├── mullvad-se.conf    (Mullvad - Sweden)
├── mullvad-de.conf    (Mullvad - Germany)
├── mullvad-us.conf    (Mullvad - USA)
├── proton-us.conf     (ProtonVPN - USA)
├── proton-nl.conf     (ProtonVPN - Netherlands)
└── nord-jp.conf       (NordVPN - Japan)
```

This gives you 6 different IPs rotating seamlessly!

## Performance Tips

1. **Reduce latency**: Choose VPN servers geographically closer to your targets
2. **Connection pooling**: Reuse connections within a session
3. **Caching**: Cache DNS results to reduce lookups
4. **Batch requests**: Group related requests to use same IP
5. **Monitor**: Check `proxyManager.getStats()` regularly

## Security Notes

⚠️ **Important:**
- Never commit actual private keys to git - use `.gitignore`
- Rotate WireGuard keys periodically
- Use strong VPN provider passwords
- Monitor for unusual activity on your VPN account
- Consider using disposable/rotating VPN accounts

## Legal Considerations

⚠️ **Legal Warning:**
- IP rotation must comply with website ToS
- Don't use for unauthorized access or scraping where prohibited
- Respect rate limits and robots.txt
- Use only legitimate VPN services
- Check local laws regarding VPN usage in your jurisdiction

## Support & Resources

- Wireproxy: https://github.com/windtf/wireproxy
- Mullvad VPN: https://mullvad.net
- WireGuard Protocol: https://www.wireguard.com
- reCAPTCHA prevention: https://anti-captcha.com
