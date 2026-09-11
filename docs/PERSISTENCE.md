# Keeping browser logins between deployments

Deployments do not automatically erase browser storage. Browsers key cookies,
localStorage, IndexedDB, and service-worker registrations by **origin**:

```text
https://your-production-domain.example  ← persistent origin
https://scramjet-git-beta-123.vercel.app ← different origin
https://scramjet-abc123.vercel.app      ← another different origin
```

Opening a new Vercel deployment URL therefore looks like a new site. That is
why proxied services such as GeForce Now or Epic Games can ask for a new login.
Those cookies are protected by the browser and cannot be copied between origins
from application JavaScript.

## Recommended Vercel setup

1. Add a stable production domain under **Project → Settings → Domains**.
2. Point that domain at the BETA deployment while BETA is being tested.
3. Always open the browser through that stable domain, not the generated
   deployment URL.
4. In Vercel, keep BETA as the preview branch and use one stable branch alias
   for daily testing.
5. Do not use “Redeploy with a new URL” as the address users bookmark.

The app keeps its own settings under stable, versionless keys and never calls
`localStorage.clear()`, unregisters the service worker, or sends `Clear-Site-
Data`. This preserves Classroom-owned state and the proxy origin across normal
deployments. A fresh login is still expected after changing domains, clearing
site data, using a private window, or switching to a different deployment URL.
