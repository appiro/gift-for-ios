'use client';

import dynamic from 'next/dynamic';

const Onboarding = dynamic(() => import('./Onboarding'), { ssr: false });
const PushNotificationInit = dynamic(() => import('./PushNotificationInit'), { ssr: false });

export default function ClientOnlyWidgets() {
  return (
    <>
      <PushNotificationInit />
      <Onboarding />
    </>
  );
}
