import React, { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import { 
  MagnifyingGlassPlusIcon, 
  MagnifyingGlassMinusIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface MermaidRendererProps {
  children?: React.ReactNode;
  className?: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = memo(({ children, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderState, setRenderState] = useState<{
    status: 'idle' | 'processing' | 'success' | 'error' | 'fallback';
    content: string;
    error?: string;
    attempts: Array<{ type: string; success: boolean; error?: string; fixes?: string[] }>;
  }>({
    status: 'idle',
    content: '',
    attempts: []
  });
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const renderAttemptRef = useRef(0);

  // Enhanced preprocessing with better error handling
  const preprocessMermaidContent = (content: string): { code: string; fixes: string[] } => {
    if (!content) return { code: '', fixes: [] };
    
  let processedContent = content.trim();
    const fixes: string[] = [];
  
  // Handle markdown code block format
  if (processedContent.startsWith('```mermaid') && processedContent.includes('```')) {
    processedContent = processedContent
      .replace(/^```mermaid\r?\n/, '')
      .replace(/\r?\n```$/, '');
      fixes.push('Removed markdown code block wrapper');
  }
  
    // Fix 1: Handle problematic characters and semicolons
    const originalContent = processedContent;
  processedContent = processedContent
      .replace(/};/g, '}')  // Remove semicolons after braces
      .replace(/\];/g, ']')  // Remove semicolons after brackets
      .replace(/\);/g, ')')  // Remove semicolons after parentheses
      .replace(/([A-Z])\s*--\s*([^-\s])/g, '$1 -- "$2"')  // Quote text after dashes
      .replace(/--\s*([^->\s][^->\n]*?)\s*-->/g, '-- "$1" -->')  // Quote edge labels
      .replace(/\s*;\s*$/gm, '')  // Remove trailing semicolons
      .replace(/\{([^}]*)\}/g, (_match, content) => {
        // Clean up content inside braces
        const cleaned = content.replace(/[{}]/g, '').trim();
        return `["${cleaned}"]`;  // Convert to square brackets with quotes
      });

    if (processedContent !== originalContent) {
      fixes.push('Fixed problematic characters and semicolons');
  }
  
    // Fix 2: Handle complex edge labels and connections
  processedContent = processedContent
      .replace(/(\w+)\s*--\s*([^->\n]+?)\s*-->\s*(\w+)/g, (_match, from, label, to) => {
        const cleanLabel = label.replace(/[{}]/g, '').trim();
        if (cleanLabel && !cleanLabel.startsWith('"')) {
          return `${from} --> ${to}`;  // Simplified - remove complex labels
        }
        return `${from} --> ${to}`;
      })
      .replace(/(\w+)\s*--\s*(\w+)\s*-->\s*(\w+)/g, '$1 --> $3')  // Remove intermediate nodes in connections
      .replace(/(\w+)\s*--\s*(\w+)/g, '$1 --> $2');  // Convert simple dashes to arrows

    // Fix 3: Clean up node definitions with problematic content
  processedContent = processedContent
      .replace(/([A-Z]+)\[([^\]]*?)\(/g, '$1["$2"]')  // Fix malformed node labels
      .replace(/([A-Z]+)\[([^\]]*?)on app launch\)([^\]]*?)\]/g, '$1["$2 on app launch $3"]')  // Fix specific parsing issue
      .replace(/\[([^\]]*?)(\([^)]*\))([^\]]*?)\]/g, '["$1$2$3"]')  // Quote complex labels
      .replace(/\[([^"\]]*[{}()][^"\]]*)\]/g, '["$1"]')  // Quote labels with special chars
      .replace(/\[([^"\]]*\s+[^"\]]*)\]/g, '["$1"]');  // Quote labels with spaces

    // Fix 4: Remove subgraphs entirely to avoid parsing issues
    const subgraphRegex = /subgraph\s+[^\n]*\n([^]*?)(?=\nend|\n[A-Z]|\n$|$)/g;
    processedContent = processedContent.replace(subgraphRegex, '');
    processedContent = processedContent.replace(/\bend\b/g, '');  // Remove orphaned 'end' keywords
    
    if (processedContent.includes('subgraph')) {
      fixes.push('Removed problematic subgraphs');
    }

    // Fix 5: Clean up arrows and ensure proper syntax
  processedContent = processedContent
      .replace(/-->/g, ' --> ')  // Ensure spaces around arrows
      .replace(/--->/g, ' --> ')  // Fix triple dashes
      .replace(/\s+-->\s+/g, ' --> ')  // Normalize arrow spacing
      .replace(/(\w+)\s*\{\s*([^}]*)\s*\}/g, '$1["$2"]')  // Convert remaining braces to brackets
      .replace(/\s*;\s*\n/g, '\n')  // Remove semicolons at line ends
      .replace(/\n{3,}/g, '\n\n')  // Normalize line breaks
      .trim();

    // Fix 6: Remove any remaining style definitions that cause issues
    const styleLines = processedContent.split('\n').filter(line => 
      !line.trim().startsWith('style ') && 
      !line.trim().startsWith('class ') &&
      !line.trim().startsWith('classDef ')
    );
    
    if (styleLines.length !== processedContent.split('\n').length) {
      fixes.push('Removed style definitions');
      processedContent = styleLines.join('\n');
  }
  
    // Fix 7: Ensure proper graph declaration
    if (!processedContent.match(/^(graph|flowchart)\s+(TB|BT|RL|LR|TD)/m)) {
      if (processedContent.includes('graph')) {
        processedContent = processedContent.replace(/^graph(?!\s+(TB|BT|RL|LR|TD))/m, 'graph TD');
      } else {
        processedContent = `graph TD\n${processedContent}`;
      }
      fixes.push('Added proper graph declaration');
    }

    return { code: processedContent, fixes };
  };

  // Enhanced fallback generator that creates guaranteed-to-work diagrams
  const generateFallback = (originalContent: string): string => {
    // Extract meaningful terms from the original content
    const terms = originalContent
      .replace(/[^\w\s]/g, ' ')  // Remove special chars
      .split(/\s+/)
      .filter(term => term.length > 2 && term.length < 20)
      .filter(term => !['graph', 'subgraph', 'end', 'style', 'class'].includes(term.toLowerCase()))
      .slice(0, 6);

    if (terms.length === 0) {
      return `graph TD
    A["Start"] --> B["Process"]
    B --> C["End"]`;
    }

    // Create simple, guaranteed syntax
    const nodeDefinitions = terms.map((term, i) => {
      const nodeId = String.fromCharCode(65 + i);  // A, B, C, etc.
      const label = term.replace(/[^\w\s]/g, '').trim();
      return `    ${nodeId}["${label}"]`;
    }).join('\n');

    const connections = terms.slice(0, -1).map((_, i) => {
      const from = String.fromCharCode(65 + i);
      const to = String.fromCharCode(65 + i + 1);
      return `    ${from} --> ${to}`;
    }).join('\n');

    return `graph TD\n${nodeDefinitions}\n${connections}`;
  };

  // Ultra-simple fallback when everything else fails
  const generateUltraSimpleFallback = (): string => {
    return `graph TD
    A["Process Flow"] --> B["Step 1"]
    B --> C["Step 2"]
    C --> D["Complete"]`;
  };

  // Updated render function with more fallback strategies
  const renderMermaid = async (content: string) => {
    if (!content.trim()) return;

    setRenderState(prev => ({ ...prev, status: 'processing', attempts: [] }));
    const attempts: Array<{ type: string; success: boolean; error?: string; fixes?: string[] }> = [];

    try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        
      mermaid.initialize({
            startOnLoad: false,
        theme: 'base',
            flowchart: {
              useMaxWidth: true,
          htmlLabels: false,  // Disable HTML labels to avoid parsing issues
          curve: 'basis',
            },
            themeVariables: {
              primaryColor: '#3b82f6',
              primaryTextColor: '#1f2937',
              primaryBorderColor: '#3b82f6',
              lineColor: '#6b7280',
            },
        securityLevel: 'loose',
        logLevel: 'error',
      });

      // Strategy 1: Try original content with basic cleanup
      try {
        const basicCleanup = content
          .replace(/```mermaid\n?/g, '')
          .replace(/\n?```/g, '')
          .replace(/};/g, '}')
          .replace(/\];/g, ']')
          .trim();
        
        const id1 = `mermaid-basic-${Date.now()}`;
        const { svg: svg1 } = await mermaid.render(id1, basicCleanup);
        
        setRenderState({
          status: 'success',
          content: svg1,
          attempts: [{ type: 'basic cleanup', success: true }]
        });
        return;
      } catch (error1) {
        attempts.push({ 
          type: 'basic cleanup', 
          success: false, 
          error: (error1 as Error).message 
        });
      }

      // Strategy 2: Full preprocessing
      try {
        const { code: processedContent, fixes } = preprocessMermaidContent(content);
        const id2 = `mermaid-processed-${Date.now()}`;
        const { svg: svg2 } = await mermaid.render(id2, processedContent);
        
        setRenderState({
          status: 'success',
          content: svg2,
          attempts: [...attempts, { type: 'advanced processing', success: true, fixes }]
        });
        return;
      } catch (error2) {
        const { fixes } = preprocessMermaidContent(content);
        attempts.push({ 
          type: 'advanced processing', 
          success: false, 
          error: (error2 as Error).message,
          fixes 
        });
              }
              
      // Strategy 3: Smart fallback
      try {
        const fallbackContent = generateFallback(content);
        const id3 = `mermaid-fallback-${Date.now()}`;
        const { svg: svg3 } = await mermaid.render(id3, fallbackContent);
        
        setRenderState({
          status: 'fallback',
          content: svg3,
          attempts: [...attempts, { type: 'smart fallback', success: true }]
        });
        return;
      } catch (error3) {
        attempts.push({ 
          type: 'smart fallback', 
          success: false, 
          error: (error3 as Error).message 
        });
      }

      // Strategy 4: Ultra-simple fallback
      try {
        const ultraSimple = generateUltraSimpleFallback();
        const id4 = `mermaid-ultra-${Date.now()}`;
        const { svg: svg4 } = await mermaid.render(id4, ultraSimple);
        
        setRenderState({
          status: 'fallback',
          content: svg4,
          attempts: [...attempts, { type: 'ultra-simple fallback', success: true }]
        });
        return;
      } catch (error4) {
        attempts.push({ 
          type: 'ultra-simple fallback', 
          success: false, 
          error: (error4 as Error).message 
        });
      }

      throw new Error('All rendering strategies failed');

    } catch (finalError) {
      setRenderState({
        status: 'error',
        content: '',
        error: (finalError as Error).message,
        attempts
      });
    }
  };

  // Extract content from children
  useEffect(() => {
    if (!children) return;

    let content = '';
    if (typeof children === 'string') {
      content = children;
    } else if (Array.isArray(children)) {
      content = children.map(child => String(child)).join('');
    } else {
      content = String(children);
    }

    if (content.trim()) {
      renderMermaid(content.trim());
    }
  }, [children]);

  // Zoom and pan controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.1, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setZoomLevel(prev => Math.max(0.5, Math.min(2, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  // Render error state
  if (renderState.status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "my-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5",
          className
        )}
      >
        <div className="flex items-center gap-2 mb-3 text-destructive">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Diagram Rendering Failed</span>
        </div>
        
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Multiple rendering strategies were attempted:
          </div>
          
          {renderState.attempts.map((attempt, index) => (
            <div key={index} className="text-xs bg-muted/30 p-2 rounded">
              <div className="font-medium capitalize">{attempt.type} Method:</div>
              <div className="text-destructive">{attempt.error}</div>
              {attempt.fixes && attempt.fixes.length > 0 && (
                <div className="mt-1 text-muted-foreground">
                  Fixes applied: {attempt.fixes.join(', ')}
                </div>
              )}
            </div>
          ))}
          
        <button 
            onClick={() => {
              renderAttemptRef.current = 0;
              const content = typeof children === 'string' ? children : String(children || '');
              renderMermaid(content);
            }}
            className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
        </div>
      </motion.div>
    );
  }

  // Render success/fallback state
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "my-6 p-4 rounded-xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs font-medium uppercase tracking-wider">
            {renderState.status === 'fallback' && '⚠️ '}Diagram
          </span>
          {renderState.status === 'fallback' && (
            <span className="text-xs text-amber-600">Simplified</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-muted/50 transition-colors"
            title="Zoom Out"
          >
            <MagnifyingGlassMinusIcon className="w-4 h-4" />
          </button>
          <span className="text-xs px-2 py-1 bg-muted/50 rounded">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-muted/50 transition-colors"
            title="Zoom In"
          >
            <MagnifyingGlassPlusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded hover:bg-muted/50 transition-colors"
            title="Reset Zoom"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden max-h-[600px] cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {renderState.status === 'processing' ? (
          <div className="flex items-center justify-center min-h-[200px] gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-sm">Rendering diagram...</span>
          </div>
        ) : (
          <div
            className="w-full flex justify-center transition-transform duration-200"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center'
            }}
            dangerouslySetInnerHTML={{ __html: renderState.content }}
          />
        )}
      </div>

      {renderState.status === 'fallback' && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          ⚠️ Original diagram had issues. Showing simplified version.
        </div>
      )}
    </motion.div>
  );
});

MermaidRenderer.displayName = 'MermaidRenderer';