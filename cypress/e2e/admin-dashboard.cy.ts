describe("Admin Dashboard", () => {
  // Mock admin user for testing
  const mockAdmin = {
    email: "admin@example.com",
    password: "AdminPassword123!",
  };

  before(() => {
    // This is a placeholder - in real tests, you would implement proper admin auth
    // cy.loginAsAdmin(mockAdmin.email, mockAdmin.password);

    // For this example, we'll simulate being logged in as an admin
    cy.visit("/admin/dashboard");
  });

  it("should display admin dashboard overview", () => {
    // Check if admin dashboard components are visible
    cy.get('[data-test="admin-stats"]').should("be.visible");
    cy.get('[data-test="recent-events"]').should("be.visible");
    cy.get('[data-test="organizer-applications"]').should("be.visible");

    // Verify statistics are displayed
    cy.contains("Total Users").should("be.visible");
    cy.contains("Total Events").should("be.visible");
    cy.contains("Total Revenue").should("be.visible");
  });

  it("should navigate to user management section", () => {
    // Click on user management tab
    cy.get('[data-test="users-tab"]').click();

    // Verify user management interface is displayed
    cy.get('[data-test="users-list"]').should("be.visible");
    cy.get('[data-test="user-search"]').should("be.visible");
    cy.get('[data-test="user-filters"]').should("be.visible");
  });

  it("should allow searching for users", () => {
    // Enter search term in user search
    cy.get('[data-test="user-search"]').type("test");

    // Verify search results
    cy.get('[data-test="user-row"]').should("have.length.at.least", 1);
  });

  it("should allow filtering users by role", () => {
    // Clear previous search
    cy.get('[data-test="user-search"]').clear();

    // Select organizer role filter
    cy.get('[data-test="role-filter"]').select("organizer");

    // Verify filtered results
    cy.get('[data-test="user-row"]').should("have.length.at.least", 1);
    cy.get('[data-test="user-role-cell"]').each(($el) => {
      expect($el.text()).to.include("Organizer");
    });
  });

  it("should display user details when clicking on a user", () => {
    // Click on the first user
    cy.get('[data-test="user-row"]').first().click();

    // Verify user details panel is displayed
    cy.get('[data-test="user-details-panel"]').should("be.visible");
    cy.get('[data-test="user-email"]').should("be.visible");
    cy.get('[data-test="user-role"]').should("be.visible");
    cy.get('[data-test="user-created-at"]').should("be.visible");
  });

  it("should allow changing a user role", () => {
    // Click on change role button
    cy.get('[data-test="change-role-button"]').click();

    // Select new role
    cy.get('[data-test="role-select"]').select("admin");

    // Confirm role change
    cy.get('[data-test="confirm-role-change"]').click();

    // Verify success message
    cy.get('[data-test="role-change-success"]').should("be.visible");

    // Verify role was updated
    cy.get('[data-test="user-role"]').should("contain", "Admin");
  });

  it("should navigate to organizer applications", () => {
    // Go back to dashboard
    cy.get('[data-test="dashboard-tab"]').click();

    // Click on organizer applications
    cy.get('[data-test="organizer-applications"]').click();

    // Verify applications list is displayed
    cy.get('[data-test="applications-list"]').should("be.visible");
  });

  it("should allow approving organizer applications", () => {
    // Click on the first pending application
    cy.get('[data-test="application-row"][data-status="pending"]')
      .first()
      .click();

    // Verify application details are shown
    cy.get('[data-test="application-details"]').should("be.visible");

    // Click approve button
    cy.get('[data-test="approve-application"]').click();

    // Confirm approval
    cy.get('[data-test="confirm-approve"]').click();

    // Verify success message
    cy.get('[data-test="approval-success"]').should("be.visible");

    // Verify application status changed
    cy.get('[data-test="application-status"]').should("contain", "Approved");
  });

  it("should navigate to events management", () => {
    // Click on events tab
    cy.get('[data-test="events-tab"]').click();

    // Verify events management interface is displayed
    cy.get('[data-test="events-list"]').should("be.visible");
    cy.get('[data-test="event-search"]').should("be.visible");
    cy.get('[data-test="event-filters"]').should("be.visible");
  });

  it("should allow searching for events", () => {
    // Enter search term in event search
    cy.get('[data-test="event-search"]').type("conference");

    // Verify search results
    cy.get('[data-test="event-row"]').should("have.length.at.least", 1);
  });

  it("should allow viewing event details", () => {
    // Click on the first event
    cy.get('[data-test="event-row"]').first().click();

    // Verify event details are displayed
    cy.get('[data-test="event-details-panel"]').should("be.visible");
    cy.get('[data-test="event-name"]').should("be.visible");
    cy.get('[data-test="event-organizer"]').should("be.visible");
    cy.get('[data-test="event-stats"]').should("be.visible");
  });

  it("should allow changing event status", () => {
    // Click on change status button
    cy.get('[data-test="change-event-status"]').click();

    // Select new status
    cy.get('[data-test="status-select"]').select("cancelled");

    // Confirm status change
    cy.get('[data-test="confirm-status-change"]').click();

    // Verify success message
    cy.get('[data-test="status-change-success"]').should("be.visible");

    // Verify status was updated
    cy.get('[data-test="event-status"]').should("contain", "Cancelled");
  });
});
