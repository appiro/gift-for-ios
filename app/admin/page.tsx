"use client";

import { useEffect, useState } from 'react';
import { apiFetch, adminStatsUrl } from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalReviews: number;
  totalLists: number;
  newUsers: number;
  newReviews: number;
  totalWant: number;
  totalGift: number;
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
      <p className="text-xs font-bold text-text-sub uppercase tracking-wider mb-3">{label}</p>
      <p className={`text-3xl font-black ${color ?? 'text-text-main'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-text-sub mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch(adminStatsUrl()).then(r => r.ok ? r.json() : null).then(setStats);
  }, []);

  if (!stats) return (
    <div className="space-y-2">
      <div className="h-8 w-48 bg-border-light rounded-xl animate-pulse mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(7)].map((_, i) => <div key={i} className="h-28 bg-border-light rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-black text-text-main mb-6">ダッシュボード</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="総ユーザー数" value={stats.totalUsers} sub={`+${stats.newUsers} 過去7日`} />
        <StatCard label="公開口コミ数" value={stats.totalReviews} sub={`+${stats.newReviews} 過去7日`} color="text-primary" />
        <StatCard label="公開まとめ数" value={stats.totalLists} />
        <StatCard label="欲しい！累計" value={stats.totalWant} color="text-secondary" />
        <StatCard label="贈りたい！累計" value={stats.totalGift} color="text-accent-strong" />
      </div>
    </div>
  );
}
