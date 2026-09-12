# Classroom / Scramjet-App handoff

This file is for the next engineer or AI model continuing work on the repository. It records the intended architecture, current behavior, deployment rules, known limitations, and safe next steps.

## Current product

Classroom is a browser-style client shell built on Scramjet v1. The public site is a static Vercel deployment. Browsing traffic is initiated in the browser and uses public Wisp WebSocket endpoints from `public/config.js`; there is no Vercel proxy function that launches local executables.

The current UI work is on branch `BETA`. `main` is the stable line and must not be changed unless the owner explicitly asks for a merge. The browser document title is intentionally always `Home - Classroom`.

## Repository map

- `app/src/main.jsx` — React UI, routing, tabs, history, home screen, quick links, change log, settings, blocked screen, and admin dashboard.
- `app/src/styles.css` — responsive dark/light browser UI, fonts, icons, animations, admin styling, and reduced-motion rules.
- `app/src/config.js` — Google search configuration, quick links, change-log entries, and weighted blocked assets.
- `app/src/runtime/scramjet.js` — client-side Scramjet/bare-mux/libcurl transport setup.
- `app/src/lib/weightedRandom.js` — weighted blocked-asset selection.
- `app/src/lib/deviceFingerprint.js` — opt-in local installation ID and anonymous session identity.
- `app/src/api.js` — browser calls to access-check and admin API routes.
- `app/public/sj.png` — main Classroom mark.
- `app/public/favicon.ico` — existing favicon; keep it unless the owner requests a replacement.
- `app/public/brands/` — local service marks used by quick links. Keep these local; remote image URLs were blocked by the deployment's cross-origin isolation headers.
- `app/public/blocked/` — blocked-screen image assets copied into the Vercel output.
- `api/ban/check.js` — checks a submitted hashed device signal and records the anonymous session.
- `api/admin/devices.js` — authenticated admin device list and ban/restore endpoint.
- `api/_lib/supabase.js` — Supabase service-role helpers and admin authorization.
- `supabase/migrations/20260910000000_device_protection.sql` — device/session registry schema and RLS setup.
- `public/` — generated deployment output. Do not hand-edit it; `npm run build` recreates it from `app/public/` and the Vite app.
- `scripts/build-static.mjs` — copies Scramjet, libcurl, and bare-mux browser assets into `public/`.
- `vercel.json` — Vercel build/output settings, SPA rewrites, and cross-origin headers.

## Local workflow

```powershell
git switch BETA
npm install
npm test
npm run dev
```

Use `npm run build` before committing. It runs the server syntax check, copies static runtime assets, and builds the React app into `public/`.

The Vite build prints warnings for the four intentional classic scripts in `app/index.html` (`scramjet.all.js`, bare-mux, config, and service-worker registration). They are static browser scripts and must not be changed to ES modules without testing Scramjet startup. The build still succeeds.

## Blocked assets: adding, renaming, and weighting

Add images to `app/public/blocked/`. PNG, JPG, WEBP, and SVG are supported. The URL used by the app is `/blocked/<filename>` after the build.

Then add one object to `blockedAssets` in `app/src/config.js`:

```js
{
  name: "My custom block screen",
  src: "/blocked/my-custom-name.png",
  weight: 12,
  tier: "custom",
  alt: "Custom access restriction",
}
```

Weights are relative. They do not need to add up to 100; `70`, `25`, and `5` behave like 70%, 25%, and 5%. A positive weight is required. Rename the physical file and update `src` together. The selected object name and file are shown on the blocked page for debugging.

The selection function uses browser cryptographic randomness. Do not replace it with `Math.random()` or make the image choice server-side.

The home screen includes a compact workspace overview and a horizontally scrollable, expandable change log. Change-log copy is configured in `app/src/config.js` under `changeLog`.

## Identifying visitors in admin

The product deliberately does not identify real people. It can distinguish a returning anonymous device and its browser session:

