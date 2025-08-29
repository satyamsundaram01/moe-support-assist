/**
 * Storage Constants
 * Centralized storage configuration and keys
 */

import { STORAGE_KEYS } from './app';

// Storage Quota Management
export const STORAGE_QUOTA = {
  MAX_CONVERSATIONS: 50,
  MAX_MESSAGES_PER_CONVERSATION: 100,
  STORAGE_VERSION: '1.0.0',
  MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB
  CLEANUP_THRESHOLD: 0.8, // 80% usage triggers cleanup
} as const;

// Main STORAGE export that local-storage.ts expects
export const STORAGE = {
  KEYS: STORAGE_KEYS,
  QUOTA: STORAGE_QUOTA,
} as const;

// Export types for better type safety
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
export type StorageQuota = typeof STORAGE_QUOTA[keyof typeof STORAGE_QUOTA];
