"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch, notificationsUrl } from '@/lib/api';

interface Notification {
  id: string;
  type: 'comment' | 'reply' | 'save';
  review_id: string;
  actor_name: string;
  actor_icon: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}日前`;
  return new Date(dateStr).toLocaleDateString('ja-JP');
}

const TYPE_ICON = {
  comment: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894z"/>
    </svg>
  ),
  reply: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M5.854 7.146a.5.5 0 0 1 0 .708L3.707 10H9.5a.5.5 0 0 1 0 1H3.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0z"/>
      <path d="M13.854 2.146a.5.5 0 0 1 0 .708L11.707 5H13.5a.5.5 0 0 1 0 1h-3.793l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0z"/>
    </svg>
  ),
  save: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
    </svg>
  ),
};

const TYPE_COLOR = {
  comment: 'bg-blue-50 text-blue-500',
  reply: 'bg-purple-50 text-purple-500',
  save: 'bg-pink-50 text-pink-500',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(notificationsUrl())
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setNotifications(Array.isArray(data) ? data : []);
        // 全既読にする
        apiFetch(notificationsUrl(), { method: 'PATCH' });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto w-full py-6">
      <h1 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
        </svg>
        通知
      </h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-border-light rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-background-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="text-border-light" viewBox="0 0 16 16">
              <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
            </svg>
          </div>
          <p className="text-text-sub font-bold">現在のおしらせはありません</p>
          <p className="text-xs text-text-sub mt-1">コメントや保存があると通知が届きます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={`/post/${n.review_id}`}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors hover:border-primary/30 ${
                n.is_read ? 'bg-white border-border-light' : 'bg-primary/5 border-primary/20'
              }`}
            >
              {/* Actor icon */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-background-soft overflow-hidden">
                  <img src={n.actor_icon} alt={n.actor_name} className="w-full h-full object-contain p-1" />
                </div>
                <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${TYPE_COLOR[n.type]}`}>
                  {TYPE_ICON[n.type]}
                </span>
              </div>
              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-main leading-snug">{n.message}</p>
                <p className="text-xs text-text-sub mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
