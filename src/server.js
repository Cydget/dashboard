import express from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { loadTlsOptions } from './tls.js';

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

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
  const hash = crypto.createHash('sha1').update(`v2:${url}`).digest('hex');
  return path.join(iconDir, `${hash}.v2.bin`);
}

function normalizePageUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

function originOf(pageUrl) {
  try {
    return new URL(normalizePageUrl(pageUrl)).origin;
  } catch {
    return null;
  }
}

function parseSizesAttr(sizes) {
  if (!sizes) return 0;
  if (sizes.trim().toLowerCase() === 'any') return 512;
  let max = 0;
  for (const part of sizes.split(/\s+/)) {
    const match = part.match(/(\d+)\s*x\s*(\d+)/i);
    if (match) max = Math.max(max, Number(match[1]), Number(match[2]));
  }
  return max;
}

function imagePixelSize(buf, type) {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return buf.readUInt32BE(16);
  }
  if (buf.length >= 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return buf.readUInt16LE(6);
  }
  if (buf.length >= 6 && buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1) {
    const count = buf.readUInt16LE(4);
    let max = 0;
    for (let i = 0; i < count; i += 1) {
      const offset = 6 + i * 16;
      if (offset + 1 >= buf.length) break;
      max = Math.max(max, buf[offset] || 256);
    }
    return max;
  }
  const head = buf.subarray(0, Math.min(buf.length, 256)).toString('utf8');
  if ((type && type.includes('svg')) || /<svg[\s>]/i.test(head)) return 512;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      const size = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return buf.readUInt16BE(i + 7);
      }
      i += 2 + size;
    }
  }
  return 0;
}

function addCandidate(list, href, baseUrl, hintedSize = 0) {
  if (!href) return;
  try {
    const url = new URL(href, baseUrl).href;
    const existing = list.find((item) => item.url === url);
    if (existing) {
      existing.size = Math.max(existing.size, hintedSize);
      return;
    }
    list.push({ url, size: hintedSize });
  } catch {
    /* ignore invalid href */
  }
}

async function iconsFromManifest(manifestHref, pageUrl) {
  try {
    const manifestUrl = new URL(manifestHref, pageUrl).href;
    const res = await fetchWithTimeout(manifestUrl, {
      headers: { Accept: 'application/manifest+json,application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const icons = Array.isArray(data?.icons) ? data.icons : [];
    return icons
      .map((icon) => {
        if (!icon?.src) return null;
        try {
          return { url: new URL(icon.src, manifestUrl).href, size: parseSizesAttr(icon.sizes) };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchIconCandidate(candidate) {
  const res = await fetchWithTimeout(candidate.url, { headers: { Accept: 'image/*,*/*' } }, 2500);
  if (!res.ok) return null;
  const type = res.headers.get('content-type') || 'application/octet-stream';
  if (type.includes('text/html') || type.includes('application/json')) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 16) return null;
  const pixels = imagePixelSize(buf, type) || candidate.size || (buf.length > 4000 ? 128 : 16);
  return { buf, type, pixels };
}

async function resolveFavicon(pageUrl) {
  const normalized = normalizePageUrl(pageUrl);
  const origin = originOf(normalized);
  if (!origin) throw new Error('invalid url');

  const candidates = [];
  addCandidate(candidates, `${origin}/favicon.ico`, origin, 16);
  addCandidate(candidates, `${origin}/favicon.png`, origin, 64);
  addCandidate(candidates, `${origin}/apple-touch-icon.png`, origin, 180);

  try {
    const htmlRes = await fetchWithTimeout(normalized, {
      headers: { Accept: 'text/html' },
    }, 2500);
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
      const manifestHrefs = [];
      for (const tag of links) {
        const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
        const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
        const sizes = parseSizesAttr(tag.match(/\bsizes=["']([^"']+)["']/i)?.[1]);
        if (!href) continue;
        if (rel.split(/\s+/).includes('manifest')) {
          manifestHrefs.push(href);
        }
        if (rel.includes('icon')) {
          const boost = rel.includes('apple-touch') ? 180 : 0;
          addCandidate(candidates, href, normalized, Math.max(sizes, boost));
        }
      }
      for (const href of manifestHrefs.slice(0, 1)) {
        const fromManifest = await iconsFromManifest(href, normalized);
        for (const icon of fromManifest) addCandidate(candidates, icon.url, normalized, icon.size);
      }
    }
  } catch {
    /* favicon.ico / apple-touch still tried below */
  }

  candidates.sort((a, b) => b.size - a.size);
  const unique = candidates.slice(0, 8);
  const results = await Promise.all(unique.map((candidate) => fetchIconCandidate(candidate).catch(() => null)));
  const best = results.reduce((winner, item) => {
    if (!item) return winner;
    if (!winner) return item;
    if (item.pixels > winner.pixels) return item;
    if (item.pixels === winner.pixels && item.buf.length > winner.buf.length) return item;
    return winner;
  }, null);
  if (!best) throw new Error('no favicon');
  return best;
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
  const url = normalizePageUrl(req.query.url || '');
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
