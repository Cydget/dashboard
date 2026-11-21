import React, { createContext, useContext } from 'react';
import { useDashboard, type DashboardState } from '../hooks/useDashboard';

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const value = useDashboard();
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboardContext must be used within DashboardProvider');
  }
  return ctx;
}
