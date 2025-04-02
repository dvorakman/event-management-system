describe("Homepage", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should display the homepage correctly", () => {
    // Check main title is present
    cy.contains("Find and Manage Events").should("be.visible");

    // Check navigation links
    cy.contains("Browse Events").should("be.visible");

    // Check hero section
    cy.get(".min-h-\\[550px\\]").should("be.visible");

    // Check features section
    cy.contains("Why Choose Our Platform").should("be.visible");
    cy.contains("Easy Event Discovery").should("be.visible");
    cy.contains("Seamless Registration").should("be.visible");
    cy.contains("Powerful Organizer Tools").should("be.visible");

    // Check featured events section
    cy.contains("Featured Events").should("be.visible");
  });

  it("should navigate to events page", () => {
    cy.contains("Browse Events").first().click();
    cy.url().should("include", "/events");
  });

  it("should have sign-in functionality", () => {
    // Check if sign-in button exists (when not logged in)
    cy.contains("Sign In").should("exist");
  });
});
