import { useCallback, useEffect, useState } from 'react';
import { pingBackend } from '../services/api';
import {
  applyPwaUpdate,
  getPwaRegistrationState,
  subscribePwaRegistration,
} from '../pwa';
import { APP_BUILD_TIME, APP_VERSION, isNewerVersion, type VersionInfo } from '../version';

const BACKEND_POLL_MS = 30_000;
const VERSION_POLL_MS = 60_000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type VersionStatus = 'Latest version' | 'Update available' | 'Unable to check';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export const usePwaStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendConnected, setBackendConnected] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [needRefresh, setNeedRefresh] = useState(() => getPwaRegistrationState().needRefresh);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [versionStatus, setVersionStatus] = useState<VersionStatus>('Unable to check');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setBackendConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    return subscribePwaRegistration(() => {
      setNeedRefresh(getPwaRegistrationState().needRefresh);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const ok = navigator.onLine ? await pingBackend() : false;
      if (!cancelled) {
        setBackendConnected(ok);
        setLastChecked(new Date());
      }
    };

    check();
    const timer = setInterval(check, BACKEND_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const checkForUpdate = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
      } catch {
        /* ignore */
      }
    }

    if (!navigator.onLine) {
      setVersionStatus(needRefresh ? 'Update available' : 'Unable to check');
      return;
    }

    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('version fetch failed');
      const remote = (await response.json()) as VersionInfo;
      const local: VersionInfo = { version: APP_VERSION, buildTime: APP_BUILD_TIME };
      setLatestVersion(remote.version);
      const newer = isNewerVersion(remote, local) || needRefresh;
      setVersionStatus(newer ? 'Update available' : 'Latest version');
    } catch {
      setVersionStatus(needRefresh ? 'Update available' : 'Unable to check');
    }
  }, [needRefresh]);

  useEffect(() => {
    void checkForUpdate();
    const timer = setInterval(() => void checkForUpdate(), VERSION_POLL_MS);
    window.addEventListener('online', checkForUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', checkForUpdate);
    };
  }, [checkForUpdate]);

  const installPwa = useCallback(async () => {
    if (!installEvent) return false;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    return choice.outcome === 'accepted';
  }, [installEvent]);

  const applyUpdate = useCallback(async () => {
    await applyPwaUpdate(true);
  }, []);

  return {
    isOnline,
    backendConnected,
    lastChecked,
    canInstall: Boolean(installEvent) && !installed,
    installed,
    installPwa,
    appVersion: APP_VERSION,
    latestVersion,
    versionStatus,
    applyUpdate,
    checkForUpdate,
  };
};
