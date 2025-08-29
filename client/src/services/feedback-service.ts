export interface FeedbackData {
  id: string;
  timestamp: string;
  feedbackType: 'positive' | 'negative';
  selectedReasons: string[];
  feedbackText?: string;
  userQuery: string;
  aiResponse: string;
  sessionId?: string;
  userId?: string;
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  commonPositiveReasons: Array<{ reason: string; count: number }>;
  commonNegativeReasons: Array<{ reason: string; count: number }>;
  averageResponseLength: number;
  feedbackTrends: Array<{ date: string; positive: number; negative: number }>;
}

class FeedbackService {
  private feedbackData: FeedbackData[] = [];
  private readonly STORAGE_KEY = 'copilot_feedback_data';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Submit feedback data
   */
  async submitFeedback(feedback: Omit<FeedbackData, 'id' | 'timestamp'>): Promise<void> {
    const feedbackEntry: FeedbackData = {
      ...feedback,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    // Store locally
    this.feedbackData.push(feedbackEntry);
    this.saveToStorage();

    // Log for analytics
    console.log('Feedback submitted:', feedbackEntry);

    // In a real implementation, you would send this to your backend
    try {
      await this.sendToBackend(feedbackEntry);
    } catch (error) {
      console.error('Failed to send feedback to backend:', error);
      // Could implement retry logic here
    }
  }

  /**
   * Get feedback analytics
   */
  getAnalytics(): FeedbackAnalytics {
    const totalFeedback = this.feedbackData.length;
    const positiveCount = this.feedbackData.filter(f => f.feedbackType === 'positive').length;
    const negativeCount = this.feedbackData.filter(f => f.feedbackType === 'negative').length;

    // Count reasons
    const positiveReasons = this.countReasons('positive');
    const negativeReasons = this.countReasons('negative');

    // Calculate average response length
    const averageResponseLength = this.feedbackData.reduce((sum, f) => sum + f.aiResponse.length, 0) / totalFeedback || 0;

    // Generate trends (last 7 days)
    const feedbackTrends = this.generateTrends();

    return {
      totalFeedback,
      positiveCount,
      negativeCount,
      commonPositiveReasons: positiveReasons,
      commonNegativeReasons: negativeReasons,
      averageResponseLength,
      feedbackTrends,
    };
  }

  /**
   * Get feedback by type
   */
  getFeedbackByType(type: 'positive' | 'negative'): FeedbackData[] {
    return this.feedbackData.filter(f => f.feedbackType === type);
  }

  /**
   * Get recent feedback
   */
  getRecentFeedback(limit: number = 10): FeedbackData[] {
    return this.feedbackData
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get feedback requiring attention (negative with specific reasons)
   */
  getFeedbackRequiringAttention(): FeedbackData[] {
    const criticalReasons = ['incorrect', 'security', 'no-solution'];
    return this.feedbackData.filter(f => 
      f.feedbackType === 'negative' && 
      f.selectedReasons.some(reason => criticalReasons.includes(reason))
    );
  }

  /**
   * Export feedback data for analysis
   */
  exportFeedbackData(): string {
    return JSON.stringify(this.feedbackData, null, 2);
  }

  /**
   * Clear all feedback data
   */
  clearFeedbackData(): void {
    this.feedbackData = [];
    this.saveToStorage();
  }

  private generateId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private countReasons(type: 'positive' | 'negative'): Array<{ reason: string; count: number }> {
    const reasonCounts: Record<string, number> = {};
    
    this.feedbackData
      .filter(f => f.feedbackType === type)
      .forEach(f => {
        f.selectedReasons.forEach(reason => {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
      });

    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }

  private generateTrends(): Array<{ date: string; positive: number; negative: number }> {
    const trends: Array<{ date: string; positive: number; negative: number }> = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayFeedback = this.feedbackData.filter(f => 
        f.timestamp.startsWith(dateStr)
      );
      
      trends.push({
        date: dateStr,
        positive: dayFeedback.filter(f => f.feedbackType === 'positive').length,
        negative: dayFeedback.filter(f => f.feedbackType === 'negative').length,
      });
    }
    
    return trends;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.feedbackData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load feedback data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.feedbackData));
    } catch (error) {
      console.error('Failed to save feedback data to storage:', error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async sendToBackend(_feedback: FeedbackData): Promise<void> {
    // In a real implementation, this would send to your backend API
    // Example:
    /*
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(_feedback),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.statusText}`);
    }
    */
    
    // For now, just simulate an instant API call (no delay)
    return Promise.resolve();
  }
}

// Create a singleton instance
export const feedbackService = new FeedbackService();

// Hook for using feedback service in components
export const useFeedbackService = () => {
  return {
    submitFeedback: feedbackService.submitFeedback.bind(feedbackService),
    getAnalytics: feedbackService.getAnalytics.bind(feedbackService),
    getFeedbackByType: feedbackService.getFeedbackByType.bind(feedbackService),
    getRecentFeedback: feedbackService.getRecentFeedback.bind(feedbackService),
    getFeedbackRequiringAttention: feedbackService.getFeedbackRequiringAttention.bind(feedbackService),
    exportFeedbackData: feedbackService.exportFeedbackData.bind(feedbackService),
    clearFeedbackData: feedbackService.clearFeedbackData.bind(feedbackService),
  };
};
