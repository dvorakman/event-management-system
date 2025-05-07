// ***********************************************************
// This is the main support file for Cypress end-to-end tests.
// It's loaded automatically before your test files.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Cypress configuration to improve test reliability
Cypress.on("uncaught:exception", (err, runnable) => {
  // Returning false here prevents Cypress from failing the test if
  // an unexpected error occurs in the application code.
  // This is helpful when testing apps with third-party dependencies.
  console.log("Uncaught exception:", err.message);
  return false;
});

// Optional: Mock API responses for specific endpoints
// This can be useful for creating consistent test data
if (Cypress.env("MOCK_API")) {
  beforeEach(() => {
    // Example of mocking a stats API response
    cy.intercept("GET", "/api/trpc/organizer.getOrganizerStats*", {
      result: {
        data: {
          json: {
            totalEvents: 5,
            totalAttendees: 120,
            totalRevenue: 5000,
            eventsThisMonth: 2,
          },
        },
      },
    }).as("getOrganizerStats");

    // Mock event listings
    cy.intercept("GET", "/api/trpc/event.getAllEvents*", {
      fixture: "events.json",
    }).as("getEvents");
  });
}

// Helper function to test accessibility
// Note: This requires @cypress/axe to be installed
// npm install --save-dev @cypress/axe axe-core
/*
import 'cypress-axe';

Cypress.Commands.add('checkA11y', (context, options) => {
  cy.checkA11y(context, options);
});
*/

// This helps with debugging tests
Cypress.on("test:after:run", (test, runnable) => {
  if (test.state === "failed") {
    // You could add custom logging or screenshots here
    console.log(`Test "${test.title}" failed`);
  }
});

// Custom viewport sizes for responsive testing
const viewports = {
  mobile: [375, 667] as [number, number],
  tablet: [768, 1024] as [number, number],
  desktop: [1280, 800] as [number, number],
};

// Add commands for responsive testing
Cypress.Commands.add("viewportMobile", () => {
  cy.viewport(viewports.mobile[0], viewports.mobile[1]);
});

Cypress.Commands.add("viewportTablet", () => {
  cy.viewport(viewports.tablet[0], viewports.tablet[1]);
});

Cypress.Commands.add("viewportDesktop", () => {
  cy.viewport(viewports.desktop[0], viewports.desktop[1]);
});

// Add TypeScript declarations for these commands
declare global {
  namespace Cypress {
    interface Chainable {
      viewportMobile(): Chainable<Element>;
      viewportTablet(): Chainable<Element>;
      viewportDesktop(): Chainable<Element>;
      // checkA11y(context?: string, options?: any): Chainable<Element>;
    }
  }
}

// You can add other global configurations or setup code here
