// Types
export type {
  Citation,
  CitationSource,
  ProcessedCitation,
  PlatformInfo
} from './types';

// Utilities
export {
  processCitations,
  processTextWithCitations,
  getCitationDisplayText,
  formatCitationTitle,
  extractDomain,
  getUniquePlatforms
} from './utils';

// Components
export { PlatformIcon, MultiPlatformIcon } from './platform-icons';
export { InlineCitation } from './inline-citation';
export { CitationProcessor, CitationText } from './citation-processor';
export { SourcesButton } from './sources-button';
export { CitationCard, CompactCitationCard } from './citation-card';
export { CitationModal } from './citation-modal';
export { JsonRenderer } from './json-renderer';
export { CodeBlockRenderer } from './code-block-renderer';
export { ResponseSkeleton, StreamingSkeleton, AITypingIndicator } from './skeleton';
