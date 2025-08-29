import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AnnouncementType = 'banner' | 'toast';
export type AnnouncementSeverity = 'info' | 'success' | 'warning' | 'error';
export type AnnouncementFrequency = 'always' | 'once' | 'per_session' | 'per_day';

export interface Announcement {
  id: string;
  enabled: boolean;
  type: AnnouncementType;
  severity: AnnouncementSeverity;
  title?: string;
  // Supports markdown; rich text rendering is handled in UI
  message: string;
  dismissible: boolean;
  // Max number of times a single user should see this (null => unlimited)
  maxImpressionsPerUser: number | null;
  // Frequency at which a user can see this again
  frequency: AnnouncementFrequency;
  startsAt?: number; // epoch ms
  endsAt?: number;   // epoch ms
}

export interface UserAnnouncementState {
  impressions: number;
  lastSeenAt: number | null;
  dismissed: boolean;
}

interface AnnouncementStoreState {
  announcements: Announcement[];
  // Per-user impression map keyed by `${announcementId}:${userId}`
  userState: Record<string, UserAnnouncementState>;

  // CRUD
  setAnnouncements: (items: Announcement[]) => void;
  upsertAnnouncement: (item: Announcement) => void;
  removeAnnouncement: (id: string) => void;

  // Runtime helpers
  getUserState: (announcementId: string, userId: string) => UserAnnouncementState;
  markSeen: (announcementId: string, userId: string) => void;
  dismiss: (announcementId: string, userId: string) => void;
}

const defaultUserState: UserAnnouncementState = {
  impressions: 0,
  lastSeenAt: null,
  dismissed: false,
};

function keyFor(announcementId: string, userId: string) {
  return `${announcementId}:${userId}`;
}

function isWithinSchedule(a: Announcement): boolean {
  const now = Date.now();
  if (a.startsAt && now < a.startsAt) return false;
  if (a.endsAt && now > a.endsAt) return false;
  return true;
}

function canShowByFrequency(state: UserAnnouncementState, freq: AnnouncementFrequency): boolean {
  if (!state.lastSeenAt) return true;
  const now = Date.now();
  switch (freq) {
    case 'always':
      return true;
    case 'once':
      return state.impressions === 0;
    case 'per_session':
      // Session heuristic: reset on new browser session; here treat as 30 minutes inactivity window
      return now - state.lastSeenAt > 30 * 60 * 1000;
    case 'per_day':
      return now - state.lastSeenAt > 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

export const useAnnouncementStore = create<AnnouncementStoreState>()(
  persist(
    (set, get) => ({
      announcements: [],
      userState: {},

      setAnnouncements: (items) => set({ announcements: items }),

      upsertAnnouncement: (item) =>
        set((state) => ({
          announcements: state.announcements.some((a) => a.id === item.id)
            ? state.announcements.map((a) => (a.id === item.id ? item : a))
            : [...state.announcements, item],
        })),

      removeAnnouncement: (id) =>
        set((state) => ({ announcements: state.announcements.filter((a) => a.id !== id) })),

      getUserState: (announcementId, userId) => {
        const k = keyFor(announcementId, userId);
        return get().userState[k] || defaultUserState;
      },

      markSeen: (announcementId, userId) =>
        set((state) => {
          const k = keyFor(announcementId, userId);
          const prev = state.userState[k] || defaultUserState;
          return {
            userState: {
              ...state.userState,
              [k]: {
                impressions: (prev.impressions || 0) + 1,
                lastSeenAt: Date.now(),
                dismissed: prev.dismissed,
              },
            },
          };
        }),

      dismiss: (announcementId, userId) =>
        set((state) => {
          const k = keyFor(announcementId, userId);
          const prev = state.userState[k] || defaultUserState;
          return {
            userState: {
              ...state.userState,
              [k]: {
                impressions: prev.impressions,
                lastSeenAt: prev.lastSeenAt ?? Date.now(),
                dismissed: true,
              },
            },
          };
        }),
    }),
    {
      name: 'announcement-store',
      partialize: (state) => ({ announcements: state.announcements, userState: state.userState }),
    }
  )
);

// Helper: choose next active announcement of a specific type for a given user
export function getActiveAnnouncementForUser(
  state: AnnouncementStoreState,
  userId: string,
  type: AnnouncementType
): Announcement | null {
  const list = state.announcements.filter((a) => a.enabled && a.type === type && isWithinSchedule(a));
  for (const a of list) {
    const s = state.getUserState(a.id, userId);
    if (s.dismissed && a.dismissible) continue;
    if (a.maxImpressionsPerUser !== null && s.impressions >= a.maxImpressionsPerUser) continue;
    if (!canShowByFrequency(s, a.frequency)) continue;
    return a;
  }
  return null;
} 