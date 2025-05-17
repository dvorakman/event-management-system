
# Clerk Role-Based System Implementation Checklist

## Role Selection at Sign-Up
- [ ] Add role selection UI (User/Organizer) to sign-up flow
- [ ] Implement handler to store selection in Clerk's `publicMetadata.role`
- [ ] Test role selection during sign-up process

## Database Refactoring
- [ ] Simplify users table schema to remove redundant fields
  - [ ] Remove: `email`, `firstName`, `lastName`, `username`, `profileImage`, `role`, etc.
  - [ ] Keep only: `id` (Clerk user ID) and app-specific fields
- [ ] Update database queries that reference removed fields
- [ ] Update TypeScript types/interfaces for user model
- [ ] Test database operations after refactoring

## Session Token Configuration
- [x] Configure Clerk session token with correct template variables:
  ```json
  {
    "userId": "{{user.id}}",
    "email": "{{user.primary_email_address}}",
    "firstName": "{{user.first_name}}",
    "lastName": "{{user.last_name}}",
    "profileImage": "{{user.image_url}}",
    "role": "{{user.public_metadata.role}}"
  }
  ```
- [x] Verify session token contains correct information
- [ ] Update code to use session claims instead of database lookups

## Clerk Metadata Management
- [ ] Create helper functions for setting user roles
- [ ] Implement middleware to verify roles for protected routes
- [ ] Fix "Become Organizer" flow to set Clerk metadata properly
- [ ] Add UI feedback for role changes

## Demo User Generation
- [ ] Create script to generate test Clerk users
  - [ ] 10 organizers with correct metadata
  - [ ] 40+ regular users with correct metadata
- [ ] Add event registration seeding for demo accounts
- [ ] Document how to run the script

## Role-Based Access Control (RBAC)
- [ ] Implement RBAC checks using session claims:
  - [ ] Route protection for organizer dashboard
  - [ ] UI conditional rendering based on role
  - [ ] API endpoint protection
- [ ] Test all role-based access controls

## Documentation
- [ ] Document role system architecture
- [ ] Create guide for manually setting roles via Clerk dashboard
- [ ] Add comments to key role-checking code sections
- [ ] Update project README with role system explanation

## Testing
- [ ] Test sign-up as new user
- [ ] Test sign-up as new organizer
- [ ] Test "Become Organizer" flow
- [ ] Verify correct role-based access to features
- [ ] Verify role is correctly displayed in UI
- [ ] Test with multiple accounts simultaneously

## Production Deployment
- [ ] Configure production Clerk instance with correct session token
- [ ] Test role system in staging environment
- [ ] Monitor for any role-related issues after deployment
