import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminSettings } from '../types/admin';

export type BannerSeverity = 'info' | 'success' | 'warning' | 'error';

export interface BroadcastBannerConfig {
  enabled: boolean;
  severity: BannerSeverity;
  title?: string;
  message: string;
  dismissible: boolean;
}

interface AdminConfigState {
  settings: AdminSettings | null;
  banner: BroadcastBannerConfig | null;

  // actions
  setSettings: (settings: AdminSettings) => void;
  updateSettings: (partial: Partial<AdminSettings>) => void;

  setBanner: (config: BroadcastBannerConfig | null) => void;
  updateBanner: (partial: Partial<BroadcastBannerConfig>) => void;
  clearBanner: () => void;
}

const defaultBanner: BroadcastBannerConfig = {
  enabled: false,
  severity: 'info',
  title: undefined,
  message: '',
  dismissible: true,
};

export const useAdminConfigStore = create<AdminConfigState>()(
  persist(
    (set) => ({
      settings: null,
      banner: defaultBanner,

      setSettings: (settings) => set({ settings }),

      updateSettings: (partial) =>
        set((state) => ({ settings: state.settings ? { ...state.settings, ...partial } : { ...(partial as AdminSettings) } })),

      setBanner: (config) => set({ banner: config ?? defaultBanner }),

      updateBanner: (partial) =>
        set((state) => ({ banner: state.banner ? { ...state.banner, ...partial } : { ...defaultBanner, ...partial } })),

      clearBanner: () => set({ banner: { ...defaultBanner, enabled: false } }),
    }),
    {
      name: 'admin-config-store',
      partialize: (state) => ({ settings: state.settings, banner: state.banner }),
    }
  )
); 