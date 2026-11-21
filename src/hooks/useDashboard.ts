import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppConfig, AppData } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { loadSettings, saveSettings, importSettingsJson } from '../utils/localStorage';
import { getSettingsFromBackend, publishSettings } from '../services/api';
import { useHealthCheck } from './useHealthCheck';
import { usePwaStatus } from './usePwaStatus';
import { normalizeApp, withUrls } from '../utils/urls';

function newId(): string {
  return crypto.randomUUID();
}

export function useDashboard() {
  const [settings, setSettings] = useState<AppData>(() => loadSettings());
  const [message, setMessage] = useState<string | null>(null);
  const pwa = usePwaStatus();
  const { resolutions, lastPingTime } = useHealthCheck(settings.apps, settings.checkInterval);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!pwa.backendConnected) return;
    let cancelled = false;
    (async () => {
      const remote = await getSettingsFromBackend();
      if (cancelled || !remote) return;
      setSettings((current) => {
        if (current.apps.length > 0) return current;
        return {
          ...DEFAULT_SETTINGS,
          ...remote,
          apps: (remote.apps ?? []).map(normalizeApp),
          backendUrl: current.backendUrl || remote.backendUrl || '',
        };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [pwa.backendConnected]);

  const updateSettings = useCallback((patch: Partial<AppData>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const addApp = useCallback((app: Omit<AppConfig, 'id'> & { id?: string }) => {
    setSettings((current) => ({
      ...current,
      apps: [...current.apps, normalizeApp({ ...app, id: app.id || newId() } as AppConfig)],
    }));
  }, []);

  const updateApp = useCallback((id: string, patch: Partial<AppConfig>) => {
    setSettings((current) => ({
      ...current,
      apps: current.apps.map((app) => {
        if (app.id !== id) return app;
        const merged = { ...app, ...patch };
        if (patch.urls) {
          return withUrls(merged, patch.urls);
        }
        return merged;
      }),
    }));
  }, []);

  const removeApp = useCallback((id: string) => {
    setSettings((current) => ({
      ...current,
      apps: current.apps.filter((app) => app.id !== id),
    }));
  }, []);

  const exportJson = useCallback(() => JSON.stringify(settings, null, 2), [settings]);

  const importJson = useCallback((json: string) => {
    const next = importSettingsJson(json);
    setSettings(next);
  }, []);

  const publish = useCallback(async () => {
    try {
      const ok = await publishSettings(settings);
      setMessage(ok ? 'Published settings to backend' : 'Publish failed');
      return ok;
    } catch {
      setMessage('Publish failed — backend unreachable');
      return false;
    }
  }, [settings]);

  const pullRemote = useCallback(async () => {
    const remote = await getSettingsFromBackend();
    if (!remote) {
      setMessage('No remote settings found');
      return;
    }
    setSettings({
      ...DEFAULT_SETTINGS,
      ...remote,
      backendUrl: settings.backendUrl,
      apps: (remote.apps ?? []).map(normalizeApp),
    });
    setMessage('Loaded settings from backend');
  }, [settings.backendUrl]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      addApp,
      updateApp,
      removeApp,
      exportJson,
      importJson,
      publish,
      pullRemote,
      resolutions,
      lastPingTime,
      message,
      setMessage,
      ...pwa,
    }),
    [
      settings,
      updateSettings,
      addApp,
      updateApp,
      removeApp,
      exportJson,
      importJson,
      publish,
      pullRemote,
      resolutions,
      lastPingTime,
      message,
      pwa,
    ],
  );

  return value;
}

export type DashboardState = ReturnType<typeof useDashboard>;
