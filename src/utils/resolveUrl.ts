import type { AppConfig, HealthLevel } from '../types';
import { iconProxyUrl } from '../services/api';
import { persistIconFromUrl } from './iconCache';
import { appUrls } from './urls';

export type ProbeMethod = 'icon' | 'http';

export interface UrlProbe {
  url: string;
  ok: boolean;
  method?: ProbeMethod;
  iconSrc?: string;
  status?: number;
  error?: string;
  ms: number;
}

export interface AppResolution {
  appId: string;
  resolvedUrl: string | null;
  method: ProbeMethod | null;
  iconSrc: string | null;
  probes: UrlProbe[];
  status: HealthLevel;
  lastChecked: string;
}

const ICON_TIMEOUT_MS = 2500;
const HTTP_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(onTimeout), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(onTimeout);
      },
    );
  });
}

function originOf(pageUrl: string): string | null {
  try {
    return new URL(pageUrl).origin;
  } catch {
    return null;
  }
}

export function iconCandidates(pageUrl: string, customIcon?: string): string[] {
  const origin = originOf(pageUrl);
  if (!origin) return [];
  const candidates: string[] = [];
  if (customIcon) {
    try {
      candidates.push(new URL(customIcon, pageUrl).href);
    } catch {
      candidates.push(customIcon);
    }
  }
  candidates.push(`${origin}/apple-touch-icon.png`, `${origin}/favicon.png`, `${origin}/favicon.ico`);
  return [...new Set(candidates)];
}

function probeImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (ok: boolean) => {
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.referrerPolicy = 'no-referrer';
    img.src = src;
  });
}

async function firstWorkingIcon(pageUrl: string, customIcon?: string): Promise<string | null> {
  const sources = iconCandidates(pageUrl, customIcon);
  const hits = await Promise.all(
    sources.map(async (src) => ((await withTimeout(probeImage(src), ICON_TIMEOUT_MS, false)) ? src : null)),
  );
  return hits.find((src) => Boolean(src)) ?? null;
}

async function httpStatus200(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch {
      response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      });
    }
    if (response.status === 200) return { ok: true, status: 200 };
    if (response.status === 405 || response.status === 501) {
      const getRes = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      return { ok: getRes.status === 200, status: getRes.status };
    }
    return { ok: false, status: response.status, error: `HTTP ${response.status}` };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return { ok: false, error: aborted ? 'timeout' : 'blocked or unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeUrl(url: string, customIcon?: string): Promise<UrlProbe> {
  const start = Date.now();
  const iconSrc = await firstWorkingIcon(url, customIcon);
  if (iconSrc) {
    return { url, ok: true, method: 'icon', iconSrc, ms: Date.now() - start };
  }
  const http = await httpStatus200(url);
  return {
    url,
    ok: http.ok,
    method: http.ok ? 'http' : undefined,
    status: http.status,
    error: http.error,
    ms: Date.now() - start,
  };
}

export async function resolveApp(app: AppConfig): Promise<AppResolution> {
  const urls = appUrls(app);
  const probes = await Promise.all(urls.map((url) => probeUrl(url, app.icon)));
  const iconHit = probes.find((probe) => probe.ok && probe.method === 'icon');
  const httpHit = probes.find((probe) => probe.ok && probe.method === 'http');
  const winner = iconHit ?? httpHit;
  const timedOut = probes.length > 0 && probes.every((probe) => probe.error === 'timeout');
  const pageUrl = winner?.url ?? urls[0] ?? null;
  const iconSrc = app.icon || winner?.iconSrc || null;
  if (pageUrl) {
    void persistIconFromUrl(app.id, iconProxyUrl(pageUrl));
  } else if (iconSrc) {
    void persistIconFromUrl(app.id, iconSrc);
  }
  return {
    appId: app.id,
    resolvedUrl: winner?.url ?? null,
    method: winner?.method ?? null,
    iconSrc,
    probes,
    status: winner ? 'healthy' : timedOut ? 'timeout' : urls.length ? 'unhealthy' : 'unknown',
    lastChecked: new Date().toISOString(),
  };
}

const CACHE_KEY = 'dashboard_url_resolution';

export function loadResolutionCache(): Record<string, AppResolution> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AppResolution>) : {};
  } catch {
    return {};
  }
}

export function saveResolutionCache(cache: Record<string, AppResolution>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota */
  }
}
