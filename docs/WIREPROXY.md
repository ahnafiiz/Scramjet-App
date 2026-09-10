# Wireproxy

Wireproxy turns a WireGuard connection into a local SOCKS5 proxy. This app can
start several wireproxy configurations, check that each local SOCKS listener is
ready, and send each Wisp browser connection through one selected listener.

## Install wireproxy

Install the `wireproxy` binary from the official project:
<https://github.com/windtf/wireproxy>.

Make sure `wireproxy --version` works in the same terminal where you run this
app. Or set `WIREPROXY_BINARY` in `.env` to the full binary path.

## Add configurations

Put one real wireproxy `.conf` file in `config/wireproxy/` for every WireGuard
endpoint you want to rotate between. Every file needs a unique local SOCKS
port.

```ini
[Interface]
Address = 10.0.0.2/32
PrivateKey = YOUR_PRIVATE_KEY
DNS = 1.1.1.1

[Peer]
PublicKey = PROVIDER_PUBLIC_KEY
Endpoint = provider.example:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25

[Socks5]
BindAddress = 127.0.0.1:9001
```

Do not commit private keys. The included example configurations are ignored by
the app and are safe to keep as reference files.

## Configure the app

Set these values in `.env`:

```ini
PROXY_ROTATION_ENABLED=true
WIREPROXY_AUTOSTART=true
PROXY_ROTATION_STRATEGY=round-robin
```

Set `WIREPROXY_AUTOSTART=false` when another service already runs the
wireproxy processes. The app will then use any ready SOCKS listeners it finds.

`round-robin` selects endpoints in order, `random` makes a random selection,
and `least-used` balances new browser connections across endpoints.

The app uses a direct connection when no local proxy is ready so it does not
hang. Set `WIREPROXY_REQUIRED=true` to block outbound browsing until a proxy is
ready instead.

## Check the status

Open `/api/proxy-status` while the app is running. It lists configured and
ready endpoints without exposing WireGuard keys.
