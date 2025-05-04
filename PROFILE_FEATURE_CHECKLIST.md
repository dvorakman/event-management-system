# Profile Management Feature Checklist

This checklist tracks the implementation progress for the user profile management feature, using Clerk as the single source of truth.

## Core Requirements

- [x] **Create Profile UI Component:**
    - [x] Create `src/app/profile/page.tsx` or a similar route.
    - [x] Develop a dedicated profile form component (e.g., `src/components/profile/ProfileForm.tsx`).
- [x] **Integrate Clerk `<UserProfile />`:**
    - [x] Embed `<UserProfile />` for managing core Clerk fields (name, email, phone, password, profile picture).
    - [x] Configure appearance/routing if necessary.
- [x] **Implement Custom Fields:**
    - [x] Define custom fields in Clerk metadata (`publicMetadata` or `privateMetadata`).
        - [x] Display Name (`publicMetadata.displayName`)
        - [ ] Contact Information (Potentially secondary email/phone if not primary Clerk ones - use metadata if needed)
        - [ ] Basic Preferences (`publicMetadata.preferences` or similar structure)
        - [x] Communication Preferences (`publicMetadata.communicationPrefs` or similar structure)
    - [x] Add inputs for custom fields to the `ProfileForm` component.
    - [x] Read initial custom field values from `user.publicMetadata`/`user.privateMetadata`.
- [x] **Save Custom Field Changes:**
    - [x] Implement form submission logic.
    - [x] Use `user.update()` from `useUser` hook to save changes to Clerk metadata.
- [x] **Validation:**
    - [x] Add client-side validation for custom fields.
    - [ ] (Optional) Add server-side validation if using an API route/Server Action wrapper.
- [x] **Database Schema:**
    - [x] Ensure `User` table in `src/server/db/schema.ts` primarily uses `clerkId` and application-specific fields (NOT profile fields like name, email).

## Acceptance Criteria Verification

- [x] **View and Edit:** Users can see their profile data (core + custom) and modify editable fields.
- [x] **Save and Validate:** Custom field changes are saved correctly to Clerk metadata, and basic validation prevents invalid data.
- [x] **Communication Preferences:** Users can set and save communication preferences (via metadata).
- [x] **Contact Info Update:** Users can update core contact info via `<UserProfile />` and potentially secondary info via custom fields/metadata.
- [x] **Database Correctness:** Profile changes are reflected in Clerk, and the application database only stores necessary application-specific user data linked by `clerkId`.

## Additional Tasks (If Applicable)

- [x] Style the profile page/form component.
- [x] Add loading states during data fetch/update.
- [x] Add user feedback/notifications (success/error messages). 