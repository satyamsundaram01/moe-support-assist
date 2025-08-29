// config/thinking-config.ts
import {
  CpuChipIcon,
  WrenchScrewdriverIcon,
  LightBulbIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';

export interface ToolConfig {
  name: string;
  displayName: string;
  description: string;
  category: 'data' | 'communication' | 'search' | 'memory' | 'analysis' | 'transfer';
  icon: React.ComponentType<any>;
  statusMessages: {
    calling: string;
    completed: string;
    error: string;
    pending: string;
  };
  theme: {
    color: string;
    bgColor: string;
    borderColor: string;
  };
  priority: number; // For ordering in UI
  showArgs?: boolean;
  showResult?: boolean;
  resultFormatter?: (result: any) => string;
}

export interface ThinkingStepConfig {
  type: string;
  displayName: string;
  icon: React.ComponentType<any>;
  theme: {
    color: string;
    bgColor: string;
    borderColor: string;
  };
  description: string;
}

// Tool configurations
export const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'get_whatsapp_campaign_logs': {
    name: 'get_whatsapp_campaign_logs',
    displayName: 'WhatsApp Logs',
    description: 'Retrieving WhatsApp campaign logs',
    category: 'data',
    icon: ChatBubbleLeftRightIcon,
    priority: 1,
    statusMessages: {
      calling: 'Retrieving WhatsApp logs...',
      completed: 'I have retrieved WhatsApp logs.',
      error: 'Failed to retrieve WhatsApp logs',
      pending: 'Queued WhatsApp log retrieval'
    },
    theme: {
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30'
    },
    showResult: true
  },
  'get_sent_logs': {
    name: 'get_sent_logs',
    displayName: 'Sent Logs',
    description: 'Fetching sent logs(logs.push)',
    category: 'data',
    icon: DocumentTextIcon,
    priority: 2,
    statusMessages: {
      calling: 'Fetching sent logs...',
      completed: 'Sent logs retrieved',
      error: 'Failed to fetch sent logs',
      pending: 'Queued sent log retrieval'
    },
    theme: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30'
    }
  },
  'search_nodes': {
    name: 'search_nodes',
    displayName: 'Knowledge Search',
    description: 'Searching through knowledge base',
    category: 'search',
    icon: MagnifyingGlassIcon,
    priority: 3,
    statusMessages: {
      calling: 'Searching knowledge base...',
      completed: 'Knowledge search completed',
      error: 'Knowledge search failed',
      pending: 'Queued knowledge search'
    },
    theme: {
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    },
    showArgs: true
  },
  'add_episode': {
    name: 'add_episode',
    displayName: 'Memory Storage',
    description: 'Storing information to memory',
    category: 'memory',
    icon: BookmarkIcon,
    priority: 4,
    statusMessages: {
      calling: 'Storing to memory...',
      completed: 'Memory updated',
      error: 'Failed to store memory',
      pending: 'Queued memory storage'
    },
    theme: {
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30'
    }
  },
  'transfer_to_agent': {
    name: 'transfer_to_agent',
    displayName: 'Agent Transfer',
    description: 'Transferring to specialist agent',
    category: 'transfer',
    icon: ArrowUpRightIcon,
    priority: 10,
    statusMessages: {
      calling: 'Initiating agent transfer...',
      completed: 'Successfully transferred',
      error: 'Transfer failed',
      pending: 'Preparing transfer'
    },
    theme: {
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30'
    },
    showArgs: true,
    resultFormatter: (result) => `Transferred to: ${result?.agent_name || 'Unknown Agent'}`
  }
};

// Thinking step configurations
export const THINKING_STEP_CONFIGS: Record<string, ThinkingStepConfig> = {
  'planning': {
    type: 'planning',
    displayName: 'Planning',
    description: 'Planning approach to solve the request',
    icon: LightBulbIcon,
    theme: {
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30'
    }
  },
  'reasoning': {
    type: 'reasoning',
    displayName: 'Reasoning',
    description: 'Analyzing and reasoning through the problem',
    icon: CpuChipIcon,
    theme: {
      color: 'text-secondary-foreground',
      bgColor: 'bg-secondary/20',
      borderColor: 'border-secondary/30'
    }
  },
  'action': {
    type: 'action',
    displayName: 'Action',
    description: 'Taking action based on analysis',
    icon: ArrowRightIcon,
    theme: {
      color: 'text-accent-foreground',
      bgColor: 'bg-accent/20',
      borderColor: 'border-accent/30'
    }
  }
};

// Default fallback configurations
export const DEFAULT_TOOL_CONFIG: ToolConfig = {
  name: 'unknown',
  displayName: 'Unknown Tool',
  description: 'Processing...',
  category: 'analysis',
  icon: WrenchScrewdriverIcon,
  priority: 99,
  statusMessages: {
    calling: 'Processing...',
    completed: 'Completed',
    error: 'Error occurred',
    pending: 'Pending'
  },
  theme: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
    borderColor: 'border-muted/30'
  }
};

export const DEFAULT_THINKING_CONFIG: ThinkingStepConfig = {
  type: 'default',
  displayName: 'Thinking',
  description: 'Processing thoughts',
  icon: CpuChipIcon,
  theme: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
    borderColor: 'border-muted/30'
  }
};
