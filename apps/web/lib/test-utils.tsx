import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { AuthProvider } from './auth';

// Mock user for testing
export const mockUser = {
  uid: 'test-user',
  email: 'test@example.com',
};

// Custom render function that includes providers
function render(ui: React.ReactElement, { user = mockUser, ...options } = {}) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    );
  }
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { render }; 