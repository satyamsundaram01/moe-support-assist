"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Heart, Star } from "lucide-react";
import { createPortal } from "react-dom";
import type { Prompt } from "../../stores/prompt-store";

interface ExpandablePromptCardProps {
  prompt: Prompt;
  onCopy: (prompt: Prompt) => void;
  onToggleFavorite: (promptId: string) => void;
  copiedId: string | null;
}

export function ExpandablePromptCard({ 
  prompt, 
  onCopy, 
  onToggleFavorite, 
  copiedId 
}: ExpandablePromptCardProps) {
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(false);
      }
    }

    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  const handleOutsideClick = () => setActive(false);

  const ModalContent = () => (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm h-full w-full z-[9999]"
            onClick={handleOutsideClick}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 grid place-items-center z-[10000]">
            <motion.div
              layoutId={`card-${prompt.id}-${id}`}
              ref={ref}
              className="w-full max-w-[600px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-card dark:bg-neutral-900 sm:rounded-3xl overflow-hidden border border-border shadow-2xl"
            >
              {/* Header with category and favorite */}
              <motion.div 
                layoutId={`header-${prompt.id}-${id}`}
                className="flex items-center justify-between p-4 border-b border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                    {prompt.category}
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">{prompt.likes}</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(prompt.id);
                  }}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    prompt.isFavorite
                      ? 'text-red-500 bg-red-500/10'
                      : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${prompt.isFavorite ? 'fill-current' : ''}`} />
                </motion.button>
              </motion.div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <div className="p-6">
                  <motion.h3
                    layoutId={`title-${prompt.id}-${id}`}
                    className="font-semibold text-foreground text-xl mb-3"
                  >
                    {prompt.title}
                  </motion.h3>
                  
                  <motion.p
                    layoutId={`description-${prompt.id}-${id}`}
                    className="text-muted-foreground text-base mb-4"
                  >
                    {prompt.description}
                  </motion.p>

                  {/* Tags */}
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap gap-2 mb-6"
                  >
                    {prompt.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-muted/50 text-muted-foreground text-xs rounded-lg"
                      >
                        {tag}
                      </span>
                    ))}
                  </motion.div>

                  {/* Full prompt content */}
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-muted/30 rounded-xl p-4 mb-6"
                  >
                    <h4 className="font-medium text-foreground mb-2">Prompt Content:</h4>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">
                      {prompt.content}
                    </p>
                  </motion.div>

                  {/* Actions */}
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-muted-foreground">
                      Created: {new Date(prompt.createdAt).toLocaleDateString()}
                    </span>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onCopy(prompt)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                    >
                      {copiedId === prompt.id ? (
                        <>
                          <Copy className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Prompt
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {/* Portal the modal to document.body */}
      {mounted && active && createPortal(<ModalContent />, document.body)}
      
      {/* Card in grid */}
      <motion.div
        layoutId={`card-${prompt.id}-${id}`}
        onClick={() => setActive(true)}
        className="group relative cursor-pointer h-full"
      >
        <div className="h-full bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
          {/* Category Badge */}
          <motion.div 
            layoutId={`header-${prompt.id}-${id}`}
            className="flex items-center justify-between mb-4 flex-shrink-0"
          >
            <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
              {prompt.category}
            </span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(prompt.id);
              }}
              className={`p-2 rounded-full transition-colors duration-200 ${
                prompt.isFavorite
                  ? 'text-red-500 bg-red-500/10'
                  : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${prompt.isFavorite ? 'fill-current' : ''}`} />
            </motion.button>
          </motion.div>

          {/* Title and Description */}
          <div className="flex-1">
            <motion.h3
              layoutId={`title-${prompt.id}-${id}`}
              className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-200"
            >
              {prompt.title}
            </motion.h3>
            
            <motion.p
              layoutId={`description-${prompt.id}-${id}`}
              className="text-muted-foreground text-sm mb-4 line-clamp-2"
            >
              {prompt.description}
            </motion.p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {prompt.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-muted/50 text-muted-foreground text-xs rounded-lg"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Stats and Actions */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                <span>{prompt.likes}</span>
              </div>
              <span>{new Date(prompt.createdAt).toLocaleDateString()}</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onCopy(prompt);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              {copiedId === prompt.id ? (
                <>
                  <Copy className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
