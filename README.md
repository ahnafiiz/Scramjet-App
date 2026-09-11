# Classroom

Classroom is a compact browser-style workspace for the Scramjet client runtime. The production app is intentionally client-side: Vercel serves static browser assets, while the browser connects to the configured public Wisp transport.

## Branches

- `main` is the stable production line.
- `BETA` contains the current redesign and new browser work.

Work on `BETA` first, preview it in Vercel, then merge only the changes you want into `main`.

## Local development

Requirements: Node.js 20.19+ and npm.

```powershell
git clone https://github.com/ahnafiiz/Scramjet-App.git
cd Scramjet-App
git switch BETA
npm install
npm run dev
```

Open the local address printed by Vite. Use `Ctrl+C` to stop the local preview.

## Checks before pushing

```powershell
npm test
npm run build
```

The build writes the deployable static site to `public/`. Vercel uses the repository build command and publishes that directory.

## Deploying the BETA branch on Vercel

1. Open the Vercel project settings.
2. Confirm the Git repository is `ahnafiiz/Scramjet-App`.
3. Create a preview deployment from the `BETA` branch, or set `BETA` as the preview branch.
4. Keep the build command as `npm run build` and the output directory as `public`.
5. Add the Supabase variables from `.env.example` only if the `/admin` control room is needed.

Use one stable production domain when testing saved sessions. Browser cookies, local storage, IndexedDB, service workers, and third-party login sessions belong to an origin; a new Vercel preview URL is a different origin and cannot inherit those sessions.

## Vercel feedback console message

If the browser console reports a failed request to `vercel.live/_next-live/feedback/feedback.js`, that request is Vercel's Preview Toolbar, not Classroom's browser runtime. Preview deployments enable the toolbar by default. To hide it for preview deployments, set this Vercel preview environment variable:

```text
VERCEL_PREVIEW_FEEDBACK_ENABLED=0
```

Redeploy after changing the variable. The toolbar can also be disabled from the Vercel team or project settings.

## Browser audit notes

- Address-bar and admin-login inputs have explicit `id` and `name` attributes.
- Classroom source does not call `eval`. If an eval warning remains, inspect the reported script URL first; Scramjet/libcurl or an injected preview tool may be the source. Do not add `unsafe-eval` blindly.
- Vercel responses already include `Cross-Origin-Resource-Policy: cross-origin`, which is required for the browser runtime's cross-origin assets. Changing it to `same-origin` can break Scramjet resources.

## UI and service links

- Global styling lives in `app/src/styles.css`.
- Browser behavior and controls live in `app/src/main.jsx`.
- Quick-link destinations and their service logos live in `app/src/config.js`.
- The real Classroom mark is `app/public/sj.png`; the existing favicon is `app/public/favicon.ico`.

Service logos are bundled in `app/public/brands/` so cross-origin isolation cannot block them. Change the `icon` and `color` values in `app/src/config.js` to customize a shortcut; keep the icon file inside that local folder.

## Admin route

There is no visible admin button. Open `/admin` directly and sign in with the Supabase admin account. The Supabase database migration and setup notes are in `supabase/SETUP.md`.

## Runtime troubleshooting

- A Wisp WebSocket failure means the selected public transport endpoint refused or dropped the connection. Refreshing may select the next configured endpoint; endpoint rotation is defined in the browser-side `public/config.js`.
- A service-worker error after a deployment can be caused by an old worker. Open the stable domain in a fresh tab and reload once so the current worker can take control.
- A third-party site may still show its own login or CAPTCHA. IP rotation does not guarantee that a site will trust the session or skip its anti-abuse checks.
