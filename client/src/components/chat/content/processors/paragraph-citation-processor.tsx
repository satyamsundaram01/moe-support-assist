import { useMemo } from 'react';
import type { Citation, ProcessedCitation } from '../../citations/types';
import { PLATFORM_MAPPING, DEFAULT_PLATFORM } from '../../citations/types';

export interface ParagraphCitation {
  paragraphIndex: number;
  citations: ProcessedCitation[];
  paragraphText: string;
}

// This hook processes raw citations and groups them by paragraphs
export const useParagraphCitations = (content: string, citations: Citation[]) => {
  return useMemo(() => {
    if (citations.length === 0) {
      return [];
    }

    // First, process citations to add platform info
    const processedCitations = citations.map((citation, index) => {
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

    // Split content into paragraphs (by double newlines or single newlines for lists)
    const paragraphs = content.split(/\n\s*\n|\n(?=\*\s|\d+\.\s|#)/);
    
    // Group citations by paragraph
    const paragraphCitations: ParagraphCitation[] = [];
    let currentOffset = 0;

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const paragraphStart = currentOffset;
      const paragraphEnd = currentOffset + paragraph.length;
      
      // Find citations that fall within this paragraph
      const paragraphCitationList = processedCitations.filter(citation => 
        citation.start_index >= paragraphStart && citation.end_index <= paragraphEnd
      );

      if (paragraphCitationList.length > 0) {
        paragraphCitations.push({
          paragraphIndex,
          citations: paragraphCitationList,
          paragraphText: paragraph.trim()
        });
      }

      // Update offset for next paragraph (including the separator)
      currentOffset = paragraphEnd + 2; // +2 for the double newline
    });

    return paragraphCitations;
  }, [content, citations]);
};

// This function processes content to remove inline citation markers and prepare for paragraph-based rendering
export const processContentForParagraphCitations = (content: string): string => {
  // Remove existing citation markers like [1], [2], etc.
  return content.replace(/\s*\[\d+\]/g, '');
};
