import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAnnouncementDemo } from './announcement-manager';
import { TestAnnouncements } from './test-announcements';
import { Sparkles, Zap, Bell, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

// ============================================================================
// ANNOUNCEMENT SYSTEM DEMO
// ============================================================================

export const AnnouncementSystemDemo: React.FC = () => {
  const demo = useAnnouncementDemo();

  const features = [
    {
      icon: <Sparkles className="w-6 h-6 text-purple-500" />,
      title: "Alert Modals",
      description: "Full-screen overlay alerts with celebration animations, auto-close timers, and custom actions",
      demo: demo.showDemoAlerts
    },
    {
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      title: "Enhanced Toasts",
      description: "Rich toast notifications with progress bars, hover-to-pause, and multiple animation styles",
      demo: demo.showDemoToasts
    },
    {
      icon: <Bell className="w-6 h-6 text-green-500" />,
      title: "Smart Scheduling",
      description: "Frequency-based display logic with localStorage persistence and user interaction tracking",
      demo: () => console.log("Scheduling demo")
    }
  ];

  const toastVariants = [
    {
      name: "Standard",
      description: "Default toast with slide animation",
      action: () => demo.enhancedToast.showInfo("This is a standard toast notification", { variant: 'standard', animation: 'slide' })
    },
    {
      name: "Compact",
      description: "Smaller toast for quick messages",
      action: () => demo.enhancedToast.showInfo("Compact toast", { variant: 'compact', animation: 'fade' })
    },
    {
      name: "Rich",
      description: "Feature-rich toast with actions",
      action: () => demo.enhancedToast.showRichToast(
        "Rich Toast Example",
        "This toast includes multiple actions and doesn't auto-close",
        [
          { label: "Action 1", variant: "button", onClick: () => console.log("Action 1") },
          { label: "Link", variant: "link", onClick: () => console.log("Link clicked") }
        ]
      )
    },
    {
      name: "Floating",
      description: "Floating toast with glow effect",
      action: () => demo.enhancedToast.showWarning("Floating toast with special effects", { 
        variant: 'floating', 
        animation: 'bounce' 
      })
    }
  ];

  const alertVariants = [
    {
      name: "Standard",
      severity: "info" as const,
      icon: <Info className="w-5 h-5" />,
      action: () => demo.alertModal.showInfo("This is a standard information alert", { 
        title: "Information",
        dismissible: true 
      })
    },
    {
      name: "Success",
      severity: "success" as const,
      icon: <CheckCircle className="w-5 h-5" />,
      action: () => demo.alertModal.showSuccess("Operation completed successfully!", { 
        title: "Success",
        autoClose: 5000 
      })
    },
    {
      name: "Warning",
      severity: "warning" as const,
      icon: <AlertTriangle className="w-5 h-5" />,
      action: () => demo.alertModal.showWarning("Please review this warning message", { 
        title: "Warning",
        variant: "highlight" 
      })
    },
    {
      name: "Error",
      severity: "error" as const,
      icon: <AlertCircle className="w-5 h-5" />,
      action: () => demo.alertModal.showError("An error has occurred that requires attention", { 
        title: "Error",
        variant: "highlight",
        autoClose: 8000 
      })
    },
    {
      name: "Celebration",
      severity: "success" as const,
      icon: <Sparkles className="w-5 h-5" />,
      action: () => demo.alertModal.showCelebration(
        "🎉 Amazing Achievement!",
        "You've unlocked a new level of awesome announcements!",
        {
          actions: [
            { label: "Continue", variant: "primary", onClick: () => console.log("Continue") },
            { label: "Share", variant: "outline", onClick: () => console.log("Share") }
          ]
        }
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Enhanced Announcement System
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A powerful, configurable announcement system with beautiful animations, smart scheduling, 
          and seamless integration with existing infrastructure.
        </p>
      </motion.div>

      {/* Features Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl font-semibold mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow" onClick={feature.demo}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {feature.icon}
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    Try Demo
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Toast Variants */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-semibold mb-6">Toast Notifications</h2>
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Toast Variants</CardTitle>
            <CardDescription>
              Multiple styles and animations for different use cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {toastVariants.map((variant, index) => (
                <motion.div
                  key={variant.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <Button 
                    variant="outline" 
                    className="w-full h-auto flex-col p-4 space-y-2"
                    onClick={variant.action}
                  >
                    <span className="font-medium">{variant.name}</span>
                    <span className="text-xs text-muted-foreground text-center">
                      {variant.description}
                    </span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alert Modals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-2xl font-semibold mb-6">Alert Modals</h2>
        <Card>
          <CardHeader>
            <CardTitle>Full-Screen Alert Variants</CardTitle>
            <CardDescription>
              Immersive alert modals with different severities and animations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {alertVariants.map((variant, index) => (
                <motion.div
                  key={variant.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <Button 
                    variant="outline" 
                    className="w-full h-auto flex-col p-4 space-y-3"
                    onClick={variant.action}
                  >
                    <div className="flex items-center gap-2">
                      {variant.icon}
                      <Badge variant="outline" className="capitalize">
                        {variant.severity}
                      </Badge>
                    </div>
                    <span className="font-medium">{variant.name}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Configuration Examples */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-2xl font-semibold mb-6">Configuration</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Modal Config</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
{`{
  title: "Alert Title",
  message: "Alert message",
  severity: "success",
  variant: "celebration",
  dismissible: true,
  autoClose: 5000,
  showIcon: true,
  backdrop: "dark",
  actions: [
    {
      label: "Primary Action",
      variant: "primary",
      onClick: () => {}
    }
  ]
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enhanced Toast Config</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
{`{
  title: "Toast Title", 
  message: "Toast message",
  severity: "info",
  variant: "rich",
  animation: "bounce",
  duration: 5000,
  progress: true,
  position: "top-right",
  actions: [
    {
      label: "Action",
      variant: "button",
      onClick: () => {}
    }
  ]
}`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center space-y-4"
      >
        <h2 className="text-2xl font-semibold">Try It Out</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Button 
            onClick={demo.showDemoAlerts}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            Show Demo Alerts
          </Button>
          <Button 
            onClick={demo.showDemoToasts}
            variant="outline"
          >
            Show Demo Toasts
          </Button>
          <Button 
            onClick={() => {
              demo.enhancedToast.clearToasts();
              console.log("Cleared all toasts");
            }}
            variant="ghost"
          >
            Clear All Toasts
          </Button>
        </div>
      </motion.div>

      {/* Test Component */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex justify-center"
      >
        <TestAnnouncements />
      </motion.div>
    </div>
  );
};

export default AnnouncementSystemDemo;
