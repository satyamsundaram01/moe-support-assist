import React, { memo } from 'react';
import { MarkdownRenderer, JsonRenderer } from '../renderers';

// Simple inline error boundary for content processing
const ContentErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="content-error-boundary">
      {children}
    </div>
  );
};

interface ContentProcessorProps {
  content: string;
  className?: string;
}

const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

export const ContentProcessor: React.FC<ContentProcessorProps> = memo(({ content, className }) => {
  const renderContent = () => {
    if (isJsonString(content)) {
      return <JsonRenderer data={content} />;
    }
    return <MarkdownRenderer content={content} />;
  };

  return (
    <ContentErrorBoundary>
      <div className={className}>
        {renderContent()}
      </div>
    </ContentErrorBoundary>
  );
});

ContentProcessor.displayName = 'ContentProcessor';
