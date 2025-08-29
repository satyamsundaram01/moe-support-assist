import { useCallback, useEffect, useRef, useState } from 'react';
import type { SSEEventData } from '../types';
import { chatAPI } from '../services/chat-api';

interface UseCustomSSEOptions {
  userId: string | null;
  sessionId: string | null;
  messageText: string | null;
  onMessage: (event: SSEEventData) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  enabled?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseCustomSSEReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  retryCount: number;
  startStream: (messageText: string) => Promise<void>;
  disconnect: () => void;
  retry: () => void;
}

export const useCustomSSE = ({
  userId,
  sessionId,
  messageText,
  onMessage,
  onError,
  onOpen,
  onClose,
  enabled = true,
  autoRetry = true,
  maxRetries = 3,
  retryDelay = 2000,
}: UseCustomSSEOptions): UseCustomSSEReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const disconnectRef = useRef<(() => void) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startStreamRef = useRef<((text: string) => Promise<void>) | null>(null);

  // Enhanced event data parsing for your backend format
  const parseEventData = useCallback((rawData: string): SSEEventData | null => {
    try {
      // Handle different data formats from your backend
      let cleanData = rawData;
      // Remove 'data: ' prefix if present
      if (cleanData.startsWith('data: ')) {
        cleanData = cleanData.substring(6);
      }
      
      // Handle connection close message
      if (cleanData.trim() === 'Connection closed') {
        console.log('SSE Connection closed by server');
        onClose?.();
        return null;
      }
      
      // Skip empty data, heartbeat, or connection messages
      if (!cleanData.trim() || 
          cleanData.trim() === '{}' || 
          cleanData.includes('connection established') ||
          cleanData.includes('heartbeat')) {
        return null;
      }
      
      const parsed = JSON.parse(cleanData);
      // Validate that it matches expected SSEEventData format
      if (parsed && parsed.content && parsed.content.parts) {
        return parsed as SSEEventData;
      }
      console.warn('Unknown SSE data format:', parsed);
      return null;
    } catch (err) {
      console.error('Failed to parse SSE event:', err, 'Raw data:', rawData);
      return null;
    }
  }, [onClose]);

  const handleSSEMessage = useCallback((event: MessageEvent) => {
    console.log('SSE Hook received message:', event.data);
    const parsedData = parseEventData(event.data);
    if (parsedData) {
      console.log('SSE Hook parsed data:', parsedData);
      onMessage(parsedData);
    } else {
      console.log('SSE Hook failed to parse data:', event.data);
    }
  }, [parseEventData, onMessage]);

  const handleSSEError = useCallback((event: Event) => {
    console.error('SSE Error:', event);
    const errorObj = new Error('SSE connection error');
    setError(errorObj);
    setIsConnected(false);
    setIsConnecting(false);
    onError?.(event);
    
    // Clear any existing retry timeout before setting a new one
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Use functional state update to get the current retry count
    setRetryCount(currentRetryCount => {
      if (autoRetry && currentRetryCount < maxRetries) {
        const newRetryCount = currentRetryCount + 1;
        const delay = retryDelay * Math.pow(2, newRetryCount - 1);
        
        retryTimeoutRef.current = setTimeout(() => {
          console.log(`Retrying SSE connection... (${newRetryCount}/${maxRetries})`);
          
          // Only retry if we still have valid parameters and timeout hasn't been cleared
          if (userId && sessionId && messageText && retryTimeoutRef.current) {
            // Clear the timeout reference before starting new stream
            retryTimeoutRef.current = null;
            
            // Call startStream through a ref to avoid circular dependency
            if (startStreamRef.current) {
              startStreamRef.current(messageText);
            }
          } else {
            retryTimeoutRef.current = null;
          }
        }, delay);
        
        return newRetryCount;
      } else {
        // Max retries reached or auto-retry disabled
        onClose?.();
        return currentRetryCount;
      }
    });
  }, [autoRetry, maxRetries, retryDelay, onError, onClose, userId, sessionId, messageText]);

  const handleSSEOpen = useCallback(() => {
    console.log('SSE Connected');
    setIsConnected(true);
    setIsConnecting(false);
    setError(null);
    setRetryCount(0);
    onOpen?.();
  }, [onOpen]);

  const startStream = useCallback(async (text: string) => {
    if (!userId || !sessionId || !enabled) {
      console.warn('Cannot start SSE: missing userId, sessionId, or disabled');
      return;
    }
    if (disconnectRef.current) {
      disconnectRef.current();
      disconnectRef.current = null;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const { disconnect } = await chatAPI.createSSEStream(
        userId,
        sessionId,
        text,
        handleSSEMessage,
        handleSSEError,
        handleSSEOpen,
        onClose
      );
      disconnectRef.current = disconnect;
    } catch (error) {
      console.error('Failed to start SSE stream:', error);
      setError(error instanceof Error ? error : new Error('Failed to start SSE stream'));
      setIsConnecting(false);
      handleSSEError(new Event('error'));
    }
  }, [userId, sessionId, enabled, handleSSEMessage, handleSSEError, handleSSEOpen, onClose]);

  // Update the ref whenever startStream changes
  useEffect(() => {
    startStreamRef.current = startStream;
  }, [startStream]);

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (disconnectRef.current) {
      disconnectRef.current();
      disconnectRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
    setRetryCount(0);
    onClose?.();
  }, [onClose]);

  const retry = useCallback(() => {
    if (messageText) {
      setRetryCount(0);
      startStream(messageText);
    }
  }, [messageText, startStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    retryCount,
    startStream,
    disconnect,
    retry,
  };
};
