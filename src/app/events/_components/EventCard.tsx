"use client";

import Link from "next/link";

type EventCardProps = {
  event: {
    id: number;
    name: string;
    description?: string | null;
    startDate: Date;
    endDate: Date;
    location: string;
    type: string;
    generalTicketPrice: string;
    vipTicketPrice: string;
    maxAttendees: number;
    status: string;
    // Frontend compatibility fields
    date: Date;
    category: string;
  };
};

export default function EventCard({ event }: EventCardProps) {
  if (!event) {
    return null;
  }

  const description = event.description || '';
  const truncatedDescription = description.length > 100 ? `${description.slice(0, 100)}...` : description;

  return (
    <div className="event-card" style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', marginBottom: '15px', maxWidth: '300px' }}>
      <h3>
        <Link href={`/events/${event.id}`}>{event.name}</Link>
      </h3>
      {description && (
        <p className="description" style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
          {truncatedDescription}
        </p>
      )}
      <div className="event-details" style={{ fontSize: '0.9em' }}>
        <p>Date: {event.startDate.toLocaleDateString()}</p>
        {event.location && <p>Location: {event.location}</p>}
        {event.type && <p>Category: {event.type}</p>}
        <p>Tickets from: ${Number(event.generalTicketPrice).toFixed(2)}</p>
      </div>
    </div>
  );
} 