import { appConfig } from '../config/app-config';

export type AnnouncementType = 'banner' | 'toast';
export type AnnouncementSeverity = 'info' | 'success' | 'warning' | 'error';
export type AnnouncementFrequency = 'always' | 'once' | 'per_session' | 'per_day';

export interface AnnouncementDTO {
  id: string;
  enabled: boolean;
  type: AnnouncementType;
  severity: AnnouncementSeverity;
  title?: string;
  message: string;
  dismissible: boolean;
  maxImpressionsPerUser: number | null;
  frequency: AnnouncementFrequency;
  startsAt?: number;
  endsAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface AnnouncementInputDTO extends Omit<AnnouncementDTO, 'id' | 'createdAt' | 'updatedAt'> {}

class AnnouncementService {
  private baseURL: string;

  constructor(baseURL: string = appConfig.api.baseUrl) {
    this.baseURL = baseURL.replace(/\/$/, '');
  }

  async list(): Promise<AnnouncementDTO[]> {
    const res = await fetch(`${this.baseURL}/admin/announcements`);
    if (!res.ok) throw new Error(`Failed to list announcements: ${res.status}`);
    return res.json();
  }

  async get(id: string): Promise<AnnouncementDTO> {
    const res = await fetch(`${this.baseURL}/admin/announcements/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Announcement not found: ${res.status}`);
    return res.json();
  }

  async upsert(id: string, payload: AnnouncementInputDTO): Promise<AnnouncementDTO> {
    const res = await fetch(`${this.baseURL}/admin/announcements/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to upsert: ${res.status}`);
    return res.json();
  }

  async remove(id: string): Promise<void> {
    const res = await fetch(`${this.baseURL}/admin/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
  }

  async recordImpression(id: string, userId: string, seenAt?: number): Promise<void> {
    const res = await fetch(`${this.baseURL}/admin/announcements/${encodeURIComponent(id)}/impressions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, seen_at: seenAt }),
    });
    if (!res.ok) throw new Error(`Failed to record impression: ${res.status}`);
  }

  async dismiss(id: string, userId: string): Promise<void> {
    const res = await fetch(`${this.baseURL}/admin/announcements/${encodeURIComponent(id)}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) throw new Error(`Failed to dismiss: ${res.status}`);
  }

  async getActive(userId: string, type: AnnouncementType): Promise<AnnouncementDTO | null> {
    const url = new URL(`${this.baseURL}/announcements/active`);
    url.searchParams.set('user_id', userId);
    url.searchParams.set('type', type);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Failed to fetch active announcement: ${res.status}`);
    const data = await res.json();
    return data ?? null;
  }
}

export const announcementService = new AnnouncementService(); 