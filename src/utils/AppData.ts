import { loadSettings, saveSettings } from './localStorage';
import type { AppConfig } from '../types';

/** Legacy singleton kept for non-React helpers. Prefer useDashboard. */
export const AppData = {
  get apps(): AppConfig[] {
    return loadSettings().apps;
  },

  setApps(newApps: AppConfig[]) {
    const settings = loadSettings();
    settings.apps = newApps;
    saveSettings(settings);
  },
};
