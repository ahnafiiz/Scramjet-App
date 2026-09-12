# Classroom BETA architecture

## Runtime shape

```text
Browser
├─ React/Vite shell: app/
│  ├─ browser tabs, history, quick links, settings
│  ├─ /admin route and Supabase Auth session
│  ├─ /blocked route and weighted asset picker
│  └─ consent-first pseudonymous device protection
├─ Scramjet v1 assets: public/scram/
├─ BareMux/libcurl assets: public/baremux/ and public/libcurl/
├─ browser service worker: public/sw.js
└─ public Wisp endpoints selected in public/config.js

Vercel
├─ static output: public/
└─ serverless API routes: api/
   ├─ POST /api/ban/check
   └─ GET/PATCH /api/admin/devices

Supabase
├─ Auth: admin email/password users
└─ Postgres: anonymous device and session registry
```

## Source layout

- `app/index.html` is the Vite entrypoint.
- `app/src/main.jsx` contains the route shell and browser/admin screens.
- `app/src/styles.css` contains the responsive visual system and motion.
- `app/src/runtime/scramjet.js` is the v1 client runtime adapter.
- `app/src/lib/weightedRandom.js` owns rarity selection.
- `app/src/lib/deviceFingerprint.js` creates a consented, one-way device digest.
- `app/public/blocked/` contains the weighted blocked-screen artwork.
- `api/` contains server-only Supabase access; the service-role key never reaches the browser.
- `supabase/migrations/` contains the database schema.

## Deployment checklist

1. Create the Supabase project and run `supabase/migrations/20260910000000_device_protection.sql`.
2. Create the first Auth user, then add its UUID to `public.admin_users`.
3. Add the variables in `supabase/SETUP.md` to the BETA Preview environment in Vercel.
4. Deploy BETA. The build copies Scramjet assets, compiles the React shell, and emits to `public/`.
5. Open `/admin`, sign in, and verify a device appears after accepting protection consent in the browser.

## Privacy and shared networks

The browser does not send canvas pixels, hardware values, or a raw IP address.
After consent, it sends a randomly generated local installation ID. The API
hashes that ID and the request IP using `BAN_HASH_SALT`. IP is a risk and audit
signal, never the ban key. Two people on the same network therefore do not
share a ban unless their own device or session has been banned.
