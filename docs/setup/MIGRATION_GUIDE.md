# Migration Guide: Recovering Old Users After Supabase Wipe

## Problem
When the old Supabase database was deleted and a new one was created, old users remained logged in via cached `localStorage` but their credentials were not in the new `clients` table. This caused:

1. EmployeesPanel showing "(unnamed client)" for old users
2. Old users at risk of being locked out if they log out
3. Only 2 clients in the database despite many active users

## Root Cause
- Old users: stored in `user_game_data` + `user_presence` (from heartbeat) but NOT in `clients` table
- New users: properly registered in `clients` table
- `user_game_data.username` column may be NULL for old users (not yet synced from localStorage)

## Solution: Two Methods

### Method 1: SQL Migration (Recommended for one-time setup)

Run this SQL script in Supabase SQL Editor:

```sql
-- File: sql/MIGRATE_OLD_USERS_TO_CLIENTS.sql
-- This will find all orphaned clients and insert them into the clients table
```

**Steps:**
1. Open Supabase > SQL Editor
2. Copy the entire contents of `sql/MIGRATE_OLD_USERS_TO_CLIENTS.sql`
3. Run the query
4. **Important:** Users will need to reset their passwords since they're set to `[MIGRATED - PASSWORD RESET REQUIRED]`

**What it does:**
- Finds all client rows in `user_game_data` not yet in `clients`
- Extracts usernames from `user_game_data.username` or `user_presence.username`
- Inserts them into `clients` with a temporary password
- Updates `user_game_data` and `user_presence` to denormalize the usernames

### Method 2: API Migration (Programmatic)

```bash
curl -X POST http://localhost:3000/api/admin/migrate-old-users
```

**Response:**
```json
{
  "success": true,
  "migratedCount": 42,
  "migratedUsers": [
    { "id": "user-uuid-1", "username": "player_1" },
    { "id": "user-uuid-2", "username": "player_2" }
  ]
}
```

## Verification

After migration, verify in Supabase:

```sql
-- Should show many more rows now:
SELECT COUNT(*) FROM clients;

-- Should show all client usernames populated:
SELECT user_id, username FROM user_game_data WHERE user_type = 'client' LIMIT 10;
```

## What Users See

**Before migration:**
- EmployeesPanel shows "(unnamed client)" for old users
- Rankings show some "Unknown" entries

**After migration:**
- EmployeesPanel shows proper usernames
- Rankings work correctly
- Old users can play normally
- If they log out and try to log back in, they'll need to reset their password (since the migrated password is a placeholder)

## Password Reset Flow

Old users who logged out will see:
1. Login page asks for password
2. They click "Forgot password" or similar (if implemented)
3. Or they can re-register with a new account

**Alternative:** Use client-set-password endpoint to let them set a new password without email verification if needed.

## Notes

- The migration is **idempotent** — safe to run multiple times
- It only inserts users with `username` IS NULL to avoid duplicates
- Usernames are extracted from `user_game_data` or `user_presence` (whichever has data first)
- Mail handles are auto-generated based on username + user ID prefix
