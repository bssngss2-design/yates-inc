'use client';

import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat';

/**
 * Invisible client component whose only job is to keep the user's row in
 * `user_presence` fresh. Mounted once at the layout level.
 */
export default function PresenceTracker() {
  usePresenceHeartbeat();
  return null;
}
