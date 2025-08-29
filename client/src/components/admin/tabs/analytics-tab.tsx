import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { AnalyticsStats } from '../analytics-stats';
import type { AnalyticsData, FeedbackSummary } from '../../../types/admin';

interface AnalyticsTabProps {
  analyticsData: AnalyticsData | null;
  feedbackSummary: FeedbackSummary | null;
  onRefresh: () => void;
}

export function AnalyticsTab({ analyticsData, feedbackSummary, onRefresh }: AnalyticsTabProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  const handleDateRangeSelect = (range: string) => {
    const now = new Date();
    let from: Date;
    
    switch (range) {
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setDateRange({ from, to: now });
    onRefresh();
  };

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Date Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Date Range
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDateRangeSelect('7d')}>
                Last 7 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDateRangeSelect('30d')}>
                Last 30 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDateRangeSelect('90d')}>
                Last 90 days
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={onRefresh} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Analytics Stats Cards */}
      <AnalyticsStats data={analyticsData} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mode Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Mode Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Badge variant="secondary" className="mr-2">Ask</Badge>
                <span className="text-sm text-muted-foreground">
                  {analyticsData.modeDistribution.ask.toLocaleString()} sessions
                </span>
              </div>
              <div className="text-sm font-medium">
                {((analyticsData.modeDistribution.ask / analyticsData.totalSessions) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(analyticsData.modeDistribution.ask / analyticsData.totalSessions) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Badge variant="secondary" className="mr-2">Investigate</Badge>
                <span className="text-sm text-muted-foreground">
                  {analyticsData.modeDistribution.investigate.toLocaleString()} sessions
                </span>
              </div>
              <div className="text-sm font-medium">
                {((analyticsData.modeDistribution.investigate / analyticsData.totalSessions) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-chart-2 h-2 rounded-full transition-all"
                style={{ width: `${(analyticsData.modeDistribution.investigate / analyticsData.totalSessions) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* User Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Daily Active Users</span>
              <span className="text-lg font-semibold">
                {analyticsData.userEngagement.dailyActiveUsers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Weekly Active Users</span>
              <span className="text-lg font-semibold">
                {analyticsData.userEngagement.weeklyActiveUsers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Active Users</span>
              <span className="text-lg font-semibold">
                {analyticsData.userEngagement.monthlyActiveUsers}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Summary */}
      {feedbackSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-chart-1 mb-1">
                  {feedbackSummary.totalFeedback}
                </div>
                <div className="text-sm text-muted-foreground">Total Feedback</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-chart-2 mb-1">
                  {feedbackSummary.positiveCount}
                </div>
                <div className="text-sm text-muted-foreground">Positive Feedback</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive mb-1">
                  {feedbackSummary.negativeCount}
                </div>
                <div className="text-sm text-muted-foreground">Negative Feedback</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Response Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-1 mb-1">
                {analyticsData.responseMetrics.averageResponseTime.toFixed(1)}s
              </div>
              <div className="text-sm text-muted-foreground">Average Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-2 mb-1">
                {analyticsData.responseMetrics.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive mb-1">
                {analyticsData.responseMetrics.errorRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
