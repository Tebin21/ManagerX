# License Admin Panel — Local Setup

A fully self-contained, local-only license admin tool. No Railway, no Vercel, no
Docker, no Nixpacks, no cloud database, no environment variables — everything it
needs comes from one file: `server/config.local.json`.

## How to install

```bash
cd license-admin-panel
npm run install:all
```

This installs dependencies for both `server/` and `client/`.

If `server/config.local.json` doesn't exist yet, create it from the template:

```bash
cp server/config.local.json.example server/config.local.json
```

Then open `server/config.local.json` and set a real password (see below). The server
will refuse to start with a clear error message if this file is missing or invalid.

## How to start the server

From `license-admin-panel/`:

```bash
npm run dev
```

This starts both the API server (`http://localhost:4000`) and the web app
(`http://localhost:5173`) together.

To run only the backend (e.g. for production-style testing of the compiled build):

```bash
cd server
npm install
npm run build
npm start
```

## How to change the password

Open `license-admin-panel/server/config.local.json` and edit `"adminPassword"`:

```json
{
  "adminPassword": "your-new-password",
  "port": 4000,
  "allowedOrigin": "http://localhost:5173"
}
```

Restart the server (`npm run dev` again, or `npm start` if running the built version)
for the change to take effect. No code changes needed — `src/config.ts` is what reads
this file, and `src/auth.ts` is what uses the resulting value to check logins.

## How to change the port

Edit `"port"` in `server/config.local.json`. If you change it, also update
`license-admin-panel/client/vite.config.ts`'s proxy target (`http://localhost:4000`)
to match the new port, and update `"allowedOrigin"` accordingly if the client's own
port ever changes too.

## How to access the admin panel

1. Make sure `npm run dev` is running (see above).
2. Open `http://localhost:5173` in a browser.
3. Log in with the password from `server/config.local.json`.

You can then generate licenses, search/manage existing ones, revoke or expire them,
and browse customer history — all from the browser, no terminal commands needed after
the initial setup.
