// This file provides mock authentication utilities for development
// It can be used to simulate a logged-in user when testing components
// without having to set up real authentication

// Mock user data
export const MOCK_ORGANIZER = {
  id: "org-123",
  name: "Test Organizer",
  email: "organizer@example.com",
  role: "organizer", // "organizer" | "admin" | "user"
  image: null,
};

// Mock session data
export const MOCK_SESSION = {
  user: MOCK_ORGANIZER,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

// Helper function to check if we're in development mode
export const isDevelopment = () => {
  return process.env.NODE_ENV === "development";
};

// Helper function to get a mock user for testing
export const getMockUser = () => {
  return MOCK_ORGANIZER;
}; 