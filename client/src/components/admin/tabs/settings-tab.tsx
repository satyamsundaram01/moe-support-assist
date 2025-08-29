import React, { useState } from 'react';
import { cn } from '../../../lib/utils/cn';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { adminService } from '../../../services/admin-service';
import type { AdminSettings } from '../../../types/admin';
import { useAdminConfigStore } from '../../../stores/admin-config-store';
import { announcementService } from '../../../services/announcement-service';

interface SettingsTabProps {
  settings: AdminSettings | null;
  onSettingsUpdate: (settings: AdminSettings) => void;
  onRefresh: () => void;
  className?: string;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onSettingsUpdate,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState<AdminSettings | null>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const banner = useAdminConfigStore((s) => s.banner);
  const updateBanner = useAdminConfigStore((s) => s.updateBanner);
  const setBanner = useAdminConfigStore((s) => s.setBanner);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleSettingChange = (key: keyof AdminSettings, value: any) => {
    if (!localSettings) return;

    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleNestedSettingChange = (
    parentKey: keyof AdminSettings,
    childKey: string,
    value: any
  ) => {
    if (!localSettings) return;

    const newSettings = {
      ...localSettings,
      [parentKey]: {
        ...(localSettings[parentKey] as Record<string, any>),
        [childKey]: value
      }
    };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localSettings) return;

    try {
      setIsLoading(true);
      const updatedSettings = await adminService.updateSettings(localSettings);
      onSettingsUpdate(updatedSettings);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
      const resetSettings = await adminService.resetSettings();
      onSettingsUpdate(resetSettings);
      setLocalSettings(resetSettings);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pushBannerToBackend = async (enabled: boolean) => {
    if (!banner) return;
    try {
      setBannerSaving(true);
      setBannerError(null);
      await announcementService.upsert('global_banner', {
        enabled,
        type: 'banner',
        severity: banner.severity as any,
        title: banner.title || undefined,
        message: banner.message || '',
        dismissible: banner.dismissible,
        maxImpressionsPerUser: null,
        frequency: 'once',
        startsAt: undefined,
        endsAt: undefined,
      });
      // Reflect in local store too
      setBanner({ ...banner, enabled });
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : 'Failed to push banner');
    } finally {
      setBannerSaving(false);
    }
  };

  if (!localSettings) {
    return (
      <div className={cn('p-6', className)}>
        <div className="text-center text-gray-500">No settings data available</div>
      </div>
    );
  }

  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Header with Save/Reset buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Admin Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure system behavior and feature toggles
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Unsaved Changes
            </Badge>
          )}
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={isLoading}
            className="text-sm"
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="text-sm"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Broadcast Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Broadcast Banner
        </h3>
        <div className="space-y-4">
          {bannerError && (
            <div className="rounded border border-red-300 bg-red-50 text-red-700 p-2 text-xs">{bannerError}</div>
          )}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium w-32">Enabled</label>
            <button
              aria-label="Toggle banner enabled"
              title="Toggle banner enabled"
              onClick={() => updateBanner({ enabled: !banner?.enabled })}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                banner?.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  banner?.enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium w-32">Severity</label>
            <select
              aria-label="Banner severity"
              value={banner?.severity || 'info'}
              onChange={(e) => updateBanner({ severity: e.target.value as any })}
              className="bg-transparent border rounded-md px-3 py-1 text-sm"
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium w-32">Title</label>
            <Input
              value={banner?.title || ''}
              onChange={(e) => updateBanner({ title: e.target.value })}
              placeholder="Optional title"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium w-32">Message</label>
            <Input
              value={banner?.message || ''}
              onChange={(e) => updateBanner({ message: e.target.value })}
              placeholder="Broadcast message to all users"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium w-32">Dismissible</label>
            <button
              aria-label="Toggle banner dismissible"
              title="Toggle banner dismissible"
              onClick={() => updateBanner({ dismissible: !banner?.dismissible })}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                banner?.dismissible ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  banner?.dismissible ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => pushBannerToBackend(true)} disabled={bannerSaving}>
              {bannerSaving ? 'Pushing…' : 'Push Banner'}
            </Button>
            <Button variant="outline" onClick={() => pushBannerToBackend(false)} disabled={bannerSaving}>
              {bannerSaving ? 'Hiding…' : 'Hide Banner'}
            </Button>
          </div>
        </div>
      </div>

      {/* Conversation Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Conversation Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum Conversation Turns
            </label>
            <div className="flex items-center space-x-3">
              <Input
                type="number"
                min="1"
                max="100"
                value={localSettings.maxConversationTurns}
                onChange={(e) => handleSettingChange('maxConversationTurns', parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Maximum number of back-and-forth exchanges per conversation
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Timeout (minutes)
            </label>
            <div className="flex items-center space-x-3">
              <Input
                type="number"
                min="5"
                max="120"
                value={localSettings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Automatically end inactive sessions after this duration
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Feature Toggles
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Ask Mode</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Enable the Ask mode for quick questions
              </div>
            </div>
            <button
              aria-label="Toggle Ask Mode"
              title="Toggle Ask Mode"
              onClick={() => handleNestedSettingChange('features', 'askMode', !localSettings.features.askMode)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                localSettings.features.askMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  localSettings.features.askMode ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Investigate Mode</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Enable the Investigate mode for detailed analysis
              </div>
            </div>
            <button
              aria-label="Toggle Investigate Mode"
              title="Toggle Investigate Mode"
              onClick={() => handleNestedSettingChange('features', 'investigateMode', !localSettings.features.investigateMode)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                localSettings.features.investigateMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  localSettings.features.investigateMode ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Slash Commands</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Enable slash commands for quick actions
              </div>
            </div>
            <button
              aria-label="Toggle Slash Commands"
              title="Toggle Slash Commands"
              onClick={() => handleNestedSettingChange('features', 'slashCommands', !localSettings.features.slashCommands)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                localSettings.features.slashCommands ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  localSettings.features.slashCommands ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">File Upload</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Allow users to upload files for analysis
              </div>
            </div>
            <button
              aria-label="Toggle File Upload"
              title="Toggle File Upload"
              onClick={() => handleNestedSettingChange('features', 'fileUpload', !localSettings.features.fileUpload)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                localSettings.features.fileUpload ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  localSettings.features.fileUpload ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics & Monitoring */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text.white mb-4">
          Analytics & Monitoring
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Enable Analytics</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Collect usage analytics and performance metrics
              </div>
            </div>
            <button
              aria-label="Toggle Analytics"
              title="Toggle Analytics"
              onClick={() => handleSettingChange('enableAnalytics', !localSettings.enableAnalytics)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                localSettings.enableAnalytics ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  localSettings.enableAnalytics ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Enable Feedback</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Allow users to provide feedback on responses
              </div>
            </div>
            <button
              aria-label="Toggle Feedback"
              title="Toggle Feedback"
              onClick={() => handleSettingChange('enableFeedback', !localSettings.enableFeedback)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                localSettings.enableFeedback ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg.white transition-transform',
                  localSettings.enableFeedback ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Rate Limiting
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Enable Rate Limiting</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Limit the number of requests per user
              </div>
            </div>
            <button
              aria-label="Toggle Rate Limiting"
              title="Toggle Rate Limiting"
              onClick={() => handleNestedSettingChange('rateLimiting', 'enabled', !localSettings.rateLimiting.enabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                localSettings.rateLimiting.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  localSettings.rateLimiting.enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {localSettings.rateLimiting.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requests per minute
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={localSettings.rateLimiting.requestsPerMinute}
                  onChange={(e) => handleNestedSettingChange('rateLimiting', 'requestsPerMinute', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requests per hour
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={localSettings.rateLimiting.requestsPerHour}
                  onChange={(e) => handleNestedSettingChange('rateLimiting', 'requestsPerHour', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
