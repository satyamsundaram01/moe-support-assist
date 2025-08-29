import type { Citation, CitationSource, ProcessedCitation, PlatformInfo } from './types';
import { PLATFORM_MAPPING, DEFAULT_PLATFORM } from './types';

/**
 * Extract platform information from a URI
 */
export function getPlatformFromUri(uri: string): PlatformInfo {
  try {
    const url = new URL(uri);
    const hostname = url.hostname.toLowerCase();
    
    // Check for exact matches first
    if (PLATFORM_MAPPING[hostname]) {
      return PLATFORM_MAPPING[hostname];
    }
    
    // Check for partial matches (e.g., subdomain.reddit.com)
    for (const [domain, platform] of Object.entries(PLATFORM_MAPPING)) {
      if (hostname.includes(domain) || hostname.endsWith(domain)) {
        return platform;
      }
    }
    
    return DEFAULT_PLATFORM;
  } catch {
    return DEFAULT_PLATFORM;
  }
}

/**
 * Get the primary platform from multiple sources
 */
export function getPrimaryPlatform(sources: CitationSource[]): PlatformInfo {
  if (sources.length === 0) return DEFAULT_PLATFORM;
  
  // Use the first source's platform as primary
  return getPlatformFromUri(sources[0].uri);
}

/**
 * Process raw citations from API response into UI-ready format
 */
export function processCitations(citations: Citation[]): ProcessedCitation[] {
  return citations.map((citation, index) => {
    const platform = getPrimaryPlatform(citation.sources);
    
    return {
      ...citation,
      id: `citation-${index}`,
      platform,
      inlinePosition: index,
      sourceCount: citation.sources.length,
    };
  });
}

/**
 * Group citations by platform for sidebar display
 */
export function groupCitationsByPlatform(citations: ProcessedCitation[]): Record<string, ProcessedCitation[]> {
  return citations.reduce((groups, citation) => {
    const platformName = citation.platform.name;
    if (!groups[platformName]) {
      groups[platformName] = [];
    }
    groups[platformName].push(citation);
    return groups;
  }, {} as Record<string, ProcessedCitation[]>);
}

/**
 * Get unique platforms from citations for sources button
 */
export function getUniquePlatforms(citations: ProcessedCitation[]): PlatformInfo[] {
  const platformMap = new Map<string, PlatformInfo>();
  
  citations.forEach(citation => {
    citation.sources.forEach(source => {
      const platform = getPlatformFromUri(source.uri);
      platformMap.set(platform.domain, platform);
    });
  });
  
  return Array.from(platformMap.values());
}

/**
 * Process text with citations to create inline citation markers
 */
export function processTextWithCitations(text: string, citations: Citation[]): Array<{
  type: 'text' | 'citation';
  content: string;
  citation?: ProcessedCitation;
}> {
  if (!citations || citations.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const processedCitations = processCitations(citations);
  const segments: Array<{
    type: 'text' | 'citation';
    content: string;
    citation?: ProcessedCitation;
  }> = [];

  // Sort citations by start index to process them in order
  const sortedCitations = [...processedCitations].sort((a, b) => a.start_index - b.start_index);
  
  let currentIndex = 0;

  sortedCitations.forEach((citation) => {
    // Add text before citation
    if (currentIndex < citation.start_index) {
      const textBefore = text.slice(currentIndex, citation.start_index);
      if (textBefore) {
        segments.push({ type: 'text', content: textBefore });
      }
    }

    // Add citation marker
    segments.push({
      type: 'citation',
      content: citation.cited_text,
      citation
    });

    currentIndex = citation.end_index;
  });

  // Add remaining text after last citation
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      segments.push({ type: 'text', content: remainingText });
    }
  }

  return segments;
}

/**
 * Extract domain from URL for display
 */
export function extractDomain(uri: string): string {
  try {
    const url = new URL(uri);
    return url.hostname;
  } catch {
    return 'Unknown Source';
  }
}

/**
 * Format citation title for display
 */
export function formatCitationTitle(title: string): string {
  // Remove common prefixes and clean up title
  return title
    .replace(/^\d+\s*/, '') // Remove leading numbers
    .replace(/^(Why|How|What|When|Where)\+/gi, '$1 ') // Fix URL encoding
    .replace(/\+/g, ' ') // Replace + with spaces
    .replace(/%20/g, ' ') // Replace URL encoding
    .trim();
}

/**
 * Get citation display text for inline badges
 */
export function getCitationDisplayText(citation: ProcessedCitation): string {
  const platformName = citation.platform.name;
  const sourceCount = citation.sourceCount;
  
  if (sourceCount > 1) {
    return `${platformName} +${sourceCount - 1}`;
  }
  
  return platformName;
}

/**
 * Generate citation ID for tracking
 */
export function generateCitationId(citation: Citation, index: number): string {
  return `citation-${index}-${citation.start_index}-${citation.end_index}`;
}
