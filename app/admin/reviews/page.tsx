"use client";

import { useEffect, useState } from 'react';

interface AdminReview {
  id: string;
  title: string;
  product_name: string;
  image_url: string | null;
  author_name: string;
  author_id: string;
  status: string;
  created_at: string;
  want_count: number;
  gift_count: number;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = (p: number) => {
    setLoading(true);
    fetch(`/api/admin/reviews?page=${p}`)
      .then(r => r.ok ? r.json() : { reviews: [], total: 0 })
      .then(({ reviews: r, total: t }) => { setReviews(r); setTotal(t); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  const deleteReview = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) return;
    setDeleting(id);
    await fetch('/api/admin/reviews', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setReviews(prev => prev.filter(r => r.id !== id));
    setTotal(prev => prev - 1);
    setDeleting(null);
  };

  const filtered = reviews.filter(r =>
    r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.author_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / 30);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-text-main">口コミ管理</h2>
        <span className="text-sm text-text-sub font-bold">全{total}件</span>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="商品名・投稿者で絞り込み..."
        className="w-full max-w-sm mb-5 px-4 py-2 border border-border-light rounded-xl text-sm bg-white focus:outline-none focus:border-primary"
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="aspect-square bg-border-light rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(review => (
              <div key={review.id} className="bg-white rounded-2xl border border-border-light overflow-hidden shadow-sm group">
                <div className="aspect-square bg-background-soft relative">
                  {review.image_url
                    ? <img src={review.image_url} alt={review.product_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-border-light">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z"/></svg>
                      </div>
                  }
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => deleteReview(review.id, review.product_name ?? review.title)}
                      disabled={deleting === review.id}
                      className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {deleting === review.id ? '削除中...' : '削除'}
                    </button>
                  </div>
                  <span className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    review.status === 'published' ? 'bg-primary/90 text-white' : 'bg-black/50 text-white'
                  }`}>{review.status === 'published' ? '公開' : review.status}</span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-text-main line-clamp-1">{review.product_name ?? review.title}</p>
                  <p className="text-[10px] text-text-sub mt-0.5">by {review.author_name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-secondary">欲しい {review.want_count}</span>
                    <span className="text-[10px] text-accent-strong">贈りたい {review.gift_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 border border-border-light rounded-xl text-sm font-bold text-text-sub hover:text-primary disabled:opacity-40">前へ</button>
              <span className="text-sm font-bold text-text-sub">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-4 py-2 border border-border-light rounded-xl text-sm font-bold text-text-sub hover:text-primary disabled:opacity-40">次へ</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
