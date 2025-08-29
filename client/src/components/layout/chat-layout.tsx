import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '../../hooks';
import { cn } from '../../lib/utils';
import { AppHeader } from './header/app-header';
import { MainSidebar } from './sidebar/main-sidebar';
import { EnhancedBanner } from '../announcements/enhanced-banner';

// Track whether layout has already animated once to avoid re-animating on route changes
let hasAnimatedLayoutOnce = false;

interface ChatLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  className,
}) => {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Determine if we should animate this mount
  const shouldAnimate = !hasAnimatedLayoutOnce;
  useEffect(() => {
    // After first mount, prevent future initial animations
    hasAnimatedLayoutOnce = true;
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className={cn('flex h-screen w-full p-4 gap-2 relative', className)}>
      {/* Floating Sidebar with enhanced AnimatePresence */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            className={cn(
              'flex-shrink-0 z-10',
              isMobile ? 'fixed left-4 top-4 bottom-4 z-50' : 'relative',
              'w-72'
            )}
            initial={shouldAnimate ? { x: -320, opacity: 0, scale: 0.95, rotateY: -10 } : false}
            animate={{ x: 0, opacity: 1, scale: 1, rotateY: 0 }}
            exit={shouldAnimate ? { x: -320, opacity: 0, scale: 0.95, rotateY: -10 } : undefined}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 25,
              mass: 0.8,
              duration: 0.9,
            }}
          >
            <MainSidebar
              onClose={() => setSidebarOpen(false)}
              onToggle={toggleSidebar}
              sidebarOpen={sidebarOpen}
              shouldAnimate={shouldAnimate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Main Content - no width/margin animations */}
      <motion.div
        className="flex-1 z-10 backdrop-blur-2xl rounded-3xl border border-border flex flex-col min-w-0 backdrop-saturate-150"
        initial={shouldAnimate ? { opacity: 0, scale: 0.98, y: 20 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 25,
          duration: 0.6,
          delay: shouldAnimate ? 0.3 : 0,
        }}
      >
        {/* Enhanced Banner for announcements */}
        <EnhancedBanner />
        
        {/* Header with proper alignment */}
        <div className="flex-shrink-0">
          <AppHeader onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        </div>

        {/* Chat content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </motion.div>
    </div>
  );
};
