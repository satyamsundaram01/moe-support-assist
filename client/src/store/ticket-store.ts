// Ticket store for managing ticket state and operations
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Ticket, TicketFilters, TicketSelection } from '../types/ticket';
import { getTicketService } from '../services/ticket-service';

interface TicketState {
  // Ticket data
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  ticketStats: {
    total: number;
    open: number;
    pending: number;
    solved: number;
    urgent: number;
    high: number;
  } | null;

  // UI state
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;

  // Filters and pagination
  filters: TicketFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // Modal state
  isModalOpen: boolean;
  modalType: 'ticket_selector' | 'ticket_details' | null;
  searchQuery: string;

  // Selection state
  selectedTicketId: string | null;
  ticketContext: Record<string, any> | null;
}

interface TicketActions {
  // Data fetching
  fetchMyTickets: (filters?: TicketFilters) => Promise<void>;
  searchTickets: (filters: TicketFilters) => Promise<void>;
  fetchTicket: (ticketId: string) => Promise<void>;
  fetchTicketStats: () => Promise<void>;

  // Ticket selection
  selectTicket: (ticketId: string) => Promise<TicketSelection | null>;
  clearSelection: () => void;

  // Modal management
  openTicketSelector: (searchQuery?: string) => void;
  closeModal: () => void;
  setModalType: (type: TicketState['modalType']) => void;

  // Filter management
  updateFilters: (filters: Partial<TicketFilters>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;

  // Pagination
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Utility
  refreshTickets: () => Promise<void>;
  clearAllData: () => void;
}

type TicketStore = TicketState & TicketActions;

const initialState: TicketState = {
  tickets: [],
  selectedTicket: null,
  ticketStats: null,
  isLoading: false,
  isSearching: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 25,
    total: 0,
    hasNext: false,
    hasPrev: false,
  },
  isModalOpen: false,
  modalType: null,
  searchQuery: '',
  selectedTicketId: null,
  ticketContext: null,
};

