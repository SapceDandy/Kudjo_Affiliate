// Google Analytics tracking utilities
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// Initialize Google Analytics
export function initGA() {
  if (typeof window === 'undefined' || !GA_TRACKING_ID) return;

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    page_path: window.location.pathname,
    custom_map: { custom_parameter: 'user_role' }
  });
}

// Track page views
export function pageview(url: string, title?: string) {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) return;

  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
    page_title: title,
  });
}

// Track custom events
export function event(parameters: {
  action: string;
  category: string;
  label?: string;
  value?: number;
  user_role?: string;
  business_id?: string;
  influencer_id?: string;
}) {
  if (typeof window === 'undefined' || !window.gtag) return;

  const { action, category, label, value, ...customParams } = parameters;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...customParams,
  });
}

// Predefined events for common actions
export const analytics = {
  // User authentication events
  signIn: (method: string, role: string) => {
    event({
      action: 'login',
      category: 'auth',
      label: method,
      user_role: role,
    });
  },

  signUp: (method: string, role: string) => {
    event({
      action: 'sign_up',
      category: 'auth',
      label: method,
      user_role: role,
    });
  },

  signOut: (role: string) => {
    event({
      action: 'logout',
      category: 'auth',
      user_role: role,
    });
  },

  // Campaign events
  campaignStart: (offerId: string, businessId: string, influencerId: string) => {
    event({
      action: 'campaign_start',
      category: 'campaign',
      label: offerId,
      business_id: businessId,
      influencer_id: influencerId,
    });
  },

  couponClaim: (couponType: 'AFFILIATE' | 'CONTENT_MEAL', offerId: string) => {
    event({
      action: 'coupon_claim',
      category: 'coupon',
      label: couponType,
      value: couponType === 'CONTENT_MEAL' ? 1 : 0,
    });
  },

  couponRedeem: (couponId: string, amount: number) => {
    event({
      action: 'coupon_redeem',
      category: 'conversion',
      label: couponId,
      value: amount,
    });
  },

  // Business events
  businessOnboard: (businessId: string, posProvider: string) => {
    event({
      action: 'business_onboard',
      category: 'onboarding',
      label: posProvider,
      business_id: businessId,
    });
  },

  offerCreate: (offerId: string, businessId: string) => {
    event({
      action: 'offer_create',
      category: 'business',
      label: offerId,
      business_id: businessId,
    });
  },

  // Navigation events
  pageView: (page: string, role?: string) => {
    event({
      action: 'page_view',
      category: 'navigation',
      label: page,
      user_role: role,
    });
  },

  // Engagement events
  buttonClick: (buttonName: string, location: string) => {
    event({
      action: 'click',
      category: 'engagement',
      label: `${buttonName}_${location}`,
    });
  },

  formSubmit: (formName: string, success: boolean) => {
    event({
      action: success ? 'form_submit_success' : 'form_submit_error',
      category: 'form',
      label: formName,
      value: success ? 1 : 0,
    });
  },

  // Error tracking
  error: (errorType: string, errorMessage: string, location: string) => {
    event({
      action: 'exception',
      category: 'error',
      label: `${errorType}_${location}`,
      value: 0,
    });
  },

  // Admin events
  adminAction: (action: string, target: string) => {
    event({
      action: 'admin_action',
      category: 'admin',
      label: `${action}_${target}`,
      user_role: 'admin',
    });
  },

  // Export events
  dataExport: (exportType: string, format: string) => {
    event({
      action: 'data_export',
      category: 'admin',
      label: `${exportType}_${format}`,
    });
  },
}; 