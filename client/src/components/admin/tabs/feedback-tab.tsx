import React, { useState, useEffect } from 'react';
import { cn } from '../../../lib/utils/cn';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import type { FeedbackSummary, SessionFeedback } from '../../../types/admin';

interface FeedbackTabProps {
  feedbackSummary: FeedbackSummary | null;
  onRefresh: () => void;
  className?: string;
}

export const FeedbackTab: React.FC<FeedbackTabProps> = ({
  feedbackSummary,
  onRefresh,
  className
}) => {
  const [recentFeedback, setRecentFeedback] = useState<SessionFeedback[]>([]);
  const [isLoading] = useState(false);

  useEffect(() => {
    if (feedbackSummary?.recentFeedback) {
      setRecentFeedback(feedbackSummary.recentFeedback);
    }
  }, [feedbackSummary]);

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      helpful: 'bg-green-100 text-green-800',
      accurate: 'bg-blue-100 text-blue-800',
      fast: 'bg-purple-100 text-purple-800',
      easy_to_use: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
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

  if (!feedbackSummary) {
    return (
      <div className={cn('p-6', className)}>
        <div className="text-center text-gray-500">No feedback data available</div>
      </div>
    );
  }

  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            User Feedback
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor user satisfaction and feedback trends
          </p>
        </div>
        <Button onClick={onRefresh} variant="outline" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400">💬</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Feedback</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {feedbackSummary.totalFeedback}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400">⭐</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Rating</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {feedbackSummary.averageRating.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {feedbackSummary.trends.thisWeek}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 dark:text-orange-400">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {feedbackSummary.trends.thisMonth}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Rating Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(feedbackSummary.ratingDistribution).map(([rating, count]) => (
            <div key={rating} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                  {rating} ⭐
                </span>
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 ml-3">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(count / feedbackSummary.totalFeedback) * 100}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Recent Feedback
        </h3>
        <div className="space-y-4">
          {recentFeedback.map((feedback) => (
            <div key={feedback.id} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className={cn('text-lg', getRatingColor(feedback.rating))}>
                    {getRatingStars(feedback.rating)}
                  </span>
                  <Badge className={getCategoryColor(feedback.category)}>
                    {feedback.category.replace('_', ' ')}
                  </Badge>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimeAgo(feedback.timestamp)}
                </span>
              </div>
              {feedback.comment && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  "{feedback.comment}"
                </p>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                User: {feedback.userId} • Session: {feedback.sessionId}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
