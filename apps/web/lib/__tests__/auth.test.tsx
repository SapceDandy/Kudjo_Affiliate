import { render, screen, act } from '@testing-library/react';
import { useAuth, AuthProvider, type AuthState } from '../auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  getAuth: jest.fn(() => ({})),
}));

describe('AuthProvider', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides auth state to children', () => {
    let authState: AuthState | undefined;
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(authState?.user).toEqual(mockUser);
    expect(authState?.loading).toBe(false);
  });

  it('handles sign in', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: mockUser });
    let authState: AuthState | undefined;

    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await authState?.signIn('test@example.com', 'password');
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password'
    );
  });

  it('handles sign out', async () => {
    (signOut as jest.Mock).mockResolvedValue(undefined);
    let authState: AuthState | undefined;

    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await authState?.signOut();
    });

    expect(signOut).toHaveBeenCalled();
  });

  it('handles auth state changes', () => {
    const unsubscribe = jest.fn();
    let authCallback: ((user: typeof mockUser | null) => void) | undefined;
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      authCallback = callback;
      return unsubscribe;
    });

    let authState: AuthState | undefined;
    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state
    expect(authState?.loading).toBe(true);
    expect(authState?.user).toBe(null);

    // Simulate auth state change
    act(() => {
      authCallback?.(mockUser);
    });

    expect(authState?.loading).toBe(false);
    expect(authState?.user).toEqual(mockUser);

    // Simulate sign out
    act(() => {
      authCallback?.(null);
    });

    expect(authState?.loading).toBe(false);
    expect(authState?.user).toBe(null);
  });

  it('handles sign in errors', async () => {
    const error = new Error('Invalid credentials');
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(error);
    let authState: AuthState | undefined;

    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await expect(authState?.signIn('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });

  it('handles sign out errors', async () => {
    const error = new Error('Network error');
    (signOut as jest.Mock).mockRejectedValue(error);
    let authState: AuthState | undefined;

    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await expect(authState?.signOut()).rejects.toThrow('Network error');
  });
}); 