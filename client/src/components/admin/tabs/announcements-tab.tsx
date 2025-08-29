import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../../lib/utils/cn';
import { announcementService, type AnnouncementDTO, type AnnouncementInputDTO, type AnnouncementType, type AnnouncementSeverity, type AnnouncementFrequency } from '../../../services/announcement-service';

const defaultNewAnnouncement: AnnouncementDTO = {
  id: '',
  enabled: true,
  type: 'banner',
  severity: 'info',
  title: '',
  message: '',
  dismissible: true,
  maxImpressionsPerUser: 1,
  frequency: 'once',
};

export const AnnouncementsTab: React.FC = () => {
  const [items, setItems] = useState<AnnouncementDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AnnouncementDTO | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await announcementService.list();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load announcements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1));
  }, [items]);

  const startCreate = () => {
    setEditing({ ...defaultNewAnnouncement, id: `ann_${Date.now()}` });
  };

  const startEdit = (a: AnnouncementDTO) => setEditing({ ...a });
  const cancelEdit = () => setEditing(null);

  const toInput = (a: AnnouncementDTO): AnnouncementInputDTO => ({
    enabled: a.enabled,
    type: a.type,
    severity: a.severity,
    title: a.title,
    message: a.message,
    dismissible: a.dismissible,
    maxImpressionsPerUser: a.maxImpressionsPerUser ?? null,
    frequency: a.frequency,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
  });

  const save = async () => {
    if (!editing) return;
    try {
      setIsLoading(true);
      await announcementService.upsert(editing.id, toInput(editing));
      await load();
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save announcement');
    } finally {
      setIsLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setIsLoading(true);
      await announcementService.remove(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete announcement');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = <K extends keyof AnnouncementDTO>(key: K, value: AnnouncementDTO[K]) => {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Announcements</h2>
          <p className="text-sm text-muted-foreground">Configure banner/toast announcements with visibility rules</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="outline" disabled={isLoading}>Refresh</Button>
          <Button onClick={startCreate} disabled={isLoading}>New Announcement</Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm">{error}</div>
      )}

      {!editing && (
        <div className="overflow-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3">Enabled</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Severity</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Max/User</th>
                <th className="text-left p-3">Frequency</th>
                <th className="text-left p-3">Schedule</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs', a.enabled ? 'bg-emerald-500/10 text-emerald-700' : 'bg-gray-500/10 text-gray-600')}>{a.enabled ? 'On' : 'Off'}</span>
                  </td>
                  <td className="p-3">{a.type}</td>
                  <td className="p-3">{a.severity}</td>
                  <td className="p-3">{a.title || '-'}</td>
                  <td className="p-3">{a.maxImpressionsPerUser ?? '∞'}</td>
                  <td className="p-3">{a.frequency}</td>
                  <td className="p-3">{a.startsAt ? new Date(a.startsAt).toLocaleString() : '-'} → {a.endsAt ? new Date(a.endsAt).toLocaleString() : '-'}</td>
                  <td className="p-3 text-right space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(a)} disabled={isLoading}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => remove(a.id)} disabled={isLoading}>Delete</Button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={8}>{isLoading ? 'Loading…' : 'No announcements configured'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ID</label>
              <Input aria-label="Announcement id" value={editing.id} onChange={(e) => updateField('id', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Enabled</label>
              <button
                aria-label="Toggle enabled"
                title="Toggle enabled"
                onClick={() => updateField('enabled', !editing.enabled)}
                className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', editing.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700')}
              >
                <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', editing.enabled ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                aria-label="Announcement type"
                value={editing.type}
                onChange={(e) => updateField('type', e.target.value as AnnouncementType)}
                className="bg-transparent border rounded-md px-3 py-1 text-sm"
              >
                <option value="banner">Banner</option>
                <option value="toast">Toast</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <select
                aria-label="Announcement severity"
                value={editing.severity}
                onChange={(e) => updateField('severity', e.target.value as AnnouncementSeverity)}
                className="bg-transparent border rounded-md px-3 py-1 text-sm"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <select
                aria-label="Announcement frequency"
                value={editing.frequency}
                onChange={(e) => updateField('frequency', e.target.value as AnnouncementFrequency)}
                className="bg-transparent border rounded-md px-3 py-1 text-sm"
              >
                <option value="once">Once</option>
                <option value="per_session">Per Session</option>
                <option value="per_day">Per Day</option>
                <option value="always">Always</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Impressions per User</label>
              <Input
                aria-label="Max impressions per user"
                type="number"
                min="0"
                value={editing.maxImpressionsPerUser ?? 0}
                onChange={(e) => updateField('maxImpressionsPerUser', Number.isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value))}
              />
              <div className="text-xs text-muted-foreground">0 means unlimited</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start (optional)</label>
              <Input
                aria-label="Start datetime"
                type="datetime-local"
                value={editing.startsAt ? new Date(editing.startsAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => updateField('startsAt', e.target.value ? new Date(e.target.value).getTime() : undefined)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End (optional)</label>
              <Input
                aria-label="End datetime"
                type="datetime-local"
                value={editing.endsAt ? new Date(editing.endsAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => updateField('endsAt', e.target.value ? new Date(e.target.value).getTime() : undefined)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input aria-label="Announcement title" value={editing.title || ''} onChange={(e) => updateField('title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message (Markdown supported)</label>
            <textarea
              aria-label="Announcement message"
              value={editing.message}
              onChange={(e) => updateField('message', e.target.value)}
              className="w-full min-h-32 border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={cancelEdit} disabled={isLoading}>Cancel</Button>
            <Button onClick={save} disabled={isLoading}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}; 