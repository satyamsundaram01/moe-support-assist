import React, { memo } from 'react';
import { cn } from '../../../../lib/utils';
import { motion } from 'framer-motion';

import type { ExtraProps } from 'react-markdown';

interface TableRendererProps extends ExtraProps {
  children?: React.ReactNode;
  className?: string;
}

export const TableRenderer: React.FC<TableRendererProps> = memo(({ children, className }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "overflow-x-auto my-6 rounded-xl border border-gray-200/70 dark:border-gray-700/80",
        "bg-white dark:bg-gray-800",
        className
      )}
    >
      <table className="w-full text-sm">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // Style thead
            if (child.type === 'thead') {
              return React.cloneElement(child as any, {
                className: cn(
                  "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800",
                  "border-b border-gray-200 dark:border-gray-600"
                ),
                children: React.Children.map((child as any).props.children, (tr: any) => {
                  if (React.isValidElement(tr) && tr.type === 'tr') {
                    return React.cloneElement(tr as any, {
                      children: React.Children.map((tr as any).props.children, (th: any) => {
                        if (React.isValidElement(th) && th.type === 'th') {
                          return React.cloneElement(th as any, {
                            className: cn(
                              "px-4 py-3 text-left text-xs font-semibold",
                              "text-gray-700 dark:text-gray-300 uppercase tracking-wider",
                              "border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                            )
                          });
                        }
                        return th;
                      })
                    });
                  }
                  return tr;
                })
              });
            }
            
            // Style tbody
            if (child.type === 'tbody') {
              return React.cloneElement(child as any, {
                children: React.Children.map((child as any).props.children, (tr: any, rowIndex: number) => {
                  if (React.isValidElement(tr) && tr.type === 'tr') {
                    return (
                      <motion.tr
                        key={rowIndex}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: rowIndex * 0.05, duration: 0.2 }}
                        className={cn(
                          "border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                          "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                        )}
                      >
                        {React.Children.map((tr as any).props.children, (td: any) => {
                          if (React.isValidElement(td) && td.type === 'td') {
                            return React.cloneElement(td as any, {
                              className: cn(
                                "px-4 py-3 text-sm",
                                "text-gray-900 dark:text-gray-100",
                                "border-r border-gray-100 dark:border-gray-700 last:border-r-0",
                                "align-top"
                              )
                            });
                          }
                          return td;
                        })}
                      </motion.tr>
                    );
                  }
                  return tr;
                })
              });
            }
          }
          return child;
        })}
      </table>
    </motion.div>
  );
});

TableRenderer.displayName = 'TableRenderer';
