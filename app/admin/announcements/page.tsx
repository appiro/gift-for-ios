"use client";

import { useEffect, useState } from 'react';

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
}

const TYPE_OPTIONS = [
  { value: 'info', label: 'お知らせ', color: 'bg-blue-100 text-blue-700' },
  { value: 'warning', label: '重要', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'maintenance', label: 'メンテナンス', color: 'bg-orange-100 text-orange-700' },
];

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    fetch('/api/admin/announcements').then(r => r.ok ? r.json() : []).then(setItems).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const post = async () => {
    if (!title.trim() || !body.trim()) return;
    setPosting(true);
    await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, type }),
    });
    setTitle(''); setBody(''); setType('info');
    load();
    setPosting(false);
  };

  const del = async (id: string) => {
    if (!confirm('このお知らせを削除しますか？')) return;
    setDeleting(id);
    await fetch('/api/admin/announcements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setItems(prev => prev.filter(a => a.id !== id));
    setDeleting(null);
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-black text-text-main mb-6">お知らせ管理</h2>

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm mb-8">
        <h3 className="text-sm font-black text-text-main mb-4">新しいお知らせを作成</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-sub mb-1.5 block">種類</label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setType(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    type === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border-light text-text-sub hover:border-primary/50'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-text-sub mb-1.5 block">タイトル</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="お知らせのタイトル"
              className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm bg-background-soft focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-bold text-text-sub mb-1.5 block">内容</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="お知らせの内容..." rows={4}
              className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm bg-background-soft focus:outline-none focus:border-primary resize-none" />
          </div>
          <button onClick={post} disabled={posting || !title.trim() || !body.trim()}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-50">
            {posting ? '送信中...' : '配信する'}
          </button>
        </div>
      </div>

      {/* List */}
      <h3 className="text-sm font-bold text-text-sub mb-3">配信済み ({items.length}件)</h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-border-light rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-text-sub text-sm">お知らせはありません</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const typeOpt = TYPE_OPTIONS.find(t => t.value === item.type) ?? TYPE_OPTIONS[0];
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-border-light p-5 shadow-sm flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeOpt.color}`}>{typeOpt.label}</span>
                    <span className="text-[10px] text-text-sub">{new Date(item.created_at).toLocaleString('ja-JP')}</span>
                  </div>
                  <p className="font-bold text-text-main text-sm">{item.title}</p>
                  <p className="text-xs text-text-sub mt-1 line-clamp-2">{item.body}</p>
                </div>
                <button onClick={() => del(item.id)} disabled={deleting === item.id}
                  className="flex-shrink-0 text-text-sub/40 hover:text-red-500 transition-colors disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
