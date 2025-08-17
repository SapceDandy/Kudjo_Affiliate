// Mock Firebase Auth
export const mockAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
};

// Mock Firestore
export const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
};

// Mock Storage
export const mockStorage = {
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
};

// Mock Functions
export const mockFunctions = {
  httpsCallable: jest.fn(),
};

// Helper to reset all mocks
export function resetFirebaseMocks() {
  Object.values(mockAuth).forEach(mock => {
    if (typeof mock === 'function') mock.mockReset();
  });
  Object.values(mockFirestore).forEach(mock => {
    if (typeof mock === 'function') mock.mockReset();
  });
  Object.values(mockStorage).forEach(mock => {
    if (typeof mock === 'function') mock.mockReset();
  });
  Object.values(mockFunctions).forEach(mock => {
    if (typeof mock === 'function') mock.mockReset();
  });
} 