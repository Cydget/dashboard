import express from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { loadTlsOptions } from './tls.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const settingsPath = path.join(dataDir, 'settings.json');
const iconDir = path.join(dataDir, 'icons');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(iconDir, { recursive: true });

const DEFAULT_SETTINGS = {
  apps: [],
  themeColor: '#1976d2',
  backgroundColor: '#1a1a2e',
  checkInterval: 30000,
  backendUrl: '',
  iconSize: 'medium',
};

function readSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function iconFileFor(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  return path.join(iconDir, `${hash}.bin`);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

function originOf(pageUrl) {
  try {
    return new URL(pageUrl).origin;
  } catch {
    return null;
  }
}

async function resolveFavicon(pageUrl) {
  const origin = originOf(pageUrl);
  if (!origin) throw new Error('invalid url');

  const candidates = [`${origin}/favicon.ico`, `${origin}/favicon.png`, `${origin}/apple-touch-icon.png`];
  try {
    const htmlRes = await fetchWithTimeout(pageUrl, {
      headers: { Accept: 'text/html' },
    });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const matches = [...html.matchAll(/<link[^>]+rel=["']([^"']*icon[^"']*)["'][^>]*>/gi)];
      for (const match of matches) {
        const href = match[0].match(/href=["']([^"']+)["']/i)?.[1];
        if (href) {
          candidates.unshift(new URL(href, pageUrl).href);
        }
      }
    }
  } catch {
    /* try direct favicon paths */
  }

  for (const candidate of candidates) {
    try {
      const res = await fetchWithTimeout(candidate, { headers: { Accept: 'image/*,*/*' } });
      if (!res.ok) continue;
      const type = res.headers.get('content-type') || 'application/octet-stream';
      if (type.includes('text/html')) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 16) continue;
      return { buf, type };
    } catch {
      continue;
    }
  }
  throw new Error('no favicon');
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/status', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/settings', (_req, res) => {
  res.json(readSettings());
});

app.post('/api/settings', (req, res) => {
  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const next = { ...DEFAULT_SETTINGS, ...incoming };
  writeSettings(next);
  res.json({ ok: true });
});

app.get('/api/cache-icon', async (req, res) => {
  const url = String(req.query.url || '');
  if (!url) return res.status(400).json({ error: 'url required' });
  const file = iconFileFor(url);
  const meta = `${file}.type`;
  if (fs.existsSync(file) && fs.existsSync(meta)) {
    res.setHeader('Content-Type', fs.readFileSync(meta, 'utf8'));
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.send(fs.readFileSync(file));
  }
  try {
    const icon = await resolveFavicon(url);
    fs.writeFileSync(file, icon.buf);
    fs.writeFileSync(meta, icon.type);
    res.setHeader('Content-Type', icon.type);
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.send(icon.buf);
  } catch (error) {
    res.status(404).json({ error: String(error.message || error) });
  }
});

app.get('/api/health', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = String(req.query.url || '');
  if (!url) return res.status(400).json({ ok: false, error: 'url required' });
  const start = Date.now();
  try {
    let response;
    try {
      response = await fetchWithTimeout(url, { method: 'HEAD' });
    } catch {
      response = await fetchWithTimeout(url, { method: 'GET' });
    }
    res.json({
      ok: true,
      status: response.status,
      ms: Date.now() - start,
    });
  } catch (error) {
    const timeout = error instanceof Error && error.name === 'AbortError';
    res.json({
      ok: false,
      error: timeout ? 'timeout' : String(error.message || error),
      ms: Date.now() - start,
    });
  }
});

const port = Number(process.env.PORT || 3001);
const httpsPort = Number(process.env.HTTPS_PORT || 3443);

http.createServer(app).listen(port, '0.0.0.0', () => {
  console.log(`Dashboard backend on http://0.0.0.0:${port}`);
});

const tls = loadTlsOptions();
if (tls) {
  https.createServer(tls, app).listen(httpsPort, '0.0.0.0', () => {
    console.log(`Dashboard backend on https://0.0.0.0:${httpsPort}`);
  });
} else {
  console.warn('TLS certs missing; HTTPS API not started. Run: npm run certs');
}