export const useTicketStore = create<TicketStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Data fetching actions
      fetchMyTickets: async (filters = {}) => {
        const ticketService = getTicketService();
        if (!ticketService) {
          set((draft) => {
            draft.error = 'Ticket service not configured';
            draft.isLoading = false;
            draft.tickets = []; // Ensure tickets is always an array
          });
          return;
        }

        set((draft) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          const response = await ticketService.getMyTickets({
            ...get().filters,
            ...filters,
          });

          if (response.success && response.data) {
            set((draft) => {
              draft.tickets = response.data!.tickets || []; // Ensure tickets is always an array
              draft.pagination = response.data!.pagination;
              draft.filters = response.data!.filters;
              draft.isLoading = false;
            });
          } else {
            set((draft) => {
              draft.error = response.error || 'Failed to fetch tickets';
              draft.isLoading = false;
              draft.tickets = []; // Ensure tickets is always an array
            });
          }
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : 'Failed to fetch tickets';
            draft.isLoading = false;
            draft.tickets = []; // Ensure tickets is always an array
          });
        }
      },

      searchTickets: async (filters: TicketFilters) => {
        const ticketService = getTicketService();
        if (!ticketService) {
          set((draft) => {
            draft.error = 'Ticket service not configured';
            draft.isSearching = false;
            draft.tickets = []; // Ensure tickets is always an array
          });
          return;
        }

        set((draft) => {
          draft.isSearching = true;
          draft.error = null;
        });

        try {
          const response = await ticketService.searchTickets(filters);

          if (response.success && response.data) {
            set((draft) => {
              draft.tickets = response.data!.tickets || []; // Ensure tickets is always an array
              draft.pagination = response.data!.pagination;
              draft.filters = response.data!.filters;
              draft.isSearching = false;
            });
          } else {
            set((draft) => {
              draft.error = response.error || 'Failed to search tickets';
              draft.isSearching = false;
              draft.tickets = []; // Ensure tickets is always an array
            });
          }
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : 'Failed to search tickets';
            draft.isSearching = false;
            draft.tickets = []; // Ensure tickets is always an array
          });
        }
      },

      fetchTicket: async (ticketId: string) => {
        const ticketService = getTicketService();
        if (!ticketService) {
          set((draft) => {
            draft.error = 'Ticket service not configured';
            draft.isLoading = false;
          });
          return;
        }

        set((draft) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          const response = await ticketService.getTicket(ticketId);

          if (response.success && response.data) {
            set((draft) => {
              draft.selectedTicket = response.data!;
              draft.selectedTicketId = ticketId;
              draft.isLoading = false;
            });
          } else {
            set((draft) => {
              draft.error = response.error || 'Failed to fetch ticket';
              draft.isLoading = false;
            });
          }
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : 'Failed to fetch ticket';
            draft.isLoading = false;
          });
        }
      },

      fetchTicketStats: async () => {
        const ticketService = getTicketService();
        if (!ticketService) {
          set((draft) => {
            draft.error = 'Ticket service not configured';
          });
          return;
        }

        try {
          const response = await ticketService.getTicketStats();

          if (response.success && response.data) {
            set((draft) => {
              draft.ticketStats = response.data!;
            });
          } else {
            set((draft) => {
              draft.error = response.error || 'Failed to fetch ticket stats';
            });
          }
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : 'Failed to fetch ticket stats';
          });
        }
      },

      // Ticket selection actions
      selectTicket: async (ticketId: string): Promise<TicketSelection | null> => {
        const ticketService = getTicketService();
        if (!ticketService) {
          set((draft) => {
            draft.error = 'Ticket service not configured';
          });
          return null;
        }

        try {
          const response = await ticketService.selectTicket(ticketId);

          if (response.success && response.data) {
            const { ticket, context } = response.data;
            
            set((draft) => {
              draft.selectedTicket = ticket;
              draft.selectedTicketId = ticketId;
              draft.ticketContext = context;
            });

            return response.data;
          } else {
            set((draft) => {
              draft.error = response.error || 'Failed to select ticket';
            });
            return null;
          }
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : 'Failed to select ticket';
          });
          return null;
        }
      },

      clearSelection: () => {
        set((draft) => {
          draft.selectedTicket = null;
          draft.selectedTicketId = null;
          draft.ticketContext = null;
        });
      },

      // Modal management actions
      openTicketSelector: (searchQuery = '') => {
        set((draft) => {
          draft.isModalOpen = true;
          draft.modalType = 'ticket_selector';
          draft.searchQuery = searchQuery;
        });
      },

      closeModal: () => {
        set((draft) => {
          draft.isModalOpen = false;
          draft.modalType = null;
        });
      },

      setModalType: (type) => {
        set((draft) => {
          draft.modalType = type;
        });
      },

      // Filter management actions
      updateFilters: (filters) => {
        set((draft) => {
          draft.filters = { ...draft.filters, ...filters };
          draft.pagination.page = 1; // Reset to first page when filters change
        });
      },

      clearFilters: () => {
        set((draft) => {
          draft.filters = {};
          draft.searchQuery = '';
          draft.pagination.page = 1;
        });
      },

      setSearchQuery: (query) => {
        set((draft) => {
          draft.searchQuery = query;
        });
      },

      // Pagination actions
      nextPage: () => {
        set((draft) => {
          if (draft.pagination.hasNext) {
            draft.pagination.page += 1;
          }
        });
      },

      prevPage: () => {
        set((draft) => {
          if (draft.pagination.hasPrev && draft.pagination.page > 1) {
            draft.pagination.page -= 1;
          }
        });
      },

      setPage: (page) => {
        set((draft) => {
          draft.pagination.page = page;
        });
      },

      // State management actions
      setLoading: (loading) => {
        set((draft) => {
          draft.isLoading = loading;
        });
      },

      setError: (error) => {
        set((draft) => {
          draft.error = error;
        });
      },

      clearError: () => {
        set((draft) => {
          draft.error = null;
        });
      },

      // Utility actions
      refreshTickets: async () => {
        await get().fetchMyTickets();
      },

      clearAllData: () => {
        set((draft) => {
          Object.assign(draft, initialState);
        });
      },
    })),
    {
      name: 'ticket-store',
    }
  )
);

// Selectors
export const useTicketTickets = () => useTicketStore((state) => state.tickets);
export const useTicketSelectedTicket = () => useTicketStore((state) => state.selectedTicket);
export const useTicketStats = () => useTicketStore((state) => state.ticketStats);
export const useTicketLoading = () => useTicketStore((state) => state.isLoading);
export const useTicketError = () => useTicketStore((state) => state.error);
export const useTicketModal = () => useTicketStore((state) => ({
  isOpen: state.isModalOpen,
  type: state.modalType,
}));
export const useTicketFilters = () => useTicketStore((state) => state.filters);
export const useTicketPagination = () => useTicketStore((state) => state.pagination);
export const useTicketSearchQuery = () => useTicketStore((state) => state.searchQuery);
