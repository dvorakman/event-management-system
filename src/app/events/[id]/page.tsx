import { db } from "~/server/db";
import { events, users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { z } from "zod";

interface EventPageProps {
  params: {
    id: string;
  };
}

// Define the event type based on the schema
const eventSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  location: z.string(),
  type: z.enum(["conference", "music_concert", "networking"]),
  generalTicketPrice: z.string().transform(Number),
  vipTicketPrice: z.string().transform(Number),
  vipPerks: z.string(),
  maxAttendees: z.number(),
  organizerId: z.string(),
  status: z.enum(["draft", "published", "cancelled", "completed"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

type Event = z.infer<typeof eventSchema>;

export default async function EventPage({ params }: EventPageProps) {
  // First get the event
  const event = await db.query.events.findFirst({
    where: eq(events.id, parseInt(params.id)),
  });

  if (!event) {
    notFound();
  }

  // Then get the organizer
  const organizer = await db.query.users.findFirst({
    where: eq(users.id, event.organizerId),
  });

  if (!organizer) {
    notFound();
  }

  // Combine the data
  const eventWithOrganizer = {
    ...event,
    organizer,
  };

  // Validate the event data against our schema
  const validatedEvent = eventSchema.parse(eventWithOrganizer);

  // Format dates for display
  const formattedStartDate = format(validatedEvent.startDate, "EEEE, MMMM d, yyyy");
  const formattedStartTime = format(validatedEvent.startDate, "h:mm a");
  const formattedEndTime = format(validatedEvent.endDate, "h:mm a");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-white">{validatedEvent.name}</h1>
        
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 text-white">
          <h2 className="text-2xl font-semibold mb-4">Event Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Date and Time</h3>
              <p className="text-gray-300">
                {formattedStartDate}
                <br />
                {formattedStartTime} - {formattedEndTime}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Location</h3>
              <p className="text-gray-300">{validatedEvent.location}</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Organizer</h3>
              <p className="text-gray-300">{validatedEvent.organizer.name}</p>
              <p className="text-gray-400 text-sm">{validatedEvent.organizer.email}</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Event Type</h3>
              <p className="text-gray-300 capitalize">{validatedEvent.type.replace("_", " ")}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 text-white">
          <h2 className="text-2xl font-semibold mb-4">Tickets</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-2">General Admission</h3>
              <p className="text-2xl font-bold mb-2 text-blue-400">${validatedEvent.generalTicketPrice}</p>
              <p className="text-gray-300">Standard access to the event</p>
            </div>

            <div className="border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-2">VIP Access</h3>
              <p className="text-2xl font-bold mb-2 text-blue-400">${validatedEvent.vipTicketPrice}</p>
              <p className="text-gray-300">{validatedEvent.vipPerks}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-md p-6 text-white">
          <h2 className="text-2xl font-semibold mb-4">About the Event</h2>
          <p className="text-gray-300 whitespace-pre-line">{validatedEvent.description}</p>
        </div>
      </div>
    </div>
  );
} 