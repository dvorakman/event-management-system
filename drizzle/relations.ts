import { relations } from "drizzle-orm/relations";
import { eventManagementSystemUser, eventManagementSystemEvent, eventManagementSystemNotification, eventManagementSystemRegistration, eventManagementSystemTicket } from "./schema";

export const eventManagementSystemEventRelations = relations(eventManagementSystemEvent, ({one, many}) => ({
	eventManagementSystemUser: one(eventManagementSystemUser, {
		fields: [eventManagementSystemEvent.organizerId],
		references: [eventManagementSystemUser.id]
	}),
	eventManagementSystemNotifications: many(eventManagementSystemNotification),
	eventManagementSystemRegistrations: many(eventManagementSystemRegistration),
}));

export const eventManagementSystemUserRelations = relations(eventManagementSystemUser, ({many}) => ({
	eventManagementSystemEvents: many(eventManagementSystemEvent),
	eventManagementSystemNotifications: many(eventManagementSystemNotification),
	eventManagementSystemRegistrations: many(eventManagementSystemRegistration),
}));

export const eventManagementSystemNotificationRelations = relations(eventManagementSystemNotification, ({one}) => ({
	eventManagementSystemUser: one(eventManagementSystemUser, {
		fields: [eventManagementSystemNotification.userId],
		references: [eventManagementSystemUser.id]
	}),
	eventManagementSystemEvent: one(eventManagementSystemEvent, {
		fields: [eventManagementSystemNotification.eventId],
		references: [eventManagementSystemEvent.id]
	}),
}));

export const eventManagementSystemRegistrationRelations = relations(eventManagementSystemRegistration, ({one, many}) => ({
	eventManagementSystemUser: one(eventManagementSystemUser, {
		fields: [eventManagementSystemRegistration.userId],
		references: [eventManagementSystemUser.id]
	}),
	eventManagementSystemEvent: one(eventManagementSystemEvent, {
		fields: [eventManagementSystemRegistration.eventId],
		references: [eventManagementSystemEvent.id]
	}),
	eventManagementSystemTickets: many(eventManagementSystemTicket),
}));

export const eventManagementSystemTicketRelations = relations(eventManagementSystemTicket, ({one}) => ({
	eventManagementSystemRegistration: one(eventManagementSystemRegistration, {
		fields: [eventManagementSystemTicket.registrationId],
		references: [eventManagementSystemRegistration.id]
	}),
}));