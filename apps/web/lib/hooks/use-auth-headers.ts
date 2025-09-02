'use client';

import { useAuth } from '@/lib/auth';

export function useAuthHeaders() {
  const { user } = useAuth();

  const getAuthHeaders = (): Record<string, string> => {
    if (!user || !user.uid) {
      return {
        'Content-Type': 'application/json',
      };
    }

    return {
      'x-user-id': user.uid,
      'x-user-role': user.role || 'business',
      'x-user-email': user.email || '',
      'Content-Type': 'application/json',
    };
  };

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...getAuthHeaders(),
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return {
    getAuthHeaders,
    authenticatedFetch,
    user,
  };
}
