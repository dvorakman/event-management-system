import { UserButton } from "@clerk/nextjs";
import { BecomeOrganizerButton } from "./BecomeOrganizerButton";

export function UserMenu() {
  return (
    <div className="flex items-center gap-4">
      <BecomeOrganizerButton />
      <UserButton 
        afterSignOutUrl="/"
        appearance={{
          elements: {
            userButtonTrigger: {
              "&:focus": {
                boxShadow: "none"
              }
            }
          }
        }}
        userProfileUrl="/account"
      />
    </div>
  );
} 