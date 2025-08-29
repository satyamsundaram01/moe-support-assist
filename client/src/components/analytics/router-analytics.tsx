import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../services/analytics-service';

/**
 * Router-level analytics component that tracks page views centrally
 * This prevents duplicate page view events from multiple components
 */
export const RouterAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view when route changes
    const pageName = location.pathname;
    const pageTitle = document.title;
    
    trackPageView(pageName, {
      page_title: pageTitle,
      referrer: document.referrer,
      search_params: location.search,
      hash: location.hash,
      route_change: true
    });
  }, [location.pathname, location.search, location.hash]);

  // This component doesn't render anything
  return null;
};
