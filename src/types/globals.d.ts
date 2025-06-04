export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "user" | "organizer" | "admin";
      onboardingComplete?: boolean;
    };
    role?: "user" | "organizer" | "admin";
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  }
} 