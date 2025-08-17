// Default mock position
export const defaultPosition = {
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};

// Mock geolocation
export const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

// Helper to setup geolocation mock
export function setupGeolocationMock(position = defaultPosition) {
  mockGeolocation.getCurrentPosition.mockImplementation((success) => success(position));
  Object.defineProperty(global.navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
  });
}

// Helper to simulate geolocation error
export function simulateGeolocationError(code = 1, message = 'Geolocation denied') {
  const error = new Error(message);
  error.name = 'GeolocationPositionError';
  (error as any).code = code;
  mockGeolocation.getCurrentPosition.mockImplementation((_, reject) => reject(error));
}

// Helper to reset geolocation mock
export function resetGeolocationMock() {
  mockGeolocation.getCurrentPosition.mockReset();
  mockGeolocation.watchPosition.mockReset();
  mockGeolocation.clearWatch.mockReset();
} 