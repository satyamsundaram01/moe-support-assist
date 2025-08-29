import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/analytics-service';

/**
 * Hook for manual page tracking in specific components
 * Use this when you need to track page views with custom data
 */
export const usePageTracking = () => {
  const location = useLocation();

  const trackCurrentPage = (additionalData?: Record<string, unknown>) => {
    trackPageView(location.pathname, {
      page_title: document.title,
      referrer: document.referrer,
      search_params: location.search,
      hash: location.hash,
      manual_track: true,
      ...additionalData
    });
  };

  return { trackCurrentPage, currentPath: location.pathname };
};
