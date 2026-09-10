# Getting Started

## Run the app

1. Open a terminal in the project folder.
2. Run `npm install` once.
3. Copy `.env.example` to `.env` when you want to change the defaults.
4. Run `npm start`.
5. Open `http://localhost:8080`.

The homepage is the browser. Health information is available at `/api/health`.

## Use the browser

- Use the plus button to open a tab.
- Use the left and right arrows for that tab's history.
- Use Quick links for the pre-set sites.
- Open Settings with the gear button to control the launch image and keyboard shortcut.

## Before deploying

Use HTTPS outside your local computer. The browser needs service workers, and
they are only available over HTTPS or on localhost.

Read [Wireproxy](WIREPROXY.md) before enabling IP rotation.
