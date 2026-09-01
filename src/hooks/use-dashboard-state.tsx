"use client";

import React, { createContext, useContext, useState } from 'react';

interface DashboardStateContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const DashboardStateContext = createContext<DashboardStateContextType | undefined>(undefined);

export function DashboardStateProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DashboardStateContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </DashboardStateContext.Provider>
  );
}

export function useDashboardState() {
  const context = useContext(DashboardStateContext);
  if (!context) {
    throw new Error('useDashboardState must be used within a DashboardStateProvider');
  }
  return context;
}
