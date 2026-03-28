"use client";

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getSaves } from '@/lib/saves';

interface ListItem {
  id: string;
  review_id: string | null;
  position: number;
  snapshot_title: string;
  snapshot_product_name: string;
  snapshot_image_url: string;
  snapshot_author_name: string;
  comment: string;
}

interface GiftList {
  id: string;
  title: string;
  body: string;
  user_id: string;
  status: string;
  list_items: ListItem[];
}

interface ReviewResult {
  id: string;
  title: string;
  productName: string;
  imageUrl: string;
  authorName: string;
  status?: string;
}

function interpolate(text: string, activeCount: number): string {
  return text.replace(/\{n\}/g, String(activeCount));
}

type SearchTab = 'all' | 'mine' | 'saved';

export default function ListEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [list, setList] = useState<GiftList | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // popstate で「戻る」を検知するため、ダイアログ表示中はダミーエントリを積む
  const leaveDialogRef = useRef(false);

  // Search modal
  const [showModal, setShowModal] = useState(false);
  const [searchTab, setSearchTab] = useState<SearchTab>('all');
  const [allReviews, setAllReviews] = useState<ReviewResult[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewResult[]>([]);
  const [savedReviews, setSavedReviews] = useState<ReviewResult[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingReviewId, setAddingReviewId] = useState<string | null>(null);

  const activeCount = items.filter((i) => i.review_id !== null).length;
  const alreadyAddedIds = new Set(items.map((i) => i.review_id).filter(Boolean));

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/lists'); return; }

      const res = await fetch(`/api/lists/${id}`);
      if (!res.ok) { router.replace('/lists'); return; }

      const data: GiftList = await res.json();
      if (data.user_id !== user.id) { router.replace('/lists'); return; }

      setList(data);
      setTitle(data.title === '無題のまとめ' ? '' : data.title);
      setBody(data.body);
      setItems((data.list_items ?? []).sort((a, b) => a.position - b.position));
      setLoading(false);
    }
    init();
  }, [id]);

  // ブラウザのタブを閉じる・リロードするときに警告
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // ブラウザバック（戻るボタン）をダイアログで受け取る
  useEffect(() => {
    if (loading) return;
    // ダミーエントリを積んで「戻る」を検知できるようにする
    window.history.pushState({ leaveGuard: true }, '');
    const onPopState = () => {
      if (leaveDialogRef.current) return;
      leaveDialogRef.current = true;
      setShowLeaveDialog(true);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loading]);

  function requestLeave() {
    leaveDialogRef.current = true;
    setShowLeaveDialog(true);
  }

  async function leaveAsDraft() {
    setShowLeaveDialog(false);
    leaveDialogRef.current = false;
    router.push('/lists');
  }

  async function leaveAndDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/lists/${id}`, { method: 'DELETE' });
    } finally {
      setDeleting(false);
    }
    setShowLeaveDialog(false);
    leaveDialogRef.current = false;
    router.push('/lists');
  }

  async function openModal() {
    setShowModal(true);
    setSearchQuery('');
    setSearchTab('all');
    loadTabData('all');
  }

  async function loadTabData(tab: SearchTab) {
    setReviewsLoading(true);
    try {
      if (tab === 'all' && allReviews.length === 0) {
        const res = await fetch('/api/reviews');
        if (res.ok) setAllReviews(await res.json());
      } else if (tab === 'mine' && myReviews.length === 0) {
        const res = await fetch('/api/user/reviews');
        if (res.ok) {
          const data: ReviewResult[] = await res.json();
          setMyReviews(data.filter((r) => r.status === 'published'));
        }
      } else if (tab === 'saved' && savedReviews.length === 0) {
        const saves = getSaves();
        const ids = [...new Set([...saves.want, ...saves.gift])];
        const results = await Promise.all(
          ids.map((rid) => fetch(`/api/reviews/${rid}`).then((r) => r.ok ? r.json() : null))
        );
        setSavedReviews(results.filter(Boolean));
      }
    } finally {
      setReviewsLoading(false);
    }
  }

  function switchTab(tab: SearchTab) {
    setSearchTab(tab);
    setSearchQuery('');
    loadTabData(tab);
  }

  const currentList = searchTab === 'all' ? allReviews : searchTab === 'mine' ? myReviews : savedReviews;
  const filteredReviews = currentList.filter((r) => {
    const q = searchQuery.toLowerCase();
    return !q || (r.title ?? '').toLowerCase().includes(q) || (r.productName ?? '').toLowerCase().includes(q);
  });

  async function addReview(review: ReviewResult) {
    if (alreadyAddedIds.has(review.id)) return;
    setAddingReviewId(review.id);
    try {
      const res = await fetch(`/api/lists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id }),
      });
      if (!res.ok) return;
      const newItem: ListItem = await res.json();
      setItems((prev) => [...prev, newItem]);
      setShowModal(false);
    } finally {
      setAddingReviewId(null);
    }
  }

  async function updateComment(itemId: string, comment: string) {
    setItems((prev) => prev.map((item) => item.id === itemId ? { ...item, comment } : item));
    await fetch(`/api/lists/${id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
  }

  async function deleteItem(itemId: string) {
    const res = await fetch(`/api/lists/${id}/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  async function moveItem(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const newItems = [...items];
    const posA = newItems[index].position;
    const posB = newItems[swapIndex].position;
    newItems[index] = { ...newItems[index], position: posB };
    newItems[swapIndex] = { ...newItems[swapIndex], position: posA };
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setItems(newItems);
    await Promise.all([
      fetch(`/api/lists/${id}/items/${newItems[index].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: posA }) }),
      fetch(`/api/lists/${id}/items/${newItems[swapIndex].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: posB }) }),
    ]);
  }

  async function handleSave(status: 'draft' | 'published') {
    setSaving(true);
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || '無題のまとめ', body, status }),
      });
      if (!res.ok) return;
      if (status === 'published') router.push(`/lists/${id}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-10 flex gap-8">
        <div className="w-80 space-y-4 flex-shrink-0">
          <div className="h-10 bg-border-light rounded-xl animate-pulse" />
          <div className="h-32 bg-border-light rounded-xl animate-pulse" />
        </div>
        <div className="flex-1 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-border-light rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!list) return null;

  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text-main">まとめ投稿を編集</h1>
        <div className="flex items-center gap-2">
          <button onClick={requestLeave} className="px-3 py-1.5 text-sm text-text-sub hover:text-text-main border border-border-light rounded-full transition-colors">
            キャンセル
          </button>
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="px-3 py-1.5 text-sm font-bold border border-border-light bg-background-soft rounded-full hover:bg-white transition-colors disabled:opacity-50">
            下書き保存
          </button>
          <button onClick={() => handleSave('published')} disabled={saving}
            className="px-4 py-1.5 text-sm font-bold bg-accent-strong text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? '保存中...' : '投稿する'}
          </button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="bg-white border border-border-light rounded-2xl p-6 flex gap-8 items-start">

        {/* LEFT: Title + Body (sticky) */}
        <div className="w-80 flex-shrink-0 sticky top-24 space-y-5">
          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text-sub uppercase tracking-wide">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="おすすめ{n}選"
                className="w-full px-3 py-2.5 rounded-xl border border-border-light bg-background-soft text-text-main placeholder-text-sub focus:outline-none focus:border-primary text-base font-bold"
              />
              {title.includes('{n}') && (
                <p className="text-xs text-primary bg-primary/8 rounded-lg px-3 py-1.5 font-medium">
                  → {interpolate(title, activeCount)}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text-sub uppercase tracking-wide">本文</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="このまとめの説明や選んだ理由を書こう"
                rows={6}
                className="w-full px-3 py-2.5 rounded-xl border border-border-light bg-background-soft text-text-main placeholder-text-sub text-sm focus:outline-none focus:border-primary resize-none"
              />
              {body.includes('{n}') && (
                <p className="text-xs text-primary bg-primary/8 rounded-lg px-3 py-1.5 font-medium">
                  → {interpolate(body, activeCount)}
                </p>
              )}
            </div>

            {/* {n} hint */}
            <div className="bg-background-soft rounded-xl px-3 py-2.5 text-xs text-text-sub leading-relaxed">
              <span className="font-bold text-text-main">💡 </span>
              <code className="bg-white border border-border-light px-1.5 py-0.5 rounded font-mono text-primary">{'{n}'}</code>
              {' '}と書くと、引用口コミ数が自動で入ります
            </div>
          </div>

          {/* Stats */}
          <div className="border border-border-light rounded-xl p-4 flex items-center justify-between text-sm">
            <span className="text-text-sub">引用口コミ数</span>
            <span className="font-bold text-text-main text-lg">{activeCount}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-border-light flex-shrink-0" />

        {/* RIGHT: Items list */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="space-y-4">
          {/* Add button */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-main">引用口コミ</h2>
            <button onClick={openModal}
              className="flex items-center gap-1.5 bg-accent-strong text-white px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
              </svg>
              口コミを追加
            </button>
          </div>

          {/* Empty state */}
          {items.length === 0 && (
            <div className="border-2 border-dashed border-border-light rounded-2xl py-16 text-center">
              <p className="text-text-sub text-sm mb-3">まだ口コミが追加されていません</p>
              <button onClick={openModal} className="text-primary text-sm font-bold hover:underline">
                口コミを追加する →
              </button>
            </div>
          )}

          {/* Item list */}
          {items.map((item, index) => (
            <div key={item.id} className="border-b border-border-light pb-4 last:border-b-0 last:pb-0">
              <div className="flex gap-3">
                {/* Number + reorder */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                    {index + 1}
                  </span>
                  <button onClick={() => moveItem(index, 'up')} disabled={index === 0}
                    className="w-6 h-6 flex items-center justify-center rounded border border-border-light text-text-sub hover:bg-background-soft disabled:opacity-20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
                    </svg>
                  </button>
                  <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded border border-border-light text-text-sub hover:bg-background-soft disabled:opacity-20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                    </svg>
                  </button>
                </div>

                {/* Snapshot card */}
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-background-soft border border-border-light">
                    {item.snapshot_image_url
                      ? <img src={item.snapshot_image_url} alt={item.snapshot_title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-border-light" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-main text-sm line-clamp-2 leading-snug">{item.snapshot_title}</p>
                    <p className="text-xs text-text-sub mt-0.5">{item.snapshot_product_name}</p>
                    {!item.review_id && (
                      <span className="inline-block mt-1 text-[10px] bg-red-50 text-red-400 border border-red-100 px-2 py-0.5 rounded-full">削除済み</span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => deleteItem(item.id)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-border-light text-text-sub hover:bg-red-50 hover:text-red-400 hover:border-red-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                  </svg>
                </button>
              </div>

              {/* Comment */}
              <textarea
                value={item.comment}
                onChange={(e) => updateComment(item.id, e.target.value)}
                placeholder="この口コミへのコメントを書く..."
                rows={2}
                className="mt-3 w-full px-3 py-2 rounded-lg border border-border-light bg-background-soft text-text-main placeholder-text-sub text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Leave Dialog */}
      <AnimatePresence>
        {showLeaveDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => { setShowLeaveDialog(false); leaveDialogRef.current = false; window.history.pushState({ leaveGuard: true }, ''); }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border-light" />
              </div>
              <div className="px-5 pt-3 pb-6 space-y-3">
                <div className="pb-2">
                  <p className="text-base font-bold text-text-main">編集を終了しますか？</p>
                  <p className="text-xs text-text-sub mt-1">下書きとして保存すると、あとで続きを編集できます。</p>
                </div>
                <button
                  onClick={leaveAsDraft}
                  className="w-full py-3.5 bg-background-soft border border-border-light rounded-2xl text-sm font-bold text-text-main hover:bg-white transition-colors text-left px-4 flex items-center gap-3"
                >
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                      <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v7.293l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L7.5 9.293V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1z"/>
                    </svg>
                  </span>
                  <span>
                    <span className="block">下書きとして保存</span>
                    <span className="text-[11px] text-text-sub font-normal">あとで編集を再開できます</span>
                  </span>
                </button>
                <button
                  onClick={leaveAndDelete}
                  disabled={deleting}
                  className="w-full py-3.5 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-100 transition-colors text-left px-4 flex items-center gap-3 disabled:opacity-50"
                >
                  <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-red-400" viewBox="0 0 16 16">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                    </svg>
                  </span>
                  <span>
                    <span className="block">{deleting ? '削除中...' : '削除して終了'}</span>
                    <span className="text-[11px] text-red-400 font-normal">この投稿を完全に削除します</span>
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border-light flex-shrink-0">
              <h2 className="text-base font-bold text-text-main">口コミを追加</h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-background-soft text-text-sub hover:text-text-main transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/>
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border-light flex-shrink-0">
              {([
                { key: 'all', label: '全体から探す' },
                { key: 'mine', label: '自分の投稿' },
                { key: 'saved', label: '保存した投稿' },
              ] as { key: SearchTab; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => switchTab(key)}
                  className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
                    searchTab === key ? 'text-primary border-primary' : 'text-text-sub border-transparent hover:text-text-main'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="px-4 py-3 border-b border-border-light flex-shrink-0">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub pointer-events-none">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                </svg>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="タイトル・商品名で絞り込み"
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-light bg-background-soft text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {reviewsLoading ? (
                <div className="py-10 text-center text-text-sub text-sm">読み込み中...</div>
              ) : filteredReviews.length === 0 ? (
                <div className="py-10 text-center text-text-sub text-sm">
                  {searchQuery ? '検索結果がありません' : searchTab === 'mine' ? '公開中の投稿がありません' : searchTab === 'saved' ? '保存した口コミがありません' : '口コミがありません'}
                </div>
              ) : (
                <ul className="divide-y divide-border-light">
                  {filteredReviews.map((review) => {
                    const alreadyAdded = alreadyAddedIds.has(review.id);
                    return (
                      <li key={review.id}>
                        <button onClick={() => !alreadyAdded && addReview(review)}
                          disabled={alreadyAdded || addingReviewId === review.id}
                          className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                            alreadyAdded ? 'opacity-50 cursor-default' : 'hover:bg-background-soft'
                          }`}>
                          <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-background-soft border border-border-light">
                            {review.imageUrl
                              ? <img src={review.imageUrl} alt={review.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-border-light" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-text-main text-sm line-clamp-1">{review.title}</p>
                            <p className="text-xs text-text-sub line-clamp-1 mt-0.5">{review.productName}</p>
                            {review.authorName && <p className="text-[10px] text-text-sub mt-0.5">by {review.authorName}</p>}
                          </div>
                          {alreadyAdded ? (
                            <span className="text-xs text-text-sub flex-shrink-0 bg-background-soft px-2 py-1 rounded-full">追加済み</span>
                          ) : addingReviewId === review.id ? (
                            <span className="text-xs text-text-sub flex-shrink-0">追加中...</span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-primary flex-shrink-0" viewBox="0 0 16 16">
                              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
