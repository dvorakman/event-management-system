import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex h-full w-full items-center justify-center py-12">
      <SignIn redirectUrl="/dashboard" />
    </div>
  );
}
