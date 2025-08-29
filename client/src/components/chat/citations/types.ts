// Citation types based on API response structure
export interface CitationSource {
  uri: string;
  title: string;
  reference_id: string;
  document_id?: string;
  struct_data?: Record<string, unknown> | null | unknown;
}

export interface Citation {
  cited_text: string;
  start_index: number;
  end_index: number;
  sources: CitationSource[];
}

export interface PlatformInfo {
  name: string;
  icon: string;
  color: string;
  domain: string;
}

export interface ProcessedCitation extends Citation {
  id: string;
  platform: PlatformInfo;
  inlinePosition: number;
  sourceCount: number;
}

export interface CitationModalState {
  isOpen: boolean;
  citation: ProcessedCitation | null;
  currentSourceIndex: number;
  totalSources: number;
}

export interface CitationSidebarState {
  isOpen: boolean;
  citations: ProcessedCitation[];
  groupedByPlatform: Record<string, ProcessedCitation[]>;
}

// Platform mapping for different citation sources
export const PLATFORM_MAPPING: Record<string, PlatformInfo> = {
  'help.moengage.com': {
    name: 'MoEngage Help',
    icon: 'moengage',
    color: '#FF6B35',
    domain: 'help.moengage.com'
  },
  'moengagetrial.atlassian.net': {
    name: 'Confluence',
    icon: 'confluence',
    color: '#0052CC',
    domain: 'moengagetrial.atlassian.net'
  },
  'zendesk.com': {
    name: 'Zendesk',
    icon: 'zendesk',
    color: '#03363D',
    domain: 'zendesk.com'
  },
  'reddit.com': {
    name: 'Reddit',
    icon: 'reddit',
    color: '#FF4500',
    domain: 'reddit.com'
  },
  'medium.com': {
    name: 'Medium',
    icon: 'medium',
    color: '#000000',
    domain: 'medium.com'
  },
  'threads.net': {
    name: 'Threads',
    icon: 'threads',
    color: '#000000',
    domain: 'threads.net'
  },
  'instagram.com': {
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    domain: 'instagram.com'
  },
  'snapchat.com': {
    name: 'Snapchat',
    icon: 'snapchat',
    color: '#FFFC00',
    domain: 'snapchat.com'
  },
  'facebook.com': {
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    domain: 'facebook.com'
  },
  'google.com': {
    name: 'Google',
    icon: 'google',
    color: '#4285F4',
    domain: 'google.com'
  },
  'pinterest.com': {
    name: 'Pinterest',
    icon: 'pinterest',
    color: '#BD081C',
    domain: 'pinterest.com'
  },
  'rss': {
    name: 'RSS',
    icon: 'rss',
    color: '#FF6600',
    domain: 'rss'
  }
};

// Default platform for unknown sources
export const DEFAULT_PLATFORM: PlatformInfo = {
  name: 'Unknown Source',
  icon: 'link',
  color: '#6B7280',
  domain: 'unknown'
};
