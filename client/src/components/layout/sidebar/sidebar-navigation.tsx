import React from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarButton } from '../../ui/sidebar-button';
import { usePromptStore } from '../../../stores/prompt-store';

interface SidebarNavigationProps {
  onNewChat?: () => void;
  shouldAnimate?: boolean;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ onNewChat, shouldAnimate = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getFavoritePrompts } = usePromptStore();
  
  const favoritePrompts = getFavoritePrompts();
  const isPromptLibraryPage = location.pathname.startsWith('/prompts');

  const navigationItems = [
    {
      icon: <Plus className="h-4 w-4" />,
      onClick: onNewChat,
      variant: "primary" as const,
      children: "New chat",
      delay: 0.2
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      onClick: () => navigate('/prompts'),
      badge: favoritePrompts.length.toString(),
      children: "Prompt Library",
      delay: 0.4,
      isActive: isPromptLibraryPage
    }
  ];

  return (
    <motion.div 
      className="flex-shrink-0 px-4 space-y-2 pb-6 pt-3"
      initial={shouldAnimate ? { opacity: 0, y: 30 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        type: "spring", 
        stiffness: 200, 
        damping: 25 
      }}
    >
      {navigationItems.map((item, index) => (
        <motion.div
          key={index}
          initial={shouldAnimate ? { opacity: 0, x: -40, scale: 0.8, rotateY: -15 } : false}
          animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
          transition={{ 
            duration: 0.7, 
            delay: shouldAnimate ? item.delay : 0,
            type: "spring",
            stiffness: 250,
            damping: 20
          }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ x: 3, transition: { duration: 0.2 } }}
        >
          <SidebarButton
            icon={item.icon}
            onClick={item.onClick}
            variant={item.isActive ? "primary" : item.variant}
            badge={item.badge}
          >
            {item.children}
          </SidebarButton>
        </motion.div>
      ))}
    </motion.div>
  );
};
