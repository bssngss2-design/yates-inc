# Password Reset Flow for Migrated Users

## Overview
When old users log in after being migrated from the backup, their password is set to a placeholder: `[MIGRATED - PASSWORD RESET REQUIRED]`. This forces them through a password reset flow instead of getting locked out.

## Login Flow for Migrated Users

### 1. User tries to login with old credentials
```
POST /api/auth/client-login
{
  "username": "logan",
  "password": "oldpassword"  // This won't work anymore
}
```

### 2. Server detects migrated account
The login endpoint (`app/api/auth/client-login/route.ts`) checks if the password is the placeholder:

```json
{
  "success": false,
  "error": "needs_password_reset",
  "message": "Your account was recovered from our database backup. Please set a new password to continue.",
  "userId": "user-uuid",
  "username": "logan"
}
```

### 3. Frontend UI prompts for password reset
The login component receives the `needs_password_reset` error and shows:
- A friendly message explaining their account was recovered
- A form to set a new password
- Option to skip for now and create a new account

### 4. User sets new password
```
POST /api/auth/client-set-password
{
  "clientId": "user-uuid",
  "password": "newpassword123"
}
```

### 5. Server stores hashed password
- Password is hashed with bcrypt
- Stored in `clients` table
- User can now log in with the new password

## Implementation Details

### Client-side (if needed)
If you need to add UI for password reset on login, handle these error cases:

```typescript
// In your login form handler
const response = await fetch('/api/auth/client-login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});

const result = await response.json();

if (result.error === 'needs_password_reset') {
  // Show password reset form
  setShowPasswordResetForm(true);
  setUserId(result.userId);
  setMessage(result.message);
}
```

### Server-side (already implemented)
- `app/api/auth/client-login/route.ts` - Detects migrated accounts
- `app/api/auth/client-set-password/route.ts` - Sets new password

## Benefits
✅ Old users don't get locked out on re-login
✅ Forces secure password reset (removes placeholder)
✅ Transparent to user (clear error message)
✅ No manual intervention needed
✅ Scales to any number of migrated users

## Testing

### Test 1: Migrated user login
1. Manually set a client password to `[MIGRATED - PASSWORD RESET REQUIRED]`
2. Try to login
3. Should see "needs_password_reset" error
4. Set new password via `/api/auth/client-set-password`
5. Login should work

### Test 2: Verify password is stored
```sql
SELECT id, username, password FROM clients 
WHERE id = 'user-uuid';
```
After reset, password should be a bcrypt hash (starts with `$2b$` or `$2a$`).

## Related Files
- `app/api/auth/client-login/route.ts` - Login endpoint with migration detection
- `app/api/auth/client-set-password/route.ts` - Password reset endpoint
- `lib/clientPassword.ts` - Password hashing utilities
- `sql/MIGRATE_OLD_USERS_TO_CLIENTS.sql` - Sets initial passwords to placeholder
