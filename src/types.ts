export type IconSize = 'small' | 'medium' | 'large';

export interface AppConfig {
  id: string;
  url: string;
  urls?: string[];
  name: string;
  icon?: string;
  iconSize?: IconSize;
  page?: number;
  row?: number | null;
  col?: number | null;
}

export type HealthLevel = 'healthy' | 'unhealthy' | 'timeout' | 'unknown';

export interface HealthStatus {
  url: string;
  status: HealthLevel;
  lastChecked: string;
  responseTime?: number;
  error?: string;
  resolvedUrl?: string | null;
  method?: 'icon' | 'http';
}

export interface AppData {
  apps: AppConfig[];
  themeColor: string;
  backgroundColor: string;
  checkInterval: number;
  backendUrl: string;
  iconSize: IconSize;
}

export const DEFAULT_SETTINGS: AppData = {
  apps: [],
  themeColor: '#1976d2',
  backgroundColor: '#1a1a2e',
  checkInterval: 30_000,
  backendUrl: '',
  iconSize: 'medium',
};
