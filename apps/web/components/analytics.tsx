'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initGA, pageview, analytics, GA_TRACKING_ID } from '@/lib/gtag';
import { useAuth } from '@/lib/auth';

export function Analytics() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Initialize Google Analytics on mount
  useEffect(() => {
    if (GA_TRACKING_ID) {
      initGA();
    }
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (GA_TRACKING_ID && pathname) {
      // Track the page view without search params for static generation
      pageview(pathname, document.title);

      // Track page view with user role context
      analytics.pageView(pathname, user?.role || undefined);
    }
  }, [pathname, user?.role]);

  // Track user authentication state changes
  useEffect(() => {
    if (user && user.role) {
      // Set user properties for analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', GA_TRACKING_ID, {
          custom_map: { custom_parameter: user.role },
          user_id: user.uid,
        });
      }
    }
  }, [user]);

  // This component doesn't render anything
  return null;
}

// Higher-order component to add analytics tracking to buttons and links
export function withAnalytics<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  eventName: string,
  category: string = 'engagement'
) {
  return function AnalyticsWrappedComponent(props: T) {
    const handleClick = (originalOnClick?: () => void) => {
      return (event: React.MouseEvent) => {
        // Track the click
        analytics.buttonClick(eventName, window.location.pathname);
        
        // Call original onClick if it exists
        if (originalOnClick) {
          originalOnClick();
        }
      };
    };

    const wrappedProps = {
      ...props,
      onClick: handleClick(props.onClick),
    };

    return <Component {...wrappedProps} />;
  };
}

// Hook for manual event tracking
export function useAnalytics() {
  const { user } = useAuth();

  return {
    trackEvent: (eventData: Parameters<typeof analytics.buttonClick>[0]) => {
      analytics.buttonClick(eventData, window.location.pathname);
    },
    
    trackFormSubmit: (formName: string, success: boolean) => {
      analytics.formSubmit(formName, success);
    },
    
    trackError: (error: Error, location: string) => {
      analytics.error(error.name, error.message, location);
    },
    
    trackCampaignStart: (offerId: string, businessId: string) => {
      if (user?.uid) {
        analytics.campaignStart(offerId, businessId, user.uid);
      }
    },
    
    trackCouponClaim: (couponType: 'AFFILIATE' | 'CONTENT_MEAL', offerId: string) => {
      analytics.couponClaim(couponType, offerId);
    },
    
    trackBusinessOnboard: (posProvider: string) => {
      if (user?.uid) {
        analytics.businessOnboard(user.uid, posProvider);
      }
    },
    
    trackOfferCreate: (offerId: string) => {
      if (user?.uid) {
        analytics.offerCreate(offerId, user.uid);
      }
    },
    
    user,
  };
}
