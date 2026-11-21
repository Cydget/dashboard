import { DEFAULT_SETTINGS, type AppData } from '../types';
import { normalizeApp } from './urls';

const STORAGE_KEY = 'dashboard_settings';
const BACKEND_KEY = 'backend_url';

function mergeSettings(parsed: Partial<AppData> | null): AppData {
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    apps: Array.isArray(parsed?.apps) ? parsed.apps.map(normalizeApp) : [],
  };
}

export const loadSettings = (): AppData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return mergeSettings(JSON.parse(data) as Partial<AppData>);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return { ...DEFAULT_SETTINGS, apps: [] };
};

export const saveSettings = (settings: AppData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (settings.backendUrl) {
      localStorage.setItem(BACKEND_KEY, settings.backendUrl);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export const exportSettings = (settings: AppData): string => {
  return JSON.stringify(settings, null, 2);
};

export const importSettingsJson = (jsonData: string): AppData => {
  const parsed = JSON.parse(jsonData) as Partial<AppData>;
  const merged = mergeSettings(parsed);
  saveSettings(merged);
  return merged;
};

export const getBackendUrl = (): string => {
  try {
    return localStorage.getItem(BACKEND_KEY) || loadSettings().backendUrl || '';
  } catch {
    return '';
  }
};

export const setBackendUrl = (url: string): void => {
  localStorage.setItem(BACKEND_KEY, url);
};
