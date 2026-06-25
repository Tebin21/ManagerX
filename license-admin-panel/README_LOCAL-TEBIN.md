# License Admin Panel — Run Guide

A fully self-contained, local-only license admin tool. No Railway, no Vercel, no
Docker, no Nixpacks, no cloud database, no environment variables — everything it
needs comes from one file: `server/config.local.json`.

This guide assumes you've already cloned/downloaded the project and have Node.js
and npm installed.

## 1. Open the project

From the repo root:

```bash
cd license-admin-panel
```

All commands below are run from inside this `license-admin-panel/` folder.

## 2. Install dependencies

```bash
npm run install:all
```

This runs `npm install` twice — once for `server/` (the Express + TypeScript API)
and once for `client/` (the Vite + React frontend) — installing each app's
`node_modules` separately.

## 3. Create the local configuration

The server refuses to start without `server/config.local.json`. If it doesn't
already exist, create it from the provided template:

**macOS/Linux/Git Bash:**

```bash
cp server/config.local.json.example server/config.local.json
```

**Windows PowerShell:**

```powershell
Copy-Item server/config.local.json.example server/config.local.json
```

This file stores your local-only settings — the owner login password, the port
the backend listens on, and which frontend origin it accepts requests from. It's
gitignored (never committed), so each install needs its own copy. If the file
already exists, skip this step.

## 4. Start the development servers

```bash
npm run dev
```

This starts the backend and frontend together in one terminal, with labeled,
color-coded output (`[server]` / `[client]`).

## 5. Expected successful output

You should see something like this.

**Backend:**

```
License admin server listening on http://localhost:4000
Allowed origin: http://localhost:5173
```

**Frontend:**

```
VITE ready

Local: http://localhost:5173
```

## 6. Open the application

Open your browser to:

http://localhost:5173

The "ManagerX License Admin — Owner access only" login screen should appear.

## 7. Log in

Enter the **Owner Password** configured in `server/config.local.json`
(the `"adminPassword"` value) and click **Sign in**.

## Troubleshooting

### Port 4000 already in use

This means another backend instance is already running — usually a previous
`npm run dev` that wasn't fully stopped.

Find and stop it (Windows PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

Then run `npm run dev` again.

### Port 5173 already in use

This means another Vite instance is already running. Vite will try to fall back
to the next free port (e.g. 5174) automatically — but the backend only accepts
requests from the origin in `allowedOrigin` (`http://localhost:5173` by default),
so a frontend running on a different port won't be able to log in.

Stop the other Vite process the same way you'd stop the backend (find its PID on
port 5173, then `Stop-Process -Id <PID> -Force`), or simply close the terminal
running the old `npm run dev`, then restart the project.

### Cannot connect to backend

Check, in order:

1. Is the backend terminal line showing `listening on http://localhost:4000`?
2. Is the frontend terminal line showing `Local: http://localhost:5173`?
3. Do the ports actually match what's expected — backend on 4000, frontend on
   5173? (See the two issues above if not.)
4. Does `server/config.local.json` exist? If it's missing, the backend exits
   immediately with a clear error message — see Step 3.

### Wrong password

The login screen will show an error and reject incorrect passwords — this is
expected. Re-enter the password exactly as set in `server/config.local.json`.

## Final checklist

- ✅ Dependencies installed (`npm run install:all` completed)
- ✅ `server/config.local.json` exists
- ✅ `npm run dev` running
- ✅ Backend listening on port 4000
- ✅ Frontend listening on port 5173
- ✅ Login page opens at http://localhost:5173
- ✅ Owner password accepted

## Advanced: changing settings later

### How to change the password

Open `server/config.local.json` and edit `"adminPassword"`, then restart
`npm run dev` for the change to take effect (the server only reads this file
once, at startup).

### How to change the port

Edit `"port"` in `server/config.local.json`. If you change it, also update
`client/vite.config.ts`'s proxy target to match, and update `"allowedOrigin"`
if the frontend's own port ever changes too.

## How to access the admin panel day-to-day

1. Make sure `npm run dev` is running (see above).
2. Open `http://localhost:5173` in a browser.
3. Log in with the password from `server/config.local.json`.

You can then generate licenses, search/manage existing ones, revoke or expire
them, and browse customer history — all from the browser, no terminal commands
needed after the initial setup.
