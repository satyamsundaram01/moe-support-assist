import React from 'react';
import { Button } from '../../ui/button';
import { 
  ChartBarIcon, 
  DocumentTextIcon 
} from '@heroicons/react/24/outline';

interface ToolResultButtonProps {
  tool: { name: string; result: unknown; type: 'campaign' | 'logs' };
  onView: () => void;
}

export const ToolResultButton: React.FC<ToolResultButtonProps> = ({ tool, onView }) => {
  const getButtonVariant = () => {
    if (tool.type === 'logs') {
      return 'secondary' as const;
    }
    return 'primary' as const;
  };

  const getIcon = () => {
    if (tool.type === 'logs') {
      return <DocumentTextIcon className="h-4 w-4" />;
    }
    return <ChartBarIcon className="h-4 w-4" />;
  };

  const variant = getButtonVariant();
  const onClick = onView;
  const title = `View ${tool.name} data`;

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      className="flex items-center gap-2"
      title={title}
    >
      {getIcon()}
      {tool.type === 'logs' ? 'Logs' : 'Campaign Info'}
    </Button>
  );
};
