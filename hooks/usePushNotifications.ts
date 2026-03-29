'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function usePushNotifications() {
  useEffect(() => {
    // Capacitor 環境でのみ実行
    if (typeof window === 'undefined') return;

    async function init() {
      // Capacitor が利用可能かチェック
      const coreMod = '@capacitor/core';
      const { Capacitor } = await import(/* webpackIgnore: true */ coreMod) as any;
      if (!Capacitor.isNativePlatform()) return;

      const pnMod = '@capacitor/push-notifications';
      const { PushNotifications } = await import(/* webpackIgnore: true */ pnMod) as any;

      // 権限をリクエスト
      const { receive } = await PushNotifications.requestPermissions();
      if (receive !== 'granted') return;

      await PushNotifications.register();

      // デバイストークンを Supabase に保存
      PushNotifications.addListener('registration', async (token) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('push_tokens').upsert(
          { user_id: user.id, token: token.value, platform: 'ios' },
          { onConflict: 'token' }
        );
      });

      // フォアグラウンド通知の受信
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received:', notification);
      });

      // 通知タップ時のナビゲーション
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const url = action.notification.data?.url;
        if (url && typeof window !== 'undefined') {
          window.location.href = url;
        }
      });
    }

    init().catch(console.error);
  }, []);
}
