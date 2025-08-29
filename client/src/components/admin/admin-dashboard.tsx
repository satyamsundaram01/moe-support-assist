import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils/cn';
import { Button } from '../ui/button';
import { adminService } from '../../services/admin-service';
import type { AnalyticsData, AdminSettings, FeedbackSummary } from '../../types/admin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AnalyticsTab } from './tabs/analytics-tab';
import { SessionsTab } from './tabs/sessions-tab';
import { SettingsTab } from './tabs/settings-tab';
import { AnnouncementsTab } from './tabs/announcements-tab';
import { EnhancedAnnouncementsTab } from './tabs/enhanced-announcements-tab';

interface AdminDashboardProps {
  className?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [analytics, feedback, adminSettings] = await Promise.all([
        adminService.getAnalyticsSummary(30),
        adminService.getFeedbackSummary(),
        adminService.getSettings()
      ]);

      setAnalyticsData(analytics);
      setFeedbackSummary(feedback);
      setSettings(adminSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadDashboardData} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full h-full p-6 bg-gray-50 dark:bg-gray-900', className)}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitor and manage your AI assistant
        </p>
      </header>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics">
          <AnalyticsTab
            analyticsData={analyticsData}
            feedbackSummary={feedbackSummary}
            onRefresh={loadDashboardData}
          />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab onRefresh={loadDashboardData} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab
            settings={settings}
            onSettingsUpdate={(newSettings: AdminSettings) => setSettings(newSettings)}
            onRefresh={loadDashboardData}
          />
        </TabsContent>
        <TabsContent value="announcements">
          <AnnouncementsTab />
        </TabsContent>
        <TabsContent value="enhanced">
          <EnhancedAnnouncementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
