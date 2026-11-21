# Dashboard PWA

Phone-style app drawer for links to local sites (usually `IP:port`). It is a progressive web app: layout is saved on the device, can be exported or published to the backend, and each client picks which of an app’s URLs actually work from *that* device.

## Requirements

- Node.js 20+
- npm
- OpenSSL (for HTTPS certificates)

## Install

```bash
git clone <repo-url> dashboard
cd dashboard
npm install
```

## Setup

1. Generate a self-signed certificate (also happens automatically on `npm run dev` / `npm run preview` if `certs/` is missing):

   ```bash
   npm run certs
   ```

   The cert includes `localhost`, `127.0.0.1`, and addresses on this machine. If clients use another IP or hostname, add it and regenerate:

   ```bash
   DASHBOARD_TLS_HOSTS=192.168.137.1,dashboard.local npm run certs
   ```

2. Browsers will warn on the self-signed cert. Accept it once (**Advanced → Proceed**) on each device. PWA install needs HTTPS (or `localhost`).

3. Optional: copy `data/settings.json` from another host, or add apps in the Settings UI and use **Publish as default**.

## Run

Start the API, then the UI (two terminals):

```bash
npm run server
npm run dev
```

| Service | URL |
| --- | --- |
| UI (HTTPS) | https://localhost:8082/ |
| UI on LAN | https://\<this-host-ip\>:8082/ |
| API (HTTP, used by the Vite proxy) | http://127.0.0.1:3001 |
| API (HTTPS) | https://localhost:3443 |

Leave **Backend URL** blank in Settings so the UI calls same-origin `/api` (proxied to port 3001).

### Production-style preview

```bash
npm run build
npm run server
npm run preview
```

Preview also listens on **https://0.0.0.0:8082** and proxies `/api` to 3001.

Ports can be overridden:

```bash
PORT=3001 HTTPS_PORT=3443 npm run server
```

## Install as a PWA

1. Open **https://localhost:8082/** (this machine) or **https://\<host-ip\>:8082/** (phone / other PC) and trust the certificate.
2. Wait a few seconds for the service worker.
3. **Chrome / Edge:** install icon in the address bar, or menu → **Install app**.
4. **Android Chrome:** menu → **Add to Home screen / Install app**.
5. **iOS Safari:** Share → **Add to Home Screen**.

HTTP on a LAN IP is not a secure origin; use HTTPS if you want the install prompt.

## Using the dashboard

- **Add apps** in Settings. Multiple URLs go one per line, for example:

  ```
  127.0.0.1:8989
  192.168.137.1:8989
  ```

  This device tries favicon load first, then HTTP 200, and opens the first URL that works.

- **Export / Import JSON** copies layout between browsers. **Publish as default** writes it to the backend for other clients to pull.
- Unreachable apps are grayed out. Health lists which URL this device selected.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run certs` | Create/replace `certs/key.pem` and `certs/cert.pem` |
| `npm run server` | API on 3001 (HTTP) and 3443 (HTTPS) |
| `npm run dev` | HTTPS Vite UI on 8082 |
| `npm run build` | Production bundle in `dist/` |
| `npm run preview` | Serve `dist/` on HTTPS 8082 |
