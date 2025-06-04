import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '~/server/db';
import { users } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { syncUser } from '~/server/auth/sync-user';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return Response.json(
      { success: false, error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json(
      { success: false, error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }
  
  const wh = new Webhook(webhookSecret);
  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return Response.json(
      { success: false, error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  const eventType = evt.type;

  console.log(`Webhook received! Event type: ${eventType}`);

  if (eventType === 'user.created' || eventType === 'user.updated') {
    try {
      await syncUser(evt.data);
      console.log(`User ${evt.data.id} synced successfully`);
    } catch (error) {
      console.error('Error syncing user:', error);
      return Response.json(
        { success: false, error: 'Error syncing user', details: String(error) },
        { status: 500 }
      );
    }
  }

  if (eventType === 'user.deleted') {
    // Delete user from our database
    const { id } = evt.data;

    try {
      await db.delete(users)
        .where(eq(users.id, id));

      console.log(`User deleted from database: ${id}`);
    } catch (error) {
      console.error('Error deleting user from database:', error);
      return Response.json(
        { success: false, error: 'Error deleting user', details: String(error) },
        { status: 500 }
      );
    }
  }

  return Response.json(
    { success: true, event: eventType },
    { status: 200 }
  );
} 