import { createClerkClient } from "@clerk/backend";
import { faker } from "@faker-js/faker";

// Load env vars (for local dev, if needed)
if (!process.env.CLERK_SECRET_KEY) {
  // Try dotenv if not in prod
  try {
    require("dotenv").config();
  } catch {}
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

async function createOrganizers(num = 10) {
  const organizers: Array<{ id: string; name: string; email: string; password: string }> = [];
  for (let i = 0; i < num; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });
    const password = faker.internet.password({ length: 12, memorable: true });

    try {
      const user = await clerk.users.createUser({
        emailAddress: [email],
        firstName,
        lastName,
        password,
        publicMetadata: {
          role: "organizer",
          onboardingComplete: true,
        },
        privateMetadata: {
          password, // Store plaintext for demo purposes only!
        },
      });
      organizers.push({
        id: user.id,
        name: `${firstName} ${lastName}`,
        email,
        password,
      });
      console.log(`Created organizer: ${firstName} ${lastName} <${email}>`);
    } catch (err) {
      console.error(`Failed to create organizer ${email}:`, err);
    }
  }
  return organizers;
}

(async () => {
  console.log("Generating 10 realistic Clerk organizers...");
  const organizers = await createOrganizers(10);
  console.log("\nSummary of created organizers:");
  organizers.forEach((org, idx) => {
    console.log(
      `${idx + 1}. ${org.name} | ${org.email} | password: ${org.password}`
    );
  });
  process.exit(0);
})();
