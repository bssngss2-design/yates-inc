# Data Sync Issue Resolution - Complete Implementation Guide

## Problem Summary

Your website had a data synchronization issue after the Supabase database was wiped and recreated:

1. **EmployeesPanel showing "(unnamed client)"** for old users
2. **Only 2 clients in Supabase** despite many active users
3. **Rankings displaying correctly** even though tables appeared empty

### Root Cause

- **Old Supabase was deleted** this week
- **Old users remained logged in** via cached `localStorage` 
- Their game state existed in:
  - ✅ `user_game_data` (from presence heartbeat)
  - ✅ `user_presence` (from heartbeat every 20s)
  - ❌ `clients` table (NOT migrated to new DB)
- **EmployeesPanel queried `clients` table directly** → showed only 2 new registrations
- **RankingPanel had fallback logic** → worked fine by checking multiple sources

---

## Solutions Implemented

### 1. ✅ Fixed EmployeesPanel Display (IMMEDIATE FIX)
**File:** `components/EmployeesPanel.tsx`

**Changes:**
- Added `username` column to `UserGameRow` interface
- Updated Supabase query to fetch `username` from `user_game_data`
- Improved orphan user name resolution:
  - Priority: `banned.username` → `game_data.username` → `presence.username` → `(unnamed client)`
  - Before: Only showed from `presence.username`, often empty
  - After: Falls back to denormalized `username` in `user_game_data`

**Result:** Old users now display with their actual usernames in EmployeesPanel

---

### 2. 🔄 Migration Tools (RUN THESE NEXT)

#### Option A: SQL Migration (Recommended)
**File:** `sql/MIGRATE_OLD_USERS_TO_CLIENTS.sql`

Finds orphaned users and inserts them into `clients` table:
```sql
-- Automatically:
-- 1. Finds users in user_game_data but NOT in clients
-- 2. Extracts usernames from game_data/presence
-- 3. Inserts into clients with temp password
-- 4. Updates denormalized username columns
```

**Steps:**
1. Open Supabase SQL Editor
2. Paste entire contents of `sql/MIGRATE_OLD_USERS_TO_CLIENTS.sql`
3. Run the query
4. Users will need to reset passwords (see below)

#### Option B: API Migration
```bash
curl -X POST http://localhost:3000/api/admin/migrate-old-users
```

Returns migrated user count and details.

---

### 3. 🔐 Password Reset Flow (AUTOMATIC)
**File:** `app/api/auth/client-login/route.ts`

**How it works:**
1. Migrated users get placeholder password: `[MIGRATED - PASSWORD RESET REQUIRED]`
2. When they try to login, server detects this
3. Returns error: `needs_password_reset`
4. Frontend guides them to set new password
5. They call `/api/auth/client-set-password` with new password
6. Password is hashed and stored → they can log in normally

**Benefits:**
- ✅ No lock-outs
- ✅ No manual intervention
- ✅ Transparent to users
- ✅ Secure password reset forced

---

### 4. 📊 Verification Tools

#### Check Status
**File:** `sql/VERIFY_MIGRATION.sql`

Queries to verify migration success:
- Count of clients vs game data
- Users with NULL usernames (should be few)
- Sample of migrated users with game stats
- Top earners leaderboard
- Active users in last 24 hours

#### Audit Data Gap
**File:** `sql/AUDIT_DATA_GAP.sql`

Identifies orphaned users before migration:
- Which users are in game_data but NOT in clients
- Their usernames and stats
- Current clients table contents
- Rankings table status

---

### 5. 📈 Optional: Rankings Table Population
**File:** `sql/POPULATE_RANKINGS_TABLE.sql`

For historical reporting (app doesn't require this):
- Populates `rankings` table from `user_game_data`
- Creates period snapshots
- Groups by: money earned, prestige speed, prestige count
- Safe to run multiple times

---

## Files Changed/Created

### Modified
```
components/EmployeesPanel.tsx        ← Added username column resolution
app/api/auth/client-login/route.ts   ← Added migration detection
```

### Created
```
app/api/admin/migrate-old-users/route.ts  ← Migration API endpoint
sql/MIGRATE_OLD_USERS_TO_CLIENTS.sql      ← Main migration script
sql/AUDIT_DATA_GAP.sql                    ← Pre-migration audit
sql/VERIFY_MIGRATION.sql                  ← Post-migration verification
sql/POPULATE_RANKINGS_TABLE.sql           ← Optional rankings backfill
docs/setup/MIGRATION_GUIDE.md             ← User-facing guide
docs/setup/PASSWORD_RESET_FLOW.md         ← Technical flow docs
```

---

## Step-by-Step Next Actions

### Immediate (Fixes Display Issue)
```
✅ Done - Code changes deployed
- EmployeesPanel now shows proper names for old users
- Rankings continue to work
```

### Short-term (Migrate Old Users)
```
1. Run sql/AUDIT_DATA_GAP.sql to see how many users need migrating
2. Run sql/MIGRATE_OLD_USERS_TO_CLIENTS.sql to populate clients table
3. Run sql/VERIFY_MIGRATION.sql to confirm success
4. Communicate to users about password reset if they log out
```

### Optional (Reporting)
```
- Run sql/POPULATE_RANKINGS_TABLE.sql if you want period-based leaderboard history
```

---

## User Experience

### Before Migration
- EmployeesPanel: "(unnamed client)"
- Rankings: Mix of names and "Unknown"
- If they logout: Account locked (not in clients table)

### After Migration
- EmployeesPanel: Proper usernames displayed
- Rankings: All names resolved
- If they logout then login: Guided to set new password
- If they don't logout: Everything works normally

---

## Data Flow (After Fix)

```
┌─ Old User (logged in, cached)
├─ localStorage: full game state
├─ user_game_data: stats + username (NOW FETCHED)
├─ user_presence: online status + username
├─ clients: (after migration)
│
└─ EmployeesPanel Query:
   └─ Fetches user_game_data (includes username now)
   └─ Merges with clients data
   └─ Shows: ban name → game_data name → presence name → (unnamed)
```

---

## Troubleshooting

**Q: EmployeesPanel still shows "(unnamed client)"**
- A: Make sure you ran the migration script to populate `clients` table
- A: Or ensure `user_game_data.username` is populated (see VERIFY_MIGRATION.sql)

**Q: Migrated users can't login**
- A: They see "needs_password_reset" error — this is expected
- A: They need to set a new password via the password reset flow
- A: Password should be stored in `clients.password` after reset

**Q: Rankings showing "Unknown" still**
- A: RankingPanel has fallback chains, but check if `user_game_data.username` is NULL
- A: Run UPDATE in VERIFY_MIGRATION.sql to fill missing usernames

**Q: How to force-migrate without SQL?**
- A: Call POST `/api/admin/migrate-old-users` endpoint
- A: Or let it happen automatically on next login with password reset prompt

---

## Security Notes

- Migrated passwords are placeholders — users must reset
- No old passwords were stored (Supabase was deleted)
- Password reset is cryptographically secure (bcrypt)
- All queries use parameterized statements
- API endpoint uses Supabase RLS policies

---

## Questions?

Refer to:
- `docs/setup/MIGRATION_GUIDE.md` - Complete migration walkthrough
- `docs/setup/PASSWORD_RESET_FLOW.md` - Technical password flow
- SQL files in `sql/` folder - Audit, migrate, verify scripts
