// Ticket selector modal component
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Clock, Tag, AlertCircle, Ticket } from 'lucide-react';
import { cn } from '../../../lib/utils/cn';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { useTicketStore } from '../../../store/ticket-store';
import type { Ticket as TicketType } from '../../../types/ticket';

interface TicketSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTicket: (ticket: TicketType) => void;
  searchQuery?: string;
}

export const TicketSelectorModal: React.FC<TicketSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectTicket,
  searchQuery = '',
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  const {
    tickets,
    isLoading,
    error,
    pagination,
    fetchMyTickets,
    searchTickets,
    nextPage,
    prevPage,
  } = useTicketStore();

  // Load tickets when modal opens
  useEffect(() => {
    if (isOpen) {
      if (searchQuery) {
        searchTickets({ search: searchQuery });
        setLocalSearchQuery(searchQuery);
      } else {
        fetchMyTickets();
      }
    }
  }, [isOpen, searchQuery, fetchMyTickets, searchTickets]);

  // Handle search
  const handleSearch = (query: string) => {
    setLocalSearchQuery(query);
    if (query.trim()) {
      searchTickets({ search: query });
    } else {
      fetchMyTickets();
    }
  };

  // Handle ticket selection
  const handleSelectTicket = async (ticket: TicketType) => {
    setSelectedTicketId(ticket.id);
    
    try {
      // Call the parent's ticket selection handler
      onSelectTicket(ticket);
      onClose();
    } catch (error) {
      console.error('Failed to select ticket:', error);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-400';
      case 'pending':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-400';
      case 'hold':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/30 dark:text-orange-400';
      case 'solved':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30 dark:text-blue-400';
      case 'closed':
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-950/20 dark:border-slate-800/30 dark:text-slate-400';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-950/20 dark:border-slate-800/30 dark:text-slate-400';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30 dark:text-red-400';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/30 dark:text-orange-400';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30 dark:text-blue-400';
      case 'low':
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-950/20 dark:border-slate-800/30 dark:text-slate-400';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-950/20 dark:border-slate-800/30 dark:text-slate-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Select Ticket
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Choose a ticket to add context
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted/50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={localSearchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-sm text-muted-foreground">Loading tickets...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-48 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-destructive font-medium">Error loading tickets</p>
                      <p className="text-xs text-muted-foreground mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <Ticket className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">No tickets found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-80">
                  <div className="p-2 space-y-2">
                    {(tickets || []).map((ticket, index) => (
                      <motion.button
                        key={ticket.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelectTicket(ticket)}
                        className={cn(
                          'w-full p-4 text-left hover:bg-muted/30 transition-all duration-200 rounded-xl group',
                          selectedTicketId === ticket.id && 'bg-primary/10 border border-primary/20'
                        )}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Ticket ID */}
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center border border-primary/20 group-hover:border-primary/30 transition-colors">
                              <span className="text-xs font-bold text-primary leading-none">
                                #{ticket.id}
                              </span>
                            </div>
                          </div>

                          {/* Ticket content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                {ticket.subject}
                              </h3>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 text-xs rounded-full font-medium border',
                                    getStatusColor(ticket.status)
                                  )}
                                >
                                  {ticket.status}
                                </span>
                                <span
                                  className={cn(
                                    'px-2 py-0.5 text-xs rounded-full font-medium border',
                                    getPriorityColor(ticket.priority)
                                  )}
                                >
                                  {ticket.priority}
                                </span>
                              </div>
                            </div>

                            {ticket.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {ticket.description}
                              </p>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(ticket.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                              {ticket.tags.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  <span>{ticket.tags.slice(0, 2).join(', ')}</span>
                                  {ticket.tags.length > 2 && (
                                    <span className="text-xs">+{ticket.tags.length - 2}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {tickets.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t border-border/30 bg-muted/10">
                <div className="text-xs text-muted-foreground">
                  {pagination.total > 0 && (
                    <span>
                      {tickets.length} of {pagination.total} tickets
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={!pagination.hasPrev}
                    className="h-8 px-3 rounded-lg border-border/50 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={!pagination.hasNext}
                    className="h-8 px-3 rounded-lg border-border/50 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
