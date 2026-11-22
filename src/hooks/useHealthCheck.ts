import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig } from '../types';
import { appUrls } from '../utils/urls';
import {
  loadResolutionCache,
  resolveApp,
  saveResolutionCache,
  type AppResolution,
} from '../utils/resolveUrl';

export const useHealthCheck = (apps: AppConfig[], interval: number) => {
  const [resolutions, setResolutions] = useState<Map<string, AppResolution>>(() => {
    const cached = loadResolutionCache();
    return new Map(Object.entries(cached));
  });
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const fingerprint = useMemo(
    () => apps.map((app) => `${app.id}|${app.icon ?? ''}|${appUrls(app).join(',')}`).join(';'),
    [apps],
  );
  const appsRef = useRef(apps);
  appsRef.current = apps;

  useEffect(() => {
    if (!fingerprint) return;

    let cancelled = false;

    const checkAllApps = async () => {
      if (!navigator.onLine) return;
      const entries = await Promise.all(appsRef.current.map((app) => resolveApp(app)));
      if (cancelled) return;
      setResolutions((previous) => {
        const next = new Map(previous);
        for (const resolution of entries) {
          const prior = previous.get(resolution.appId);
          const keepPrior =
            prior &&
            prior.status === 'healthy' &&
            resolution.status !== 'healthy' &&
            !navigator.onLine;
          next.set(resolution.appId, keepPrior ? prior : resolution);
        }
        const persisted: Record<string, AppResolution> = {};
        for (const [id, value] of next) persisted[id] = value;
        saveResolutionCache(persisted);
        return next;
      });
      setLastPingTime(new Date());
    };

    checkAllApps();
    const timer = setInterval(checkAllApps, interval);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [fingerprint, interval]);

  return { resolutions, lastPingTime };
};
