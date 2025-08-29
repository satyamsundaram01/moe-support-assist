/**
 * UI Text Constants
 * All user-facing text, labels, placeholders, and messages
 * Organized by feature and component for easy maintenance and internationalization
 */

export const UI_TEXT = {
  // Common Actions
  actions: {
    send: 'Send',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    copy: 'Copy',
    share: 'Share',
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    retry: 'Retry',
    dismiss: 'Dismiss',
    expand: 'Expand',
    collapse: 'Collapse',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Reset Zoom',
    scrollToBottom: 'Scroll to bottom',
    backToChat: 'Back to chat',
    openSidebar: 'Open sidebar',
    collapseSidebar: 'Collapse sidebar',
    switchTheme: 'Switch to {theme} mode',
  } as const,

  // Button Labels
  buttons: {
    admin: 'Admin',
    chat: 'Chat',
    share: 'Share',
    settings: 'Settings',
    newChat: 'New Chat',
    loadMore: 'Load More',
    viewSources: 'View Sources',
    copyResponse: 'Copy response',
    helpful: 'This response was helpful',
    notHelpful: 'This response could be improved',
    tryAgain: 'Try Again',
    learnMore: 'Learn More',
    getStarted: 'Get Started',
    demo: 'Try Demo',
    configure: 'Configure',
    test: 'Test',
    create: 'Create',
    update: 'Update',
    remove: 'Remove',
    enable: 'Enable',
    disable: 'Disable',
    toggle: 'Toggle',
    select: 'Select',
    clear: 'Clear',
    reset: 'Reset',
    apply: 'Apply',
    confirm: 'Confirm',
    proceed: 'Proceed',
    continue: 'Continue',
    finish: 'Finish',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    upload: 'Upload',
    download: 'Download',
    export: 'Export',
    import: 'Import',
  } as const,

  // Form Labels and Placeholders
  forms: {
    placeholders: {
      search: 'Search...',
      searchTickets: 'Search tickets...',
      searchProperties: 'Search properties or values...',
      searchLogs: 'Search logs...',
      filterByUser: 'Filter by User ID',
      searchSessions: 'Search by query, user ID, or session ID...',
      announcementTitle: 'Announcement Title',
      announcementMessage: 'Enter your announcement message here...',
      optionalTitle: 'Optional title',
      broadcastMessage: 'Broadcast message to all users',
      maxImpressions: '5000',
      datePicker: 'Pick a date',
      dateRange: 'Pick a date range',
    },
    labels: {
      announcementId: 'Announcement ID',
      announcementTitle: 'Announcement Title',
      announcementMessage: 'Announcement Message',
      announcementType: 'Announcement Type',
      announcementSeverity: 'Announcement Severity',
      announcementFrequency: 'Announcement Frequency',
      maxImpressions: 'Max impressions per user',
      startDateTime: 'Start datetime',
      endDateTime: 'End datetime',
      enabled: 'Enabled',
      dismissible: 'Dismissible',
      bannerEnabled: 'Banner Enabled',
      bannerSeverity: 'Banner Severity',
      askMode: 'Ask Mode',
      investigateMode: 'Investigate Mode',
      slashCommands: 'Slash Commands',
      fileUpload: 'File Upload',
      analytics: 'Analytics',
      feedback: 'Feedback',
      rateLimiting: 'Rate Limiting',
    },
  } as const,

  // Modal and Dialog Titles
  modals: {
    titles: {
      sessionDetails: 'Session Details',
      toolResult: 'Tool Result',
      feedback: 'Feedback',
      ticketSelector: 'Select Ticket',
      error: 'Error',
      confirmation: 'Confirmation',
      settings: 'Settings',
      help: 'Help',
      about: 'About',
    },
    messages: {
      confirmDelete: 'Are you sure you want to delete this item?',
      confirmAction: 'Are you sure you want to proceed?',
      unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
      errorOccurred: 'An error occurred. Please try again.',
      loading: 'Loading...',
      processing: 'Processing...',
      creatingSession: 'Creating session...',
      saving: 'Saving...',
      deleting: 'Deleting...',
    },
  } as const,

  // Toast Messages
  toasts: {
    success: {
      copied: 'Copied!',
      saved: 'Saved successfully',
      deleted: 'Deleted successfully',
      updated: 'Updated successfully',
      created: 'Created successfully',
      messageSent: 'Message sent successfully',
    },
    error: {
      copyFailed: 'Failed to copy',
      saveFailed: 'Failed to save',
      deleteFailed: 'Failed to delete',
      updateFailed: 'Failed to update',
      createFailed: 'Failed to create',
      messageFailed: 'Failed to send message',
      sessionFailed: 'Failed to create session',
      networkError: 'Network error. Please check your connection.',
      authRequired: 'You must be logged in to perform this action.',
      maxTurnsReached: 'Max turns reached for this conversation.',
      validationFailed: 'Please check your input and try again.',
    },
    info: {
      sessionCreated: 'Session created successfully',
      processing: 'Processing your request...',
      loading: 'Loading data...',
    },
    warning: {
      unsavedChanges: 'You have unsaved changes',
      sessionTimeout: 'Session will timeout soon',
      maxLength: 'Maximum length reached',
    },
  } as const,

  // Loading and Status Messages
  status: {
    loading: 'Loading...',
    loadingMessages: 'Loading messages...',
    loadingSessions: 'Loading sessions...',
    loadingData: 'Loading data...',
    processing: 'Processing...',
    creatingSession: 'Creating session...',
    sendingMessage: 'Sending message...',
    streaming: 'Streaming response...',
    thinking: 'Thinking...',
    responding: 'Responding...',
    toolCalling: 'Calling tool...',
    finalizing: 'Finalizing...',
    idle: 'Idle',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
  } as const,

  // Empty States
  emptyStates: {
    noMessages: 'No messages yet',
    noConversations: 'No conversations yet',
    noSessions: 'No sessions found',
    noResults: 'No results found',
    noAnnouncements: 'No announcements found',
    noTickets: 'No tickets found',
    noData: 'No data available',
    noHistory: 'No history available',
    noSources: 'No sources available',
    noCitations: 'No citations available',
    noThinking: 'No thinking steps available',
    noToolCalls: 'No tool calls available',
  } as const,

  // Page Titles and Headers
  pages: {
    chat: 'Chat',
    admin: 'Admin',
    settings: 'Settings',
    analytics: 'Analytics',
    announcements: 'Announcements',
    sessions: 'Sessions',
    promptLibrary: 'Prompt Library',
    help: 'Help',
    about: 'About',
  } as const,

  // Section Headers
  sections: {
    sessionOverview: 'Session Overview',
    keyFeatures: 'Key Features',
    toastNotifications: 'Toast Notifications',
    alertModals: 'Alert Modals',
    configuration: 'Configuration',
    tryItOut: 'Try It Out',
    demoFeatures: 'Demo Features',
    announcements: 'Announcements',
    settings: 'Settings',
    analytics: 'Analytics',
    sessions: 'Sessions',
  } as const,

  // Tooltips and Help Text
  tooltips: {
    switchModes: 'Switch between Ask and Investigate modes',
    copyResponse: 'Copy response to clipboard',
    helpful: 'Mark this response as helpful',
    notHelpful: 'Mark this response as not helpful',
    viewSources: 'View source information',
    expandTimeline: 'Expand timeline',
    collapseTimeline: 'Collapse timeline',
    removeTicket: 'Remove ticket',
    closeModal: 'Close modal',
    closeToast: 'Close notification',
    dismissBanner: 'Dismiss banner',
    toggleEnabled: 'Toggle enabled',
    toggleDismissible: 'Toggle banner dismissible',
    toggleAskMode: 'Toggle Ask Mode',
    toggleInvestigateMode: 'Toggle Investigate Mode',
    toggleSlashCommands: 'Toggle Slash Commands',
    toggleFileUpload: 'Toggle File Upload',
    toggleAnalytics: 'Toggle Analytics',
    toggleFeedback: 'Toggle Feedback',
    toggleRateLimiting: 'Toggle Rate Limiting',
    unpinColumn: 'Unpin {title} column',
    selectRow: 'Select row',
    selectAll: 'Select all',
    dragToReorder: 'Drag to reorder',
    viewCitations: 'View {count} citation{plural} from {platforms}',
  } as const,

  // Accessibility Labels
  a11y: {
    openSidebar: 'Open sidebar',
    closeSidebar: 'Close sidebar',
    backToChat: 'Back to chat',
    switchTheme: 'Switch to {theme} mode',
    copyToClipboard: 'Copy to clipboard',
    expandCollapse: '{action}',
    expandJSON: 'Expand JSON',
    collapseJSON: 'Collapse JSON',
    removeItem: 'Remove {item}',
    selectRow: 'Select row',
    selectAll: 'Select all',
    unpinColumn: 'Unpin {title} column',
    dragToReorder: 'Drag to reorder',
    viewSources: 'View {count} source{plural} from {platforms}',
    viewCitations: 'View {count} citation{plural} from {platforms}',
    closeNotification: 'Close notification',
    closeModal: 'Close modal',
    dismissBanner: 'Dismiss banner',
    toggleEnabled: 'Toggle enabled',
    toggleDismissible: 'Toggle banner dismissible',
    toggleAskMode: 'Toggle Ask Mode',
    toggleInvestigateMode: 'Toggle Investigate Mode',
    toggleSlashCommands: 'Toggle Slash Commands',
    toggleFileUpload: 'Toggle File Upload',
    toggleAnalytics: 'Toggle Analytics',
    toggleFeedback: 'Toggle Feedback',
    toggleRateLimiting: 'Toggle Rate Limiting',
  } as const,

  // Error Messages
  errors: {
    general: {
      somethingWentWrong: 'Something went wrong. Please try again.',
      networkError: 'Network error. Please check your connection.',
      serverError: 'Server error. Please try again later.',
      timeout: 'Request timed out. Please try again.',
      unauthorized: 'You are not authorized to perform this action.',
      forbidden: 'Access forbidden.',
      notFound: 'Resource not found.',
      validationFailed: 'Validation failed. Please check your input.',
      unknownError: 'An unknown error occurred.',
    },
    auth: {
      loginRequired: 'You must be logged in to perform this action.',
      sessionExpired: 'Your session has expired. Please log in again.',
      invalidCredentials: 'Invalid credentials.',
      authFailed: 'Authentication failed.',
    },
    chat: {
      messageFailed: 'Failed to send message. Please try again.',
      sessionFailed: 'Failed to create session. Please try again.',
      streamingFailed: 'Streaming failed. Please try again.',
      maxTurnsReached: 'Maximum conversation turns reached.',
      invalidMessage: 'Invalid message format.',
      messageTooLong: 'Message is too long.',
    },
    api: {
      requestFailed: 'API request failed.',
      invalidResponse: 'Invalid response from server.',
      rateLimited: 'Too many requests. Please try again later.',
      serviceUnavailable: 'Service temporarily unavailable.',
    },
  } as const,

  // Success Messages
  success: {
    messageSent: 'Message sent successfully',
    sessionCreated: 'Session created successfully',
    dataSaved: 'Data saved successfully',
    dataDeleted: 'Data deleted successfully',
    dataUpdated: 'Data updated successfully',
    copied: 'Copied to clipboard',
    actionCompleted: 'Action completed successfully',
  } as const,

  // Warning Messages
  warnings: {
    unsavedChanges: 'You have unsaved changes',
    sessionTimeout: 'Session will timeout soon',
    maxLength: 'Maximum length reached',
    dataLoss: 'This action may result in data loss',
    experimental: 'This feature is experimental',
    deprecated: 'This feature is deprecated',
  } as const,

  // Info Messages
  info: {
    processing: 'Processing your request...',
    loading: 'Loading data...',
    creatingSession: 'Creating session...',
    streaming: 'Streaming response...',
    thinking: 'AI is thinking...',
    toolCalling: 'AI is calling a tool...',
    finalizing: 'Finalizing response...',
  } as const,
} as const;

/**
 * Helper function to format tooltip text with dynamic values
 */
export const formatTooltip = (key: string, values: Record<string, string | number>): string => {
  let text = UI_TEXT.tooltips[key as keyof typeof UI_TEXT.tooltips] as string;
  
  Object.entries(values).forEach(([placeholder, value]) => {
    text = text.replace(`{${placeholder}}`, String(value));
  });
  
  return text;
};

/**
 * Helper function to format accessibility labels with dynamic values
 */
export const formatA11yLabel = (key: string, values: Record<string, string | number>): string => {
  let text = UI_TEXT.a11y[key as keyof typeof UI_TEXT.a11y] as string;
  
  Object.entries(values).forEach(([placeholder, value]) => {
    text = text.replace(`{${placeholder}}`, String(value));
  });
  
  return text;
}; 