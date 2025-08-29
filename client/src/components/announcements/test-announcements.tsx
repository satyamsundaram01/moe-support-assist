import React from 'react';
import { useAnnouncementStore } from '../../stores/announcement-store';
import { announcementService } from '../../services/announcement-service';
import { Button } from '../ui/button';

// Test component to add sample announcements and verify system is working
export const TestAnnouncements: React.FC = () => {
  const { announcements, setAnnouncements } = useAnnouncementStore();

  const addSampleAnnouncements = async () => {
    const sampleAnnouncements = [
      {
        id: 'test-banner-1',
        enabled: true,
        type: 'banner' as const,
        severity: 'info' as const,
        title: 'Welcome!',
        message: 'Welcome to the enhanced announcement system! This is a test banner.',
        dismissible: true,
        maxImpressionsPerUser: null,
        frequency: 'once' as const,
      },
      {
        id: 'test-toast-1',
        enabled: true,
        type: 'toast' as const,
        severity: 'success' as const,
        title: 'System Ready',
        message: 'The announcement system is working correctly! 🎉',
        dismissible: true,
        maxImpressionsPerUser: 1,
        frequency: 'per_session' as const,
      },
      {
        id: 'test-celebration-1',
        enabled: true,
        type: 'toast' as const,
        severity: 'success' as const,
        title: 'Celebration Test',
        message: 'Congratulations! This is a celebration announcement with special effects! 🎊',
        dismissible: true,
        maxImpressionsPerUser: null,
        frequency: 'once' as const,
      }
    ];

    // Add to local store
    setAnnouncements(sampleAnnouncements);
    
    console.log('Sample announcements added:', sampleAnnouncements);
  };

  const clearAnnouncements = () => {
    setAnnouncements([]);
    console.log('All announcements cleared');
  };

  const testApiCall = async () => {
    try {
      console.log('Testing API call...');
      const result = await announcementService.list();
      console.log('API call successful:', result);
    } catch (error) {
      console.error('API call failed:', error);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Announcement System Test
      </h3>
      
      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Current announcements: {announcements.length}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={addSampleAnnouncements}
            variant="primary"
            className="w-full"
          >
            Add Sample Announcements
          </Button>
          
          <Button 
            onClick={clearAnnouncements}
            variant="outline"
            className="w-full"
          >
            Clear All Announcements
          </Button>
          
          <Button 
            onClick={testApiCall}
            variant="ghost"
            className="w-full"
          >
            Test API Call
          </Button>
        </div>
      </div>
      
      {announcements.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Check console for logs. Announcements should appear after adding them.
        </div>
      )}
    </div>
  );
};

export default TestAnnouncements;
