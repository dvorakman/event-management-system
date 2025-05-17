import { UserButton } from "@clerk/nextjs";

export function UserMenu() {
  return (
    <div className="flex items-center gap-4">
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