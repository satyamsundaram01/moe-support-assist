/**
 * Features Constants
 * Feature flags, toggles, and experimental features
 * Centralized for easy feature management and A/B testing
 */

export const FEATURES = {
  // Core Features
  core: {
    chat: true,
    streaming: true,
    thinking: true,
    toolCalls: true,
    citations: true,
    fileUpload: true,
    analytics: true,
    feedback: true,
    rateLimiting: true,
    caching: true,
    offlineMode: false,
    debugMode: false,
  } as const,

  // Chat Modes
  modes: {
    ask: true,
    investigate: true,
    hybrid: false,
    custom: false,
  } as const,

  // UI Features
  ui: {
    darkMode: true,
    lightMode: true,
    systemTheme: true,
    animations: true,
    transitions: true,
    hoverEffects: true,
    loadingStates: true,
    errorBoundaries: true,
    responsiveDesign: true,
    accessibility: true,
    keyboardNavigation: true,
    screenReader: true,
    highContrast: false,
    reducedMotion: false,
  } as const,

  // Input Features
  input: {
    slashCommands: true,
    autoComplete: true,
    suggestions: true,
    validation: true,
    characterCount: true,
    fileAttachments: true,
    voiceInput: false,
    imageInput: false,
    markdownSupport: true,
    codeHighlighting: true,
    emojiSupport: true,
    mentions: false,
  } as const,

  // Response Features
  response: {
    streaming: true,
    thinking: true,
    toolCalls: true,
    citations: true,
    codeBlocks: true,
    tables: true,
    charts: false,
    images: false,
    videos: false,
    audio: false,
    markdown: true,
    latex: false,
    mermaid: false,
    copyButton: true,
    shareButton: true,
    feedback: true,
  } as const,

  // Session Features
  session: {
    persistence: true,
    history: true,
    export: true,
    import: false,
    sharing: true,
    collaboration: false,
    versioning: false,
    branching: false,
    templates: false,
  } as const,

  // Admin Features
  admin: {
    dashboard: true,
    analytics: true,
    announcements: true,
    sessions: true,
    settings: true,
    users: false,
    roles: false,
    permissions: false,
    audit: false,
    monitoring: true,
    logging: true,
    debugging: false,
  } as const,

  // Integration Features
  integrations: {
    zendesk: true,
    slack: false,
    teams: false,
    discord: false,
    email: false,
    webhook: false,
    api: true,
    sdk: false,
    plugins: false,
    extensions: false,
  } as const,

  // Security Features
  security: {
    authentication: true,
    authorization: true,
    encryption: true,
    audit: false,
    compliance: false,
    sso: true,
    mfa: false,
    sessionManagement: true,
    rateLimiting: true,
    inputSanitization: true,
    outputEncoding: true,
    csrf: true,
    xss: true,
    sqlInjection: true,
  } as const,

  // Performance Features
  performance: {
    caching: true,
    compression: true,
    lazyLoading: true,
    virtualScrolling: false,
    codeSplitting: true,
    treeShaking: true,
    minification: true,
    optimization: true,
    monitoring: true,
    profiling: false,
    metrics: true,
    alerts: false,
  } as const,

  // Analytics Features
  analytics: {
    tracking: true,
    events: true,
    metrics: true,
    dashboards: true,
    reports: false,
    exports: false,
    realTime: false,
    historical: true,
    userBehavior: true,
    performance: true,
    errors: true,
    conversions: false,
  } as const,

  // Experimental Features
  experimental: {
    aiAssisted: false,
    voiceChat: false,
    videoChat: false,
    arVr: false,
    blockchain: false,
    machineLearning: false,
    predictiveAnalytics: false,
    naturalLanguageProcessing: false,
    computerVision: false,
    speechRecognition: false,
    gestureControl: false,
    biometricAuth: false,
  } as const,

  // Development Features
  development: {
    hotReload: true,
    sourceMaps: true,
    debugging: true,
    testing: true,
    linting: true,
    formatting: true,
    typeChecking: true,
    bundling: true,
    minification: true,
    optimization: true,
    monitoring: true,
    logging: true,
  } as const,

  // Testing Features
  testing: {
    unitTests: true,
    integrationTests: true,
    e2eTests: false,
    visualTests: false,
    performanceTests: false,
    accessibilityTests: false,
    securityTests: false,
    loadTests: false,
    stressTests: false,
    mutationTests: false,
    snapshotTests: true,
    coverage: true,
  } as const,

  // Deployment Features
  deployment: {
    ci: true,
    cd: true,
    docker: true,
    kubernetes: false,
    cloud: true,
    monitoring: true,
    logging: true,
    alerting: false,
    scaling: false,
    backup: false,
    disasterRecovery: false,
    blueGreen: false,
  } as const,
} as const;

/**
 * Feature flag helper functions
 */

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (featurePath: string): boolean => {
  const keys = featurePath.split('.');
  let value: any = FEATURES;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return false;
    }
  }
  
  return Boolean(value);
};

/**
 * Get feature value with fallback
 */
export const getFeatureValue = <T>(
  featurePath: string,
  fallback: T
): T => {
  const keys = featurePath.split('.');
  let value: any = FEATURES;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback;
    }
  }
  
  return value as T;
};

/**
 * Check if multiple features are enabled
 */
export const areFeaturesEnabled = (featurePaths: string[]): boolean => {
  return featurePaths.every(path => isFeatureEnabled(path));
};

/**
 * Check if any of the features are enabled
 */
export const isAnyFeatureEnabled = (featurePaths: string[]): boolean => {
  return featurePaths.some(path => isFeatureEnabled(path));
};

/**
 * Get all enabled features
 */
export const getEnabledFeatures = (): string[] => {
  const enabled: string[] = [];
  
  const traverse = (obj: any, path: string = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'boolean') {
        if (value) {
          enabled.push(currentPath);
        }
      } else if (typeof value === 'object' && value !== null) {
        traverse(value, currentPath);
      }
    }
  };
  
  traverse(FEATURES);
  return enabled;
};

/**
 * Get all disabled features
 */
export const getDisabledFeatures = (): string[] => {
  const disabled: string[] = [];
  
  const traverse = (obj: any, path: string = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'boolean') {
        if (!value) {
          disabled.push(currentPath);
        }
      } else if (typeof value === 'object' && value !== null) {
        traverse(value, currentPath);
      }
    }
  };
  
  traverse(FEATURES);
  return disabled;
};

/**
 * Feature guard for conditional rendering
 */
export const withFeature = <T>(
  featurePath: string,
  component: T,
  fallback?: T
): T | undefined => {
  return isFeatureEnabled(featurePath) ? component : fallback;
};

/**
 * Feature guard for conditional execution
 */
export const ifFeature = (
  featurePath: string,
  callback: () => void,
  fallback?: () => void
): void => {
  if (isFeatureEnabled(featurePath)) {
    callback();
  } else if (fallback) {
    fallback();
  }
}; 