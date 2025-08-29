import { useMemo } from 'react';
import type { Citation, ProcessedCitation } from '../../citations/types';
import { PLATFORM_MAPPING, DEFAULT_PLATFORM } from '../../citations/types';

// This hook processes raw citations and prepares them for rendering.
export const useProcessedCitations = (citations: Citation[]) => {
  return useMemo(() => {
    return citations.map((citation, index) => {
      const domain = citation.sources[0]?.uri ? 
        new URL(citation.sources[0].uri).hostname : 'unknown';
      const platform = PLATFORM_MAPPING[domain] || DEFAULT_PLATFORM;
      
      return {
        ...citation,
        id: `citation-${index}`,
        platform,
        inlinePosition: index + 1,
        sourceCount: citation.sources.length,
      } as ProcessedCitation;
    });
  }, [citations]);
};

// This function injects inline citation markers into the content.
export const processContentWithCitations = (
  content: string,
  citations: ProcessedCitation[]
): string => {
  if (citations.length === 0) {
    return content;
  }

  let processedContent = content;
  
  // Sort citations by end_index in reverse order to avoid index shifting issues.
  const sortedCitations = [...citations].sort((a, b) => b.end_index - a.end_index);

  sortedCitations.forEach((citation) => {
    const citationMarker = ` [${citation.inlinePosition}]`;
    // Ensure we don't insert markers inside existing markdown, like links.
    const nextChar = processedContent[citation.end_index];
    if (nextChar === ')' || nextChar === ']') {
        // Heuristic to avoid breaking markdown links, insert before.
        processedContent = 
            processedContent.slice(0, citation.start_index) + 
            citationMarker + 
            processedContent.slice(citation.start_index);
    } else {
        processedContent = 
            processedContent.slice(0, citation.end_index) + 
            citationMarker + 
            processedContent.slice(citation.end_index);
    }
  });

  return processedContent;
};
