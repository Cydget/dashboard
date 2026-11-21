import type { AppConfig } from '../types';

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export function parseUrlLines(text: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const line of text.split(/[\n,;]+/)) {
    const url = normalizeUrl(line);
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

export function appUrls(app: Pick<AppConfig, 'url' | 'urls'>): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const candidate of [...(app.urls ?? []), app.url ?? '']) {
    const url = normalizeUrl(candidate);
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

export function withUrls(app: AppConfig, urls: string[]): AppConfig {
  const next = urls.map(normalizeUrl).filter(Boolean);
  const unique = [...new Set(next)];
  return { ...app, urls: unique, url: unique[0] ?? '' };
}

export function normalizeApp(app: AppConfig): AppConfig {
  return withUrls(app, appUrls(app));
}