- `D-XXXXXXXX` is a stable short device code derived from the server registry UUID.
- `S-XXXXXXXX` identifies the latest stored browser session for that device.
- `Guest ####` is the local fake session name.
- The admin table also shows last seen time and ban state.

The consented device identity is a random local installation ID, salted and hashed by the server. It is not derived from canvas, hardware, browser traits, or IP. An administrator can assign a household label (for example, `Alex — desk PC`) from the control room; this is the appropriate way to recognize a person/device without collecting an identity automatically. A shared network can contain many device codes; never use IP alone as a ban key.

If the owner needs human-readable labels, add an authenticated label-edit operation to `api/admin/devices.js` and a Supabase column update. Do not expose the fingerprint hash or service-role key to the browser.

## Persistence rules

Cookies, local storage, IndexedDB, service workers, and third-party login sessions are origin-bound. A Vercel preview URL is a different origin from the stable production domain, so GeForce Now, Epic, or other third-party logins cannot be migrated by this app. Test persistent login behavior on the same stable domain.

Do not add `localStorage.clear()`, broad cookie deletion, `Clear-Site-Data`, or automatic service-worker unregister logic. Those would intentionally destroy user state.

## Vercel and security messages

- `vercel.live/_next-live/feedback/feedback.js` is Vercel Preview Toolbar infrastructure, not Classroom. Disable it for previews with `VERCEL_PREVIEW_FEEDBACK_ENABLED=0` in Vercel Preview environment variables if the owner does not need preview comments.
- The repository already sends `Cross-Origin-Resource-Policy: cross-origin` because the client runtime loads cross-origin browser resources. Do not change this to `same-origin` without testing Scramjet, Wisp, fonts, and service-worker behavior.
- Do not add `unsafe-eval` to a Content Security Policy as a quick fix. The application source does not call `eval`; an eval warning usually comes from a third-party runtime, an injected preview tool, or a browser security policy. Identify the source before weakening CSP.
- Form inputs in the address bar and admin login have explicit `id` and `name` attributes for browser audits.

## Performance notes

The browser runtime exposes `prepare()` and the home screen warms Scramjet/controller assets shortly after first render. This removes most first-navigation setup time when a Wisp endpoint is healthy. It cannot make an unavailable Wisp server or a destination's own CAPTCHA respond faster.

Quick-link logos are bundled under `app/public/brands/` rather than loaded from a CDN. This prevents the fallback letters from appearing when COEP/CORP blocks a third-party image response.

## Admin and environment setup

The admin route is intentionally hidden from the UI. Open `/admin` directly. Supabase Auth handles login, and the first admin user must be inserted into `public.admin_users` as described in `supabase/SETUP.md`.

Required Vercel variables for admin/device protection are documented in `.env.example` and `supabase/SETUP.md`. Never commit `.env` files, Supabase service-role keys, or Wisp credentials.

## Known runtime limitations

- Public Wisp endpoints can refuse WebSockets, time out, or fail TLS handshakes. The browser-side endpoint rotation can try the next configured endpoint, but it cannot repair an unavailable third-party server.
- Some destinations reject proxied requests, require CAPTCHA, block automated traffic, or refuse iframe embedding. IP rotation does not guarantee a CAPTCHA-free session.
- Scramjet v1 is retained intentionally for compatibility with the current service-worker/controller setup. Upgrade only on a separate branch after testing service-worker registration, bare-mux SharedWorker startup, Wisp connection, link navigation, history, and stylesheets.

## Safe continuation checklist

1. Stay on `BETA`.
2. Read this file and `README.md` before changing deployment or privacy behavior.
3. Run `npm test` and `npm run build`.
4. Test dark mode, light mode, address search, quick-link menu, tabs, back/forward, reload, settings, `/blocked`, and `/admin`.
5. Check the browser console for new errors; distinguish Vercel Toolbar messages from app messages.
6. Review the diff, commit with a focused message, and push only `BETA`.
7. Merge to `main` only after the owner approves the preview.
