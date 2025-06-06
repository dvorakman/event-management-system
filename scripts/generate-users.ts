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

async function createUsers(num = 40) {
  const users: Array<{ id: string; name: string; email: string; password: string }> = [];
  let consecutiveFailures = 0;
  
  for (let i = 0; i < num; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });
    const password = faker.internet.password({ length: 12, memorable: true });

    let success = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!success && retryCount < maxRetries) {
      try {
        // Add delay between requests to avoid rate limiting
        if (i > 0 || retryCount > 0) {
          const delay = Math.min(1000 + (retryCount * 2000), 10000); // 1s, 3s, 5s max
          console.log(`Waiting ${delay}ms before next request...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const user = await clerk.users.createUser({
          emailAddress: [email],
          firstName,
          lastName,
          password,
          publicMetadata: {
            role: "user",
            onboardingComplete: true,
          },
          privateMetadata: {
            password, // Store plaintext for demo purposes only!
          },
        });
        
        users.push({
          id: user.id,
          name: `${firstName} ${lastName}`,
          email,
          password,
        });
        console.log(`✅ Created user ${users.length}/${num}: ${firstName} ${lastName} <${email}>`);
        success = true;
        consecutiveFailures = 0;
        
      } catch (err: any) {
        retryCount++;
        
        if (err.status === 429) {
          // Rate limited - respect the retryAfter header
          const retryAfter = err.retryAfter || 10;
          console.log(`⚠️  Rate limited. Waiting ${retryAfter} seconds before retry ${retryCount}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        } else {
          console.error(`❌ Failed to create user ${email} (attempt ${retryCount}/${maxRetries}):`, err.message || err);
          consecutiveFailures++;
          
          // If we have too many consecutive failures, something might be seriously wrong
          if (consecutiveFailures >= 5) {
            console.error(`🛑 Too many consecutive failures (${consecutiveFailures}). Stopping script.`);
            break;
          }
          
          if (retryCount < maxRetries) {
            const delay = 2000 * retryCount; // 2s, 4s
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    if (!success) {
      console.error(`🚫 Permanently failed to create user: ${email}`);
    }
    
    // Break if we hit too many consecutive failures
    if (consecutiveFailures >= 5) {
      break;
    }
  }
  return users;
}

(async () => {
  console.log("🚀 Generating 40 realistic Clerk users with rate limit handling...");
  console.log("⏱️  This may take a while due to rate limiting - please be patient!\n");
  
  const startTime = Date.now();
  const users = await createUsers(40);
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log(`\n🎉 Completed! Generated ${users.length}/40 users in ${duration} seconds`);
  console.log("\n📋 Summary of created users:");
  users.forEach((user, idx) => {
    console.log(
      `${idx + 1}. ${user.name} | ${user.email} | password: ${user.password}`
    );
  });
  
  if (users.length < 40) {
    console.log(`\n⚠️  Note: Only ${users.length} out of 40 users were created due to rate limiting or errors.`);
    console.log("💡 You can run the script again to create the remaining users.");
  }
  
  process.exit(0);
})(); 