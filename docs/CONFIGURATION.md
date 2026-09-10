# Configuration

## Browser settings

Open the gear button in the browser to change these settings:

- **Show blocked image on launch** controls whether `public/blocked.png` opens
  above the browser.
- **Enable keyboard unlock shortcut** controls whether the keyboard sequence
  can close that image.

Both settings are off by default. They are saved in this browser only, so a
different browser profile can use different settings.

The blocked image always has an Open browser button. It is a launch screen, not
a security boundary.

## Quick links

Edit `public/config.js` to change the names or addresses in the Quick links
menu. Each entry has a `label` and `url`.

```js
{ label: "Example", url: "https://example.com/" }
```

Reload the page after editing that file.

## Server settings

Use `.env` for port and wireproxy settings. Start from `.env.example`; it
contains the supported names and safe defaults.
