"use client";

import { useEffect, useState } from 'react';
import { apiFetch, feedbackUrl } from '@/lib/api';

interface FeedbackItem {
  id: string;
  message: string;
  user_id: string | null;
  created_at: string;
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(feedbackUrl())
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-black text-text-main">ご意見一覧</h1>
        <p className="text-sm text-text-sub mt-1">ユーザーから送られたご意見です</p>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-border-light animate-pulse">
              <div className="h-3 w-24 bg-border-light rounded-full mb-3" />
              <div className="h-4 w-full bg-border-light rounded-full mb-2" />
              <div className="h-4 w-2/3 bg-border-light rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-white rounded-xl border border-border-light p-12 text-center">
          <p className="text-text-sub text-sm">まだご意見はありません</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-border-light p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-sub">
                  {new Date(item.created_at).toLocaleString('ja-JP')}
                </span>
                <span className="text-xs text-text-sub">
                  {item.user_id ? `UID: ${item.user_id.slice(0, 8)}...` : '未ログイン'}
                </span>
              </div>
              <p className="text-sm text-text-main whitespace-pre-wrap">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
