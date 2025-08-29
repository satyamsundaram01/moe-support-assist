import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { useAnnouncementDemo } from '../../announcements/announcement-manager';
import { announcementService } from '../../../services/announcement-service';
import { useAnnouncementStore } from '../../../stores/announcement-store';
import { 
  Sparkles, 
  Zap, 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

// ============================================================================
// ENHANCED ANNOUNCEMENTS TAB
// ============================================================================

export const EnhancedAnnouncementsTab: React.FC = () => {
  const demo = useAnnouncementDemo();
  const { announcements, setAnnouncements } = useAnnouncementStore();
  const [testConfig, setTestConfig] = React.useState({
    type: 'toast' as 'banner' | 'toast',
    severity: 'info' as 'info' | 'success' | 'warning' | 'error',
    title: '',
    message: '',
    variant: 'standard' as string,
    duration: 5000,
    dismissible: true
  });

  // Load announcements manually only - NO AUTO-LOADING to prevent API loops
  const loadAnnouncements = React.useCallback(async () => {
    try {
      const serverAnnouncements = await announcementService.list();
      setAnnouncements(serverAnnouncements);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      demo.enhancedToast.showError('Failed to load announcements');
    }
  }, [setAnnouncements, demo.enhancedToast]);

  // DISABLED AUTO-LOADING TO PREVENT API LOOPS
  // React.useEffect(() => {
  //   loadAnnouncements();
  // }, []);

  console.log('Enhanced Announcements Tab rendered, announcements count:', announcements.length);

  const handleTestAnnouncement = () => {
    if (testConfig.type === 'banner') {
      if (testConfig.variant === 'celebration') {
        demo.alertModal.showCelebration(
          testConfig.title || '🎉 Test Celebration!',
          testConfig.message || 'This is a test celebration banner with confetti animation!',
          {
            dismissible: testConfig.dismissible,
            autoClose: testConfig.duration > 0 ? testConfig.duration : 0
          }
        );
      } else {
        demo.alertModal.showAlert({
          title: testConfig.title,
          message: testConfig.message || 'This is a test banner alert',
          severity: testConfig.severity,
          variant: testConfig.variant as 'standard' | 'highlight' | 'celebration',
          dismissible: testConfig.dismissible,
          autoClose: testConfig.duration > 0 ? testConfig.duration : 0,
          showIcon: true
        });
      }
    } else {
      demo.enhancedToast.addToast({
        title: testConfig.title,
        message: testConfig.message || 'This is a test toast notification',
        severity: testConfig.severity,
        variant: testConfig.variant as 'standard' | 'compact' | 'rich' | 'floating',
        duration: testConfig.duration,
        dismissible: testConfig.dismissible,
        showIcon: true
      });
    }
  };

  const severityIcons = {
    info: <Info className="w-4 h-4 text-blue-500" />,
    success: <CheckCircle className="w-4 h-4 text-green-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />
  };

  const quickDemos = [
    {
      name: 'Success Toast',
      action: () => demo.enhancedToast.showSuccess('Operation completed successfully!', { 
        animation: 'scale' 
      })
    },
    {
      name: 'Error Toast',
      action: () => demo.enhancedToast.showError('Something went wrong!', { 
        variant: 'floating', 
        animation: 'bounce' 
      })
    },
    {
      name: 'Rich Toast',
      action: () => demo.enhancedToast.showRichToast(
        'Feature Update',
        'New announcement system is now available with enhanced features!',
        [
          { label: 'Learn More', variant: 'link', onClick: () => console.log('Learn more') },
          { label: 'Dismiss', variant: 'button', onClick: () => console.log('Dismiss') }
        ]
      )
    },
    {
      name: 'Celebration Alert',
      action: () => demo.alertModal.showCelebration(
        '🎉 Amazing Achievement!',
        'You have successfully configured the enhanced announcement system!',
        {
          actions: [
            { label: 'Continue', variant: 'primary', onClick: () => console.log('Continue') }
          ]
        }
      )
    },
    {
      name: 'Warning Alert',
      action: () => demo.alertModal.showWarning('System maintenance will begin in 30 minutes', {
        title: 'Scheduled Maintenance',
        variant: 'highlight',
        autoClose: 10000
      })
    }
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Enhanced Announcements
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage and test the enhanced announcement system with beautiful animations and smart scheduling
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAnnouncements} variant="outline" size="sm">
            Refresh
          </Button>
          <Button onClick={() => demo.enhancedToast.clearToasts()} variant="outline" size="sm">
            Clear Toasts
          </Button>
          <Button onClick={demo.showDemoToasts} variant="outline" size="sm">
            Demo Toasts
          </Button>
          <Button onClick={demo.showDemoAlerts} size="sm">
            Demo Alerts
          </Button>
        </div>
      </div>

      {/* Quick Demo Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Quick Demo Actions
          </CardTitle>
          <CardDescription>
            Try out different announcement styles and animations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {quickDemos.map((demo, index) => (
              <motion.div
                key={demo.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  onClick={demo.action}
                  variant="outline"
                  className="w-full h-auto p-3 flex flex-col space-y-1"
                >
                  <span className="text-sm font-medium">{demo.name}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-500" />
            Test Announcement
          </CardTitle>
          <CardDescription>
            Configure and test custom announcements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={testConfig.type} 
                onValueChange={(value: 'banner' | 'toast') => 
                  setTestConfig(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">Banner Alert</SelectItem>
                  <SelectItem value="toast">Toast Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select 
                value={testConfig.severity} 
                onValueChange={(value: 'info' | 'success' | 'warning' | 'error') => 
                  setTestConfig(prev => ({ ...prev, severity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Variant</Label>
              <Select 
                value={testConfig.variant} 
                onValueChange={(value) => 
                  setTestConfig(prev => ({ ...prev, variant: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {testConfig.type === 'banner' ? (
                    <>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="highlight">Highlight</SelectItem>
                      <SelectItem value="celebration">Celebration</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="rich">Rich</SelectItem>
                      <SelectItem value="floating">Floating</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (ms)</Label>
              <Input
                type="number"
                value={testConfig.duration}
                onChange={(e) => 
                  setTestConfig(prev => ({ 
                    ...prev, 
                    duration: parseInt(e.target.value) || 0 
                  }))
                }
                placeholder="5000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                value={testConfig.title}
                onChange={(e) => 
                  setTestConfig(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder="Announcement Title"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={testConfig.dismissible}
                onCheckedChange={(checked) => 
                  setTestConfig(prev => ({ ...prev, dismissible: checked }))
                }
              />
              <Label>Dismissible</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={testConfig.message}
              onChange={(e) => 
                setTestConfig(prev => ({ ...prev, message: e.target.value }))
              }
              placeholder="Enter your announcement message here..."
              rows={3}
            />
          </div>

          <Button onClick={handleTestAnnouncement} className="w-full">
            Test {testConfig.type === 'banner' ? 'Banner Alert' : 'Toast Notification'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Current Announcements
          </CardTitle>
          <CardDescription>
            Manage existing announcements in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No announcements configured</p>
              <p className="text-sm">Create announcements in the Announcements tab</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {severityIcons[announcement.severity]}
                    <div>
                      <div className="font-medium">
                        {announcement.title || announcement.id}
                      </div>
                      <div className="text-sm text-muted-foreground truncate max-w-md">
                        {announcement.message}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {announcement.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {announcement.severity}
                        </Badge>
                        {announcement.enabled ? (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        // Preview the announcement
                        if (announcement.type === 'banner') {
                          demo.alertModal.showAlert({
                            title: announcement.title,
                            message: announcement.message,
                            severity: announcement.severity,
                            dismissible: announcement.dismissible,
                            showIcon: true
                          });
                        } else {
                          demo.enhancedToast.addToast({
                            title: announcement.title,
                            message: announcement.message,
                            severity: announcement.severity,
                            dismissible: announcement.dismissible,
                            showIcon: true
                          });
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Preview
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAnnouncementsTab;
