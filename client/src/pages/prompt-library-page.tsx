import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Heart } from 'lucide-react';
import { ChatLayout } from '../components/layout';
import { usePromptStore } from '../stores/prompt-store';
import type { Prompt } from '../stores/prompt-store';
import { ExpandablePromptCard } from '../components/ui/expandable-prompt-card';

export const PromptLibraryPage: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const {
    getFilteredPrompts,
    favoritesOnly,
    setFavoritesOnly,
    toggleFavorite
  } = usePromptStore();

  const filteredPrompts = getFilteredPrompts();

  const handleCopyPrompt = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const handleToggleFavorite = (promptId: string) => {
    toggleFavorite(promptId);
  };

  return (
    <ChatLayout>
      <div className="h-full bg-background overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Favorites Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8 flex justify-end"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-4 py-2 rounded-xl border transition-all duration-200 flex items-center gap-2 text-sm ${
                favoritesOnly
                  ? 'bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-400'
                  : 'bg-card/70 border-border text-foreground hover:bg-card/90'
              }`}
            >
              <Heart className={`w-4 h-4 ${favoritesOnly ? 'fill-current' : ''}`} />
              {favoritesOnly ? 'All' : 'Favorites'}
            </motion.button>
          </motion.div>

          {/* Prompts Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredPrompts.map((prompt, index) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200
                  }}
                  className="h-full"
                >
                  <ExpandablePromptCard
                    prompt={prompt}
                    onCopy={handleCopyPrompt}
                    onToggleFavorite={handleToggleFavorite}
                    copiedId={copiedId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty State */}
          {filteredPrompts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {favoritesOnly ? 'No favorite prompts' : 'No prompts found'}
              </h3>
              <p className="text-muted-foreground">
                {favoritesOnly 
                  ? 'Start favoriting prompts to see them here.'
                  : 'No prompts available at the moment.'
                }
              </p>
            </motion.div>
          )}

          {/* Create New Prompt Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-12 pb-8"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-3 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create New Prompt
            </motion.button>
          </motion.div>
        </div>
      </div>
    </ChatLayout>
  );
}; 