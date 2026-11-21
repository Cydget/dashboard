import { useState, useEffect } from 'react';
import { pingBackend } from '../services/api';

const BACKEND_POLL_MS = 30_000;

export const usePwaStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendConnected, setBackendConnected] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

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

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const updateSW = async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    };

    window.addEventListener('online', updateSW);
    return () => window.removeEventListener('online', updateSW);
  }, []);

  return { isOnline, backendConnected, lastChecked };
};
