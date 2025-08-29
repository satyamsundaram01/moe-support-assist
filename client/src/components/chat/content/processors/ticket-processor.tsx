import React from 'react';
import { TicketChip } from '../../input/ticket-chip';

interface TicketProcessorProps {
  content: string;
  className?: string;
}

// Regular expression to match <zendesk_ticket_id>ID</> patterns
const TICKET_REGEX = /<zendesk_ticket_id>(\d+)<\/>/g;

export const TicketProcessor: React.FC<TicketProcessorProps> = ({
  content,
  className
}) => {
  // Parse the content and replace ticket tags with chips
  const processContent = (text: string) => {
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    // Reset regex lastIndex to ensure we start from the beginning
    TICKET_REGEX.lastIndex = 0;

    while ((match = TICKET_REGEX.exec(text)) !== null) {
      const [fullMatch, ticketId] = match;
      const matchIndex = match.index;

      // Add text before the match
      if (matchIndex > lastIndex) {
        const textBefore = text.slice(lastIndex, matchIndex);
        if (textBefore) {
          parts.push(textBefore);
        }
      }

      // Add the ticket chip
      parts.push(
        <TicketChip
          key={`ticket-${ticketId}-${matchIndex}`}
          ticketId={ticketId}
          readonly={true}
          className="mx-1"
        />
      );

      lastIndex = matchIndex + fullMatch.length;
    }

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText) {
        parts.push(remainingText);
      }
    }

    // If no matches found, return the original text
    if (parts.length === 0) {
      return text;
    }

    return parts;
  };

  const processedContent = processContent(content);

  // If it's just a string (no tickets found), return as-is
  if (typeof processedContent === 'string') {
    return <span className={className}>{processedContent}</span>;
  }

  // Return the processed content with chips
  return (
    <span className={className}>
      {processedContent.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        }
        return part; // React element (TicketChip)
      })}
    </span>
  );
};

// Utility function to check if content contains ticket references
export const hasTicketReferences = (content: string): boolean => {
  TICKET_REGEX.lastIndex = 0;
  return TICKET_REGEX.test(content);
};

// Utility function to extract ticket IDs from content
export const extractTicketIds = (content: string): string[] => {
  const ticketIds: string[] = [];
  let match;
  
  TICKET_REGEX.lastIndex = 0;
  while ((match = TICKET_REGEX.exec(content)) !== null) {
    ticketIds.push(match[1]);
  }
  
  return ticketIds;
};
