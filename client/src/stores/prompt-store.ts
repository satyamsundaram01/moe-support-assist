import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  likes: number;
  isFavorite: boolean;
  createdAt: string;
  createdBy?: string;
}

interface PromptStore {
  prompts: Prompt[];
  favorites: string[];
  searchQuery: string;
  selectedCategory: string;
  favoritesOnly: boolean;
  
  // Actions
  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (id: string, updates: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setFavoritesOnly: (favoritesOnly: boolean) => void;
  
  // Computed
  getFilteredPrompts: () => Prompt[];
  getFavoritePrompts: () => Prompt[];
  getCategories: () => string[];
}

export const usePromptStore = create<PromptStore>()(
  persist(
    (set, get) => ({
      prompts: [
        {
          id: '1',
          title: 'WhatsApp Troubleshooting Expert',
          description: 'Deep technical investigation of WhatsApp campaign delivery issues',
          content: 'I am experiencing issues with my WhatsApp campaign delivery. Campaign ID: [CAMPAIGN_ID], Database: [DATABASE_NAME]. The symptoms are: [describe specific issues like delivery failures, template rejections, rate limiting]. Please investigate the root cause and provide technical solutions.',
          category: 'WhatsApp',
          tags: ['whatsapp', 'delivery', 'troubleshooting', 'technical'],
          likes: 89,
          isFavorite: true,
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          title: 'Push Notification Expert',
          description: 'Advanced push notification delivery and optimization analysis',
          content: 'Analyze push notification performance issues for Campaign ID: [CAMPAIGN_ID]. Issues include: [delivery failures, targeting problems, engagement drops]. Need detailed diagnostic analysis with log investigation and optimization recommendations.',
          category: 'Push',
          tags: ['push', 'notifications', 'delivery', 'optimization'],
          likes: 76,
          isFavorite: true,
          createdAt: '2024-01-14'
        },
        {
          id: '3',
          title: 'MoEngage Platform Guide',
          description: 'How MoEngage systems work - architecture and workflows',
          content: 'Explain how MoEngage platform works: [specific area like campaign processing, data flow, integration architecture, user journey mapping]. I need to understand the technical details and best practices for [specific use case].',
          category: 'Platform',
          tags: ['platform', 'architecture', 'workflows', 'integration'],
          likes: 64,
          isFavorite: false,
          createdAt: '2024-01-13'
        },
        {
          id: '4',
          title: 'Campaign Performance Analyzer',
          description: 'Deep dive analysis of campaign metrics and optimization',
          content: 'Analyze campaign performance for Campaign ID: [CAMPAIGN_ID]. Focus on: [metrics like CTR, conversion rates, delivery rates, engagement patterns]. Provide insights on what\'s working, what\'s not, and specific optimization strategies.',
          category: 'Analytics',
          tags: ['analytics', 'performance', 'optimization', 'metrics'],
          likes: 58,
          isFavorite: true,
          createdAt: '2024-01-12'
        },
        {
          id: '5',
          title: 'Integration Troubleshooting Specialist',
          description: 'Resolve complex API and SDK integration issues',
          content: 'Having integration issues with: [API/SDK/Webhook]. Error details: [specific error messages or symptoms]. Platform: [iOS/Android/Web]. Need step-by-step debugging approach and technical solution with code examples if needed.',
          category: 'Integration',
          tags: ['integration', 'API', 'SDK', 'debugging'],
          likes: 71,
          isFavorite: false,
          createdAt: '2024-01-11'
        },
        {
          id: '6',
          title: 'Data Flow Investigator',
          description: 'Analyze user data tracking and attribute flow issues',
          content: 'Investigate data flow issues: [user attributes not updating, event tracking problems, segmentation issues]. Database: [DATABASE_NAME]. Need to trace data flow from source to destination and identify bottlenecks or failures.',
          category: 'Data',
          tags: ['data', 'tracking', 'attributes', 'segmentation'],
          likes: 52,
          isFavorite: true,
          createdAt: '2024-01-10'
        },
        {
          id: '7',
          title: 'Template & Content Optimizer',
          description: 'WhatsApp and Push template approval and optimization guide',
          content: 'Need help with template issues: [WhatsApp template rejections, push notification content optimization, messaging compliance]. Template details: [template content/issues]. Provide approval strategies and content optimization recommendations.',
          category: 'Content',
          tags: ['templates', 'content', 'approval', 'compliance'],
          likes: 43,
          isFavorite: false,
          createdAt: '2024-01-09'
        },
        {
          id: '8',
          title: 'Rate Limiting & Deliverability Expert',
          description: 'Advanced analysis of messaging limits and delivery optimization',
          content: 'Experiencing rate limiting or deliverability issues with: [WhatsApp/Push/Email]. Symptoms: [specific rate limit errors, delivery drops, throttling]. Need analysis of messaging tier status, limits, and delivery optimization strategies.',
          category: 'Delivery',
          tags: ['rate-limiting', 'deliverability', 'optimization', 'messaging'],
          likes: 67,
          isFavorite: true,
          createdAt: '2024-01-08'
        },
        {
          id: '9',
          title: 'Segmentation & Targeting Specialist',
          description: 'Advanced user segmentation and campaign targeting strategies',
          content: 'Help with segmentation issues: [segment not populating correctly, targeting criteria problems, audience size discrepancies]. Database: [DATABASE_NAME]. Need analysis of segment logic and targeting optimization.',
          category: 'Segmentation',
          tags: ['segmentation', 'targeting', 'audience', 'criteria'],
          likes: 39,
          isFavorite: false,
          createdAt: '2024-01-07'
        },
        {
          id: '10',
          title: 'Workflow Automation Expert',
          description: 'Complex journey and automation troubleshooting',
          content: 'Journey/workflow issues: [users not entering journey, trigger conditions not working, flow logic problems]. Journey ID: [JOURNEY_ID]. Need detailed flow analysis and logic troubleshooting with optimization recommendations.',
          category: 'Automation',
          tags: ['journeys', 'automation', 'workflows', 'triggers'],
          likes: 55,
          isFavorite: true,
          createdAt: '2024-01-06'
        }
      ],
      favorites: ['1', '3', '5'],
      searchQuery: '',
      selectedCategory: 'All',
      favoritesOnly: false,

      setPrompts: (prompts) => set({ prompts }),
      
      addPrompt: (prompt) => set((state) => ({
        prompts: [...state.prompts, prompt]
      })),
      
      updatePrompt: (id, updates) => set((state) => ({
        prompts: state.prompts.map(prompt =>
          prompt.id === id ? { ...prompt, ...updates } : prompt
        )
      })),
      
      deletePrompt: (id) => set((state) => ({
        prompts: state.prompts.filter(prompt => prompt.id !== id),
        favorites: state.favorites.filter(favId => favId !== id)
      })),
      
      toggleFavorite: (id) => set((state) => {
        const isFavorite = state.favorites.includes(id);
        const newFavorites = isFavorite
          ? state.favorites.filter(favId => favId !== id)
          : [...state.favorites, id];
        
        return {
          favorites: newFavorites,
          prompts: state.prompts.map(prompt =>
            prompt.id === id ? { ...prompt, isFavorite: !isFavorite } : prompt
          )
        };
      }),
      
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      
      setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
      
      getFilteredPrompts: () => {
        const { prompts, searchQuery, selectedCategory, favoritesOnly } = get();
        
        return prompts.filter(prompt => {
          const matchesSearch = searchQuery === '' ||
            prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
          
          const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory;
          const matchesFavorites = !favoritesOnly || prompt.isFavorite;
          
          return matchesSearch && matchesCategory && matchesFavorites;
        });
      },
      
      getFavoritePrompts: () => {
        const { prompts, favorites } = get();
        return prompts.filter(prompt => favorites.includes(prompt.id));
      },
      
      getCategories: () => {
        const { prompts } = get();
        const categories = [...new Set(prompts.map(prompt => prompt.category))];
        return ['All', ...categories.sort()];
      }
    }),
    {
      name: 'prompt-store',
      partialize: (state) => ({
        prompts: state.prompts,
        favorites: state.favorites,
        searchQuery: state.searchQuery,
        selectedCategory: state.selectedCategory,
        favoritesOnly: state.favoritesOnly
      })
    }
  )
); 