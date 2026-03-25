"use client";

import { useEffect, useState } from 'react';

interface AdminUser {
  id: string;
  displayName: string;
  iconUrl: string;
  role: string;
  bannedAt: string | null;
  createdAt: string;
  reviewCount: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.ok ? r.json() : []).then(setUsers).finally(() => setLoading(false));
  }, []);

  const act = async (id: string, action: string) => {
    setActing(id);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    const updated = await fetch('/api/admin/users').then(r => r.json());
    setUsers(updated);
    setActing(null);
  };

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.id.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-text-main">ユーザー管理</h2>
        <span className="text-sm text-text-sub font-bold">{users.length}人</span>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="名前またはIDで検索..."
        className="w-full max-w-sm mb-5 px-4 py-2 border border-border-light rounded-xl text-sm bg-white focus:outline-none focus:border-primary"
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-border-light rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border-light bg-background-soft">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-text-sub">ユーザー</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sub">投稿数</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sub">登録日</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sub">ステータス</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {filtered.map(user => (
                <tr key={user.id} className={user.bannedAt ? 'bg-red-50/50' : ''}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={user.iconUrl} alt={user.displayName} className="w-8 h-8 rounded-full object-contain bg-background-soft p-1 border border-border-light" />
                      <div>
                        <p className="font-bold text-text-main">{user.displayName}</p>
                        <p className="text-[10px] text-text-sub font-mono">{user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-text-main">{user.reviewCount}</td>
                  <td className="px-4 py-3 text-text-sub text-xs">{new Date(user.createdAt).toLocaleDateString('ja-JP')}</td>
                  <td className="px-4 py-3">
                    {user.bannedAt ? (
                      <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">BAN済み</span>
                    ) : user.role === 'admin' ? (
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold">管理者</span>
                    ) : (
                      <span className="px-2 py-1 bg-background-soft text-text-sub rounded-full text-[10px] font-bold">一般</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {user.bannedAt ? (
                        <button onClick={() => act(user.id, 'unban')} disabled={acting === user.id}
                          className="text-xs font-bold px-3 py-1.5 border border-border-light rounded-lg text-text-sub hover:text-primary hover:border-primary transition-colors disabled:opacity-50">
                          BAN解除
                        </button>
                      ) : (
                        <button onClick={() => { if (confirm(`${user.displayName}をBANしますか？`)) act(user.id, 'ban'); }}
                          disabled={acting === user.id}
                          className="text-xs font-bold px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                          BAN
                        </button>
                      )}
                      {user.role !== 'admin' ? (
                        <button onClick={() => { if (confirm(`${user.displayName}を管理者にしますか？`)) act(user.id, 'setAdmin'); }}
                          disabled={acting === user.id}
                          className="text-xs font-bold px-3 py-1.5 border border-border-light rounded-lg text-text-sub hover:text-primary hover:border-primary transition-colors disabled:opacity-50">
                          管理者に
                        </button>
                      ) : (
                        <button onClick={() => { if (confirm('管理者権限を外しますか？')) act(user.id, 'removeAdmin'); }}
                          disabled={acting === user.id}
                          className="text-xs font-bold px-3 py-1.5 border border-border-light rounded-lg text-text-sub hover:text-primary hover:border-primary transition-colors disabled:opacity-50">
                          権限を外す
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-10 text-center text-text-sub text-sm">ユーザーが見つかりません</p>
          )}
        </div>
      )}
    </div>
  );
}
