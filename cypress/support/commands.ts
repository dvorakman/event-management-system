// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Define types for API responses
interface UserResponse {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface EventResponse {
  id: string;
  name: string;
  description: string;
  organizerId: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
}

// -- This is a parent command --
Cypress.Commands.add("login", (email: string, password: string) => {
  // Note: This is a simplified version. In a real implementation, you would:
  // 1. Visit the login page
  // 2. Fill in the credentials
  // 3. Submit the form
  // 4. Wait for redirects

  // Example implementation:
  cy.visit("/sign-in");
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();

  // Wait for redirect after successful login
  cy.url().should("not.include", "/sign-in");
});

// Login as an organizer
Cypress.Commands.add("loginAsOrganizer", (email: string, password: string) => {
  cy.login(email, password);

  // Verify we're on the organizer dashboard
  cy.url().should("include", "/organizer/dashboard");
});

// Login as an admin
Cypress.Commands.add("loginAsAdmin", (email: string, password: string) => {
  cy.login(email, password);

  // Verify we're on the admin dashboard
  cy.url().should("include", "/admin/dashboard");
});

// Create a test user with Clerk
Cypress.Commands.add(
  "createTestUser",
  (options: { email: string; password: string; role?: string }) => {
    // This is a placeholder for creating a test user via API
    // In a real implementation, you would:
    // 1. Call your backend API to create a test user
    // 2. Set the role if specified
    // 3. Return user data

    // Example implementation using cy.request:
    cy.request<UserResponse>({
      method: "POST",
      url: "/api/test/create-user",
      body: options,
    }).then((response) => {
      // Return created user for chaining
      return response.body;
    });
  },
);

// Create a test event
Cypress.Commands.add(
  "createTestEvent",
  (options: { name: string; organizerId: string }) => {
    // This is a placeholder for creating a test event via API
    // In a real implementation, you would:
    // 1. Call your backend API to create a test event
    // 2. Return event data

    // Example implementation using cy.request:
    cy.request<EventResponse>({
      method: "POST",
      url: "/api/test/create-event",
      body: options,
    }).then((response) => {
      // Return created event for chaining
      return response.body;
    });
  },
);

// ***********************************************
// TypeScript definitions for custom commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      loginAsOrganizer(email: string, password: string): Chainable<void>;
      loginAsAdmin(email: string, password: string): Chainable<void>;
      createTestUser(options: {
        email: string;
        password: string;
        role?: string;
      }): Chainable<UserResponse>;
      createTestEvent(options: {
        name: string;
        organizerId: string;
      }): Chainable<EventResponse>;
    }
  }
}

export {};
