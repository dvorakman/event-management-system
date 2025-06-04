import { createClerkClient } from "@clerk/backend";
import { db } from "../src/server/db/index.ts";
import { users } from "../src/server/db/schema.ts";
import { eq } from "drizzle-orm";

// Load env vars (for local dev, if needed)
if (!process.env.CLERK_SECRET_KEY) {
  try { require("dotenv").config(); } catch {}
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

async function getAllClerkUsers() {
  let allUsers: any[] = [];
  let offset = 0;
  const limit = 100;
  let totalCount = Infinity;
  while (allUsers.length < totalCount) {
    const { data, totalCount: total } = await clerk.users.getUserList({ limit, offset });
    allUsers = allUsers.concat(data);
    totalCount = total;
    offset += limit;
    if (data.length === 0) break;
  }
  return allUsers;
}

async function syncClerkUsers() {
  const clerkUsers = await getAllClerkUsers();
  let count = 0;
  for (const user of clerkUsers) {
    const email = user.emailAddresses[0]?.emailAddress || "";
    const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || email;
    const imageUrl = user.imageUrl || "";
    const role = (["user", "organizer"].includes(user.publicMetadata?.role) ? user.publicMetadata?.role : "user") as "user" | "organizer";
    // Upsert user
    const existing = await db.select().from(users).where(eq(users.id, user.id));
    if (existing.length > 0) {
      await db.update(users).set({ email, name, imageUrl, role, updatedAt: new Date() }).where(eq(users.id, user.id));
    } else {
      await db.insert(users).values({
        id: user.id,
        email,
        name,
        imageUrl,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    count++;
    console.log(`Synced user: ${name} <${email}> (${role})`);
  }
  console.log(`\nTotal Clerk users synced: ${count}`);
}

if (require.main === module) {
  syncClerkUsers().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
} 