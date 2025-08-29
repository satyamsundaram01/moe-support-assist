import React, { useState, useEffect } from 'react';
import { cn } from '../../../lib/utils/cn';
import { Button } from '../../ui/button';
import { adminService } from '../../../services/admin-service';
import type { SessionListItem } from '../../../types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { RefreshCw, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { DatePickerWithRange } from '../../date-picker/date-range-picker';
import { SessionDetailsModal } from '../modals/session-details-modal';
import { addDays } from 'date-fns';

interface SessionsTabProps {
  onRefresh: () => void;
  className?: string;
}

export const SessionsTab: React.FC<SessionsTabProps> = ({
  className
}) => {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'all' | 'ask' | 'investigate'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'completed' | 'error'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // Modal state
  const [selectedSession, setSelectedSession] = useState<SessionListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [selectedMode, selectedStatus, currentPage, limit, dateRange, userIdFilter]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await adminService.getSessions({
        mode: selectedMode === 'all' ? undefined : selectedMode,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        userId: userIdFilter || undefined,
        limit,
        page: currentPage,
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0]
      });
      setSessions(response.sessions);
      setTotalPages(response.totalPages);
      setTotalCount(response.total);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (session: SessionListItem) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'ask': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'investigate': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSessions = sessions.filter(session => 
    session.userQuery?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Session Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage user sessions across different modes
          </p>
        </div>
        <Button onClick={loadSessions} variant="outline" disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {sessions.filter(s => s.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {sessions.filter(s => s.mode === 'ask').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Ask Mode</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {sessions.filter(s => s.mode === 'investigate').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Investigate Mode</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Mode Filter */}
            <div>
              <Label htmlFor="mode-filter">Mode</Label>
              <Select value={selectedMode} onValueChange={(value: 'all' | 'ask' | 'investigate') => setSelectedMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="ask">Ask Mode</SelectItem>
                  <SelectItem value="investigate">Investigate Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={selectedStatus} onValueChange={(value: 'all' | 'active' | 'completed' | 'error') => setSelectedStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User ID Filter */}
            <div>
              <Label htmlFor="user-id-filter">User ID</Label>
              <Input
                id="user-id-filter"
                placeholder="Filter by User ID"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
              />
            </div>

            {/* Limit Filter */}
            <div>
              <Label htmlFor="limit-filter">Results per page</Label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by query, user ID, or session ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <Label>Date Range</Label>
            <DatePickerWithRange
              date={dateRange}
              setDate={(date) => {
                if (date && date.from && date.to) {
                  setDateRange({ from: date.from, to: date.to });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Sessions ({filteredSessions.length} of {totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading sessions...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No sessions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getModeColor(session.mode)}>
                          {session.mode}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(session.status)}>
                          {session.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {session.messageCount} messages
                        </span>
                        {session.hasError && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            ⚠️ Error
                          </Badge>
                        )}
                        {session.hasFeedback && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                            ⭐ Feedback
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {session.userQuery || 'No query available'}
                      </h3>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>User: {session.userId}</div>
                        <div>Session ID: {session.id}</div>
                        <div>Created: {formatDate(session.startTime)}</div>
                        <div>Last Activity: {formatTimeAgo(session.lastActivity)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(session)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages} ({totalCount} total sessions)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Details Modal */}
      <SessionDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        session={selectedSession}
      />
    </div>
  );
};
