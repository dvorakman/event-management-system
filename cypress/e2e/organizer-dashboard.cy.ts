describe("Organizer Dashboard", () => {
  // Mock organizer user
  const mockOrganizer = {
    email: "organizer@example.com",
    password: "Password123!",
  };

  before(() => {
    // This is a placeholder - in real tests, you would implement proper auth
    // cy.loginAsOrganizer(mockOrganizer.email, mockOrganizer.password);

    // For this example, we'll simulate being logged in as an organizer
    cy.visit("/organizer/dashboard");
  });

  it("should display organizer dashboard", () => {
    // Check dashboard components are visible
    cy.get('[data-test="organizer-stats"]').should("be.visible");
    cy.get('[data-test="events-list"]').should("be.visible");

    // Check if stats are displayed
    cy.contains("Total Events").should("be.visible");
    cy.contains("Total Registrations").should("be.visible");
    cy.contains("Total Revenue").should("be.visible");
  });

  it("should navigate to create event page", () => {
    // Click on create event button
    cy.get('[data-test="create-event-button"]').click();

    // Verify we're on the create event page
    cy.url().should("include", "/organizer/events/create");
    cy.get('[data-test="event-form"]').should("be.visible");
  });

  it("should allow creating a new event", () => {
    // Fill out the event form
    cy.get('[name="name"]').type("Test Cypress Event");
    cy.get('[name="description"]').type(
      "This is a test event created by Cypress",
    );

    // Select event type
    cy.get('[name="type"]').select("conference");

    // Fill date fields
    cy.get('[name="startDate"]').type("2023-12-01");
    cy.get('[name="endDate"]').type("2023-12-03");

    // Fill location
    cy.get('[name="location"]').type("Cypress Test Venue, Online");

    // Fill pricing
    cy.get('[name="generalTicketPrice"]').clear().type("50");
    cy.get('[name="vipTicketPrice"]').clear().type("150");
    cy.get('[name="vipPerks"]').type("VIP seating, exclusive content");

    // Set attendance limit
    cy.get('[name="maxAttendees"]').clear().type("100");

    // Select status as draft
    cy.get('[name="status"][value="draft"]').check();

    // Submit the form
    cy.get('[data-test="submit-event"]').click();

    // Verify success message
    cy.contains("Event created successfully").should("be.visible");

    // Verify redirect to event details
    cy.url().should("include", "/organizer/events/");
  });

  it("should allow managing attendees", () => {
    // Navigate to events list
    cy.visit("/organizer/events");

    // Click on the first event
    cy.get('[data-test="event-row"]').first().click();

    // Click on attendees tab
    cy.get('[data-test="attendees-tab"]').click();

    // Verify attendee list is displayed
    cy.get('[data-test="attendees-list"]').should("be.visible");

    // Check if actions are available (approve/reject)
    cy.get('[data-test="attendee-actions"]').should("be.visible");
  });
});
