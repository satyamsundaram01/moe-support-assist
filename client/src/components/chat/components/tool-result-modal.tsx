import React, { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../../ui/button';
import {
  ChartBarIcon,
  DocumentTextIcon,
  XMarkIcon,
  TableCellsIcon,
  CodeBracketIcon,
  ClockIcon,
  UserIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  tool: { name: string; result: unknown; type: 'campaign' | 'logs' } | null;
}

// Campaign Info Component
const CampaignInfo: React.FC<{ data: unknown }> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  // Flatten JSON to key-value pairs
  const flattenObject = (obj: unknown, prefix = ''): Array<{ key: string; value: string; type: string }> => {
    const result: Array<{ key: string; value: string; type: string }> = [];
    
    if (obj === null || obj === undefined) {
      result.push({ key: prefix, value: 'null', type: 'null' });
      return result;
    }
    
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      result.push({ key: prefix, value: String(obj), type: typeof obj });
      return result;
    }
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const newPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
        result.push(...flattenObject(item, newPrefix));
      });
      return result;
    }
    
    if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        result.push(...flattenObject(value, newPrefix));
      });
    }
    
    return result;
  };

  const flattenedData = useMemo(() => flattenObject(data), [data]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return flattenedData;
    return flattenedData.filter(item => 
      item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [flattenedData, searchTerm]);

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex space-x-2">
        <Button
          variant={viewMode === 'table' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setViewMode('table')}
        >
          <TableCellsIcon className="h-4 w-4" />
          Table View
        </Button>
        <Button
          variant={viewMode === 'raw' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setViewMode('raw')}
        >
          <CodeBracketIcon className="h-4 w-4" />
          Raw JSON
        </Button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search properties or values..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            {/* Stats */}
            <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total Properties: {flattenedData.length}</span>
                {searchTerm && <span>Filtered: {filteredData.length}</span>}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-border rounded-lg scrollbar-hide">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-800 border-b border-border">
                    <th className="text-left p-3 font-medium text-foreground w-1/2">Property Path</th>
                    <th className="text-left p-3 font-medium text-foreground">Value</th>
                    <th className="text-left p-3 font-medium text-foreground w-20">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-surface-50 dark:hover:bg-surface-800/30">
                      <td className="p-3 font-mono text-xs text-primary break-all">
                        {item.key}
                      </td>
                      <td className="p-3">
                        <div className="max-w-md break-words">
                          <span className={`${
                            item.type === 'string' ? 'text-green-600 dark:text-green-400' :
                            item.type === 'number' ? 'text-blue-600 dark:text-blue-400' :
                            item.type === 'boolean' ? 'text-purple-600 dark:text-purple-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`}>
                            {item.value}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.type === 'string' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          item.type === 'number' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          item.type === 'boolean' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="raw"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-muted p-4 rounded-lg max-h-[calc(95vh-250px)] overflow-auto scrollbar-hide">
              <pre className="text-sm text-foreground font-mono">
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Logs Component
const LogsView: React.FC<{ data: unknown }> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  const logs = useMemo(() => {
    if (data && typeof data === 'object' && 'logs' in data && Array.isArray((data as Record<string, unknown>).logs)) {
      const rawLogs = (data as Record<string, unknown>).logs as Record<string, unknown>[];
      return rawLogs.map(logEntry => {
        if (typeof logEntry.msg === 'string') {
          try {
            return JSON.parse(logEntry.msg);
          } catch {
            return { raw_message: logEntry.msg };
          }
        }
        return logEntry;
      });
    }
    return [];
  }, [data]);

  // Parse stringified JSON from content.text
  const parseContentText = (content: unknown): unknown => {
    if (content && typeof content === 'object' && 'content' in content) {
      const contentArray = (content as Record<string, unknown>).content;
      if (Array.isArray(contentArray)) {
        const textItem = contentArray.find(item => 
          typeof item === 'object' && item && 'type' in item && 'text' in item && 
          (item as Record<string, unknown>).type === 'text'
        );
        
        if (textItem && typeof textItem === 'object' && textItem) {
          const textValue = (textItem as Record<string, unknown>).text;
          if (typeof textValue === 'string') {
            try {
              return JSON.parse(textValue);
            } catch {
              return { raw_text: textValue };
            }
          }
        }
      }
    }
    return content;
  };

  const parsedLogs = useMemo(() => {
    return logs.map(log => parseContentText(log));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return parsedLogs;
    return parsedLogs.filter((log: unknown) =>
      JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parsedLogs, searchTerm]);

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex space-x-2">
        <Button
          variant={viewMode === 'table' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setViewMode('table')}
        >
          <TableCellsIcon className="h-4 w-4" />
          Table View
        </Button>
        <Button
          variant={viewMode === 'raw' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setViewMode('raw')}
        >
          <CodeBracketIcon className="h-4 w-4" />
          Raw JSON
        </Button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            {/* Stats */}
            <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total Logs: {parsedLogs.length}</span>
                {searchTerm && <span>Filtered: {filteredLogs.length}</span>}
              </div>
            </div>

            {/* Log Cards */}
            <div className="space-y-3 max-h-[65vh] overflow-y-auto scrollbar-hide">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log: unknown, index: number) => {
                  const logObj = log as Record<string, unknown>;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      whileHover={{ 
                        scale: 1.01,
                        transition: { duration: 0.2 }
                      }}
                      className="bg-surface-50 dark:bg-surface-800 border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <ClockIcon className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                          <span className="text-xs text-muted-foreground">
                            Log #{index + 1}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {logObj.cid ? `CID: ${String(logObj.cid).slice(-8)}` : 'No CID'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(logObj).map(([key, value], valueIndex) => (
                          <motion.div 
                            key={key} 
                            className="flex items-start space-x-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: valueIndex * 0.02 }}
                          >
                            <span className="text-xs font-medium text-primary min-w-[80px]">
                              {key}:
                            </span>
                            <span className="text-xs text-foreground break-words flex-1">
                              {typeof value === 'string' && value.length > 100 
                                ? `${value.slice(0, 100)}...` 
                                : String(value)
                              }
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div 
                  className="text-center py-8 text-muted-foreground"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    animate={{ rotate: 5 }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  </motion.div>
                  <p>No logs found matching your search criteria</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="raw"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-muted p-4 rounded-lg max-h-[calc(95vh-250px)] overflow-auto scrollbar-hide">
              <pre className="text-sm text-foreground font-mono">
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ToolResultModal: React.FC<ToolResultModalProps> = ({ isOpen, onClose, tool }) => {
  const getModalTitle = () => {
    if (tool?.type === 'logs') {
      return 'Logs Analysis';
    }
    return 'Campaign Information';
  };

  const getModalIcon = () => {
    if (tool?.type === 'logs') {
      return <DocumentTextIcon className="h-6 w-6 text-text-secondary" />;
    }
    return <ChartBarIcon className="h-6 w-6 text-primary" />;
  };

  const toolCallContext = useMemo(() => {
    if (tool?.type === 'logs' && tool.result) {
      const result = tool.result as Record<string, unknown>;
      const logs = result.logs as Record<string, unknown>[];
      return {
        functionName: tool.name,
        timestamp: new Date().toLocaleString(),
        totalLogs: logs?.length || 0,
        dbName: logs?.[0]?.db_name as string || 'Unknown'
      };
    }
    return null;
  }, [tool]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-black dark:text-white z-50 grid w-full max-w-7xl translate-x-[-50%] translate-y-[-50%] gap-4 border dark:border-gray-800 p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[95vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center space-x-3">
              {getModalIcon()}
              <div>
                <Dialog.Title className="text-xl font-semibold text-foreground">
                  {getModalTitle()}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground">
                  {tool?.name}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Close modal"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Tool Call Context */}
          {toolCallContext && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-lg p-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <TagIcon className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Function:</span>
                  <span className="font-mono text-foreground">{toolCallContext.functionName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Called:</span>
                  <span className="text-foreground">{toolCallContext.timestamp}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Logs:</span>
                  <span className="text-foreground">{toolCallContext.totalLogs}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Database:</span>
                  <span className="text-foreground">{toolCallContext.dbName}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Modal Content */}
          <div className="overflow-hidden">
            {tool?.type === 'logs' ? (
              <LogsView data={tool.result} />
            ) : (
              <CampaignInfo data={tool?.result} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
