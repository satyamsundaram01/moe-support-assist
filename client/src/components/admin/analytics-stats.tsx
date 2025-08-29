import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowDown, ArrowUp, MoreHorizontal, Pin, Settings, Share2, Trash, TriangleAlert } from 'lucide-react';
import type { AnalyticsData } from '@/types/admin';

interface AnalyticsStatsProps {
  data: AnalyticsData;
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return n.toLocaleString();
  return n.toString();
}

export function AnalyticsStats({ data }: AnalyticsStatsProps) {
  const stats = [
    {
      title: 'Total Sessions',
      value: data.totalSessions,
      delta: 15.1,
      lastMonth: Math.floor(data.totalSessions * 0.87),
      positive: true,
      prefix: '',
      suffix: '',
    },
    {
      title: 'Total Users',
      value: data.totalUsers,
      delta: 8.3,
      lastMonth: Math.floor(data.totalUsers * 0.92),
      positive: true,
      prefix: '',
      suffix: '',
    },
    {
      title: 'Avg Session Length',
      value: data.averageSessionLength,
      delta: -2.1,
      lastMonth: data.averageSessionLength * 1.02,
      positive: false,
      prefix: '',
      suffix: 'min',
      format: (v: number) => `${v.toFixed(1)}min`,
      lastFormat: (v: number) => `${v.toFixed(1)}min`,
    },
    {
      title: 'Messages Sent',
      value: data.responseMetrics.messageSent,
      delta: 1.4,
      lastMonth: data.responseMetrics.messageSent - 1.4,
      positive: true,
      prefix: '',
      suffix: '',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="border-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">{stat.title}</CardTitle>
            <CardToolbar>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="dim" size="sm" mode="icon" className="-me-1.5">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom">
                  <DropdownMenuItem>
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <TriangleAlert /> Add Alert
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Pin /> Pin to Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 /> Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <Trash />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardToolbar>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-medium text-foreground tracking-tight">
                {stat.format ? stat.format(stat.value) : stat.prefix + formatNumber(stat.value) + stat.suffix}
              </span>
              <Badge variant={stat.positive ? 'success' : 'destructive'} appearance="light">
                {stat.delta > 0 ? <ArrowUp /> : <ArrowDown />}
                {Math.abs(stat.delta)}%
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2 border-t pt-2.5">
              Vs last month:{' '}
              <span className="font-medium text-foreground">
                {stat.lastFormat
                  ? stat.lastFormat(stat.lastMonth)
                  : stat.prefix + formatNumber(stat.lastMonth) + stat.suffix}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
