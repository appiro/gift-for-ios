'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushNotificationInit() {
  usePushNotifications();
  return null;
}
