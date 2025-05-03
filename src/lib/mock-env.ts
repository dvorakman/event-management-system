// This file sets mock environment variables for development mode
// These would typically be set in .env.local but we're using this approach for the demo

// Set the flag to use mock authentication
if (typeof window !== 'undefined') {
  // Only run in browser environment
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  window.process.env.NEXT_PUBLIC_USE_MOCK_AUTH = 'true';
}

export const initMockEnv = () => {
  console.log("Mock environment variables initialized");
  console.log("NEXT_PUBLIC_USE_MOCK_AUTH:", process.env.NEXT_PUBLIC_USE_MOCK_AUTH);
}; 