"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export interface NotificationSettings {
  enabled: boolean;
  emailEnabled: boolean;
  newSurveys: boolean;
  referralActivity: boolean;
  paymentUpdates: boolean;
  tradeAlerts: boolean;
  [key: string]: boolean;
}

export interface DashboardStateContextType {
  sidebarOpen: boolean;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onSidebarToggle: () => void;
  openSheets: {
    ai: boolean;
    notifications: boolean;
    [key: string]: boolean;
  };
  setSheetOpen: (sheetName: string, isOpen: boolean) => void;
  notificationSettings: NotificationSettings;
  setNotificationSetting: (key: string, value: boolean) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  emailEnabled: true,
  newSurveys: true,
  referralActivity: true,
  paymentUpdates: true,
  tradeAlerts: true,
};

const DashboardStateContext = createContext<DashboardStateContextType | undefined>(undefined);

export function DashboardStateProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openSheets, setOpenSheets] = useState<{ [key: string]: boolean }>({
    ai: false,
    notifications: false,
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('capwallet_notif_settings');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return defaultNotificationSettings;
  });
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const setNotificationSetting = useCallback((key: string, value: boolean) => {
    setNotificationSettings((prev) => {
      const updated = { ...prev, [key]: value };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('capwallet_notif_settings', JSON.stringify(updated));
        } catch (e) {
          // ignore
        }
      }
      return updated;
    });
  }, []);

  const onSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const setSheetOpen = useCallback((sheetName: string, isOpen: boolean) => {
    setOpenSheets((prev) => ({
      ...prev,
      [sheetName]: isOpen,
    }));
  }, []);

  useEffect(() => {
    let unsubscribeNotifs: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const notifRef = ref(rtdb, `notifications/${user.uid}`);
        unsubscribeNotifs = onValue(notifRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const unread = Object.values(data).filter((n: any) => n && n.read === false).length;
            setUnreadCount(unread);
          } else {
            setUnreadCount(0);
          }
        });
      } else {
        setUnreadCount(0);
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribeNotifs) unsubscribeNotifs();
    };
  }, []);

  return (
    <DashboardStateContext.Provider
      value={{
        sidebarOpen,
        isSidebarOpen: sidebarOpen,
        setSidebarOpen,
        onSidebarToggle,
        openSheets: {
          ai: !!openSheets.ai,
          notifications: !!openSheets.notifications,
          ...openSheets,
        },
        setSheetOpen,
        notificationSettings,
        setNotificationSetting,
        unreadCount,
        setUnreadCount,
      }}
    >
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
