# Preview Deployment Database Management

This document explains how the database is managed for Vercel preview deployments in this project.

## The Challenge

When deploying preview branches to Vercel, multiple previews can potentially target the same database. This can lead to conflicts where one preview tries to create database objects that were already created by another preview, resulting in errors like:

```
PostgresError: relation "event-management-system_post_id_seq" already exists
```

## Our Solution: Reset Preview Database Schema

To solve this issue, we've implemented an automatic database schema reset for preview environments. This approach:

1. Detects when the application is running in a Vercel preview environment
2. Drops and recreates the public schema before running migrations
3. Ensures each preview deployment starts with a clean database state

### How It Works

The solution consists of two parts:

1. **A database reset script** (`scripts/reset-preview-db.ts`):
   - Only runs in Vercel preview environments (`VERCEL_ENV === "preview"`)
   - Drops the entire public schema with `DROP SCHEMA public CASCADE`
   - Recreates the public schema with `CREATE SCHEMA public`
   - This gives us a clean slate for migrations

2. **An updated build process** in `package.json`:
   - Runs the reset script before running migrations
   - Ensures migrations start with a clean database state
   - Only affects preview environments (skips reset in production)

The build command sequence is:
```
bun run scripts/reset-preview-db.ts && bun run db:migrate && next build
```

## Benefits of This Approach

- **Isolation**: Each preview deployment gets a fresh database schema
- **Consistency**: Migrations always run against a clean state
- **Reliability**: Eliminates "already exists" errors during deployment
- **Safety**: Only affects preview environments, never production

## Important Notes

1. **Data Loss**: This approach intentionally drops all data in preview environments with each deployment. This is usually acceptable for previews but means any test data will need to be recreated.

2. **Shared Database**: All previews still share the same database server, just with a reset schema. If you need complete isolation, consider using a separate database instance for each preview.

3. **Production Safety**: The script checks for `VERCEL_ENV === "preview"` to ensure it never runs in production.

## Common Errors and Solutions

### "Cannot insert multiple commands into a prepared statement"

**Problem:**
```
PostgresError: cannot insert multiple commands into a prepared statement
```

**Solution:**
This error occurs when trying to execute multiple SQL commands in a single prepared statement. The fix is to execute each command separately:

```typescript
// Instead of:
await sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`;

// Do:
await sql`DROP SCHEMA public CASCADE`;
await sql`CREATE SCHEMA public`;
```

The script now handles this by executing each SQL command separately with proper error handling.

### "Schema does not exist" or "Permission denied"

**Problem:** Errors related to schema existence or permissions.

**Solution:**
- Ensure the database user has sufficient permissions
- The script now includes error handling for cases where the schema doesn't exist yet
- Enhanced logging helps identify permission issues

### Connection Timeout or Network Issues

**Problem:** The script cannot connect to the database.

**Solution:**
- Verify the database URL is correct
- Check network permissions (especially for Neon serverless)
- The script now includes enhanced error reporting and connection testing

## Troubleshooting

If you still encounter database-related errors in preview deployments:

1. **Check Vercel Environment Variables**: Ensure `NEON_DATABASE_URL` (or `DATABASE_URL`) is properly set in your Vercel project.

2. **Verify Database Permissions**: The database user must have permission to drop and create schemas.

3. **Check Logs**: Review the Vercel build logs to see if the reset script ran successfully. The improved error reporting should provide helpful diagnostic information.

4. **Manual Reset**: If needed, you can manually reset the database using a PostgreSQL client:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

5. **Database Connection Issues**: If the script fails to connect to the database, check:
   - Network permissions
   - Connection limits
   - Firewall rules
   - IP allowlisting (especially for Neon)
   - SSL requirements 