import { redirect } from 'next/navigation';

// This page redirects from the old /welcome path to the new /onboarding path
export default function WelcomeRedirect() {
  redirect('/onboarding');
} 