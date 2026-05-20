'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushRegistrar(): null {
  usePushNotifications();
  return null;
}
