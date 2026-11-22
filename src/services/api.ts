import { getBackendUrl } from '../utils/localStorage';
import type { AppData, HealthStatus } from '../types';

function apiBase(): string {
  const configured = getBackendUrl().replace(/\/$/, '');
  return configured;
}

export async function apiUrl(path: string): Promise<string> {
  return `${apiBase()}${path}`;
}

export async function pingBackend(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBase()}/api/status`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function publishSettings(settings: AppData): Promise<boolean> {
  const response = await fetch(`${apiBase()}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return response.ok;
}

export async function getSettingsFromBackend(): Promise<AppData | null> {
  try {
    const response = await fetch(`${apiBase()}/api/settings`);
    if (response.ok) {
      return (await response.json()) as AppData;
    }
  } catch (error) {
    console.error('Failed to fetch settings from backend:', error);
  }
  return null;
}

export function iconProxyUrl(pageUrl: string): string {
  return `${apiBase()}/api/cache-icon?url=${encodeURIComponent(pageUrl)}`;
}

export async function checkAppHealth(url: string, timeoutMs = 5000): Promise<HealthStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const response = await fetch(
      `${apiBase()}/api/health?url=${encodeURIComponent(url)}`,
      { signal: controller.signal },
    );
    const responseTime = Date.now() - start;
    if (!response.ok) {
      return {
        url,
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        responseTime,
      };
    }
    const body = (await response.json()) as { ok: boolean; status?: number; error?: string };
    if (body.ok) {
      return {
        url,
        status: 'healthy',
        lastChecked: new Date().toISOString(),
        responseTime,
      };
    }
    return {
      url,
      status: body.error === 'timeout' ? 'timeout' : 'unhealthy',
      lastChecked: new Date().toISOString(),
      responseTime,
      error: body.error,
    };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      url,
      status: aborted ? 'timeout' : 'unhealthy',
      lastChecked: new Date().toISOString(),
      error: aborted ? 'timeout' : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
