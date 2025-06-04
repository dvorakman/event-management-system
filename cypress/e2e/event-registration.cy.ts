describe("Event Registration", () => {
  // Mock user for this test
  const mockUser = {
    email: "test@example.com",
    password: "Password123!",
  };

  // We'll use a before hook to sign in
  // Note: In a real implementation, you'd use Cypress-Clerk integration or a custom command
  before(() => {
    // This is a placeholder - in real tests, you would implement proper auth
    // cy.loginWithClerk(mockUser.email, mockUser.password);

    // For this example, we'll skip actual login and just visit the events page
    cy.visit("/events");
  });

  it("should display events list", () => {
    cy.get("h1").contains("Events").should("be.visible");

    // Ensure we have at least one event card
    cy.get('[data-test="event-card"]').should("have.length.at.least", 1);
  });

  it("should allow viewing event details", () => {
    // Click on the first event card
    cy.get('[data-test="event-card"]').first().click();

    // Verify we're on an event details page
    cy.get('[data-test="event-details"]').should("be.visible");
    cy.get("h1").should("be.visible"); // Event title
    cy.get('[data-test="event-description"]').should("be.visible");
  });

  it("should display ticket options", () => {
    // On event details page
    cy.get('[data-test="ticket-options"]').should("be.visible");
    cy.contains("General Admission").should("be.visible");
    cy.contains("VIP").should("be.visible");
  });

  // Note: We can't fully test the payment process in E2E tests
  // but we can verify the UI flow gets to the payment stage
  it("should initiate registration process", () => {
    // Select General Admission
    cy.get('[data-test="ticket-option-general"]').click();

    // Click Register button
    cy.get('[data-test="register-button"]').click();

    // Verify we reach the payment stage
    // This would be a Stripe checkout in the real app
    cy.url().should("include", "/payment");
    // or
    cy.get('[data-test="payment-form"]').should("be.visible");
  });
});
