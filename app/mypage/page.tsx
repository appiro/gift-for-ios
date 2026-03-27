"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReviewCard from "@/components/ReviewCard";
import { createClient } from "@/lib/supabase/client";

// ───────── Types ─────────
type ReviewStatus = "published" | "private" | "draft" | "trash";
type MainTab = ReviewStatus | "lists";

type UserReview = { id: string; imageUrl: string; title: string; productName: string; price: string; likes: number; episode: string; status: ReviewStatus; updatedAt?: string };
type UserList = { id: string; title: string; coverUrl: string | null; status: string; reviewCount: number };

const mockReviews: UserReview[] = [];

const mockNotifications = [
  { id: "1", type: "comment", user: "後輩A", text: "「香りは強すぎませんか？」", time: "2時間前", read: false },
  { id: "2", type: "like", user: "同期B", text: "あなたの投稿に「贈りたい！」しました", time: "1日前", read: true },
];

// デフォルトのタグプール
const DEFAULT_TAG_POOL = [
  "#20代", "#30代", "#40代", "#50代以上",
  "#男性", "#女性",
  "#エンジニア", "#デザイナー", "#営業", "#事務", "#医療系", "#教育系", "#フリーランス",
  "#先輩気質", "#後輩気質", "#ギフト上手", "#センスあり", "#コスパ重視", "#こだわり派",
  "#関東", "#関西", "#東海", "#九州", "#北海道", "#東北",
];

const TAGS_STORAGE_KEY = "gift-for-tag-pool";
const PROFILE_STORAGE_KEY = "gift-for-profile";

interface ProfileInfo {
  age: string;
  gender: string;
  occupation: string;
  region: string;
  bio: string;
}
interface ProfilePrivacy {
  age: boolean;
  gender: boolean;
  occupation: boolean;
  region: boolean;
  bio: boolean;
}

// ───────── Main Component ─────────
export default function MyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<MainTab>("published");
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showIconModal, setShowIconModal] = useState(false);
  const [pendingIcon, setPendingIcon] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userIcon, setUserIcon] = useState("/icons/cat.png");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [apiReviews, setApiReviews] = useState<UserReview[]>([]);

  // 投稿の公開ステータス（確定済み）
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ReviewStatus>>({});
  // モーダル内での編集中コピー
  const [draftStatuses, setDraftStatuses] = useState<Record<string, ReviewStatus>>({});
  // 確認ダイアログのモード
  const [confirmMode, setConfirmMode] = useState<"discard" | "save" | null>(null);
  // モーダル内でゴミ箱に移動予定の口コミ（まだAPIには送っていない）
  const [pendingTrash, setPendingTrash] = useState<Set<string>>(new Set());

  const hasChanges =
    Object.keys(draftStatuses).some((id) => draftStatuses[id] !== reviewStatuses[id]) ||
    pendingTrash.size > 0;

  const openEditModal = () => {
    setDraftStatuses({ ...reviewStatuses });
    setConfirmMode(null);
    setPendingTrash(new Set());
    setShowEditModal(true);
  };
  const toggleDraft = (id: string) => {
    setDraftStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === "published" ? "private" : "published",
    }));
  };
  // 「保存する」ボタン指示: 変更あり→確認ダイアログ
  const onSaveClick = () => { if (hasChanges) setConfirmMode("save"); };
  // 「キャンセル」ボタン指示: 変更あり→確認ダイアログ、なし→即閉じ
  const onCancelClick = () => { if (hasChanges) setConfirmMode("discard"); else closeModal(); };
  // Xボタン/オーバーレイがキャンセルと同じ机能
  const tryClose = onCancelClick;
  const closeModal = () => { setShowEditModal(false); setConfirmMode(null); };
  const saveEdit = async () => {
    const changed = Object.keys(draftStatuses).filter(
      (id) => draftStatuses[id] !== reviewStatuses[id]
    );
    const trashIds = [...pendingTrash];
    await Promise.all([
      ...changed.map((id) =>
        fetch('/api/user/reviews', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: draftStatuses[id] }),
        })
      ),
      ...trashIds.map((id) =>
        fetch('/api/user/reviews', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'trash' }),
        })
      ),
    ]);
    const now = new Date().toISOString();
    setReviewStatuses((prev) => {
      const next = { ...prev, ...draftStatuses };
      trashIds.forEach((id) => { next[id] = 'trash'; });
      return next;
    });
    setApiReviews((prev) =>
      prev.map((r) => {
        if (pendingTrash.has(r.id)) return { ...r, status: 'trash', updatedAt: now };
        return { ...r, status: draftStatuses[r.id] ?? r.status };
      })
    );
    setPendingTrash(new Set());
    closeModal();
  };
  const discardEdit = () => { setDraftStatuses({}); setPendingTrash(new Set()); closeModal(); };


  const permanentDelete = async (id: string) => {
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('削除に失敗しました'); return; }
    setApiReviews((prev) => prev.filter((r) => r.id !== id));
    setReviewStatuses((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setDraftStatuses((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  // 確定済みステータスを反映したレビューリスト（タブ表示用）
  const reviews = apiReviews.map((r) => ({ ...r, status: reviewStatuses[r.id] ?? r.status }));


  // タグ
  const [tagPool, setTagPool] = useState<string[]>(DEFAULT_TAG_POOL);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);

  // 基本情報
  const [profileInfo, setProfileInfo] = useState<ProfileInfo>({ age: "", gender: "", occupation: "", region: "", bio: "" });
  const [profilePrivacy, setProfilePrivacy] = useState<ProfilePrivacy>({ age: true, gender: true, occupation: true, region: true, bio: true });

  useEffect(() => {
    // Auth check + load real reviews
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUserEmail(user.email ?? '');

      // 未読通知数を取得
      fetch('/api/notifications')
        .then((r) => r.ok ? r.json() : [])
        .then((data: { is_read: boolean }[]) => {
          setUnreadCount(Array.isArray(data) ? data.filter((n) => !n.is_read).length : 0);
        });

      // Load profile (name + icon)
      fetch('/api/user/profile')
        .then((r) => r.ok ? r.json() : null)
        .then((profile) => {
          const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'ゲスト';
          setUserName(name);
          setNameInput(name);
          if (profile?.icon_url) setUserIcon(profile.icon_url);
        });

      fetch('/api/user/reviews')
        .then((r) => r.json())
        .then((data: UserReview[]) => {
          if (!Array.isArray(data)) return;
          // 7日超のゴミ箱アイテムを自動完全削除
          const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
          const expired = data.filter((r) =>
            r.status === 'trash' &&
            r.updatedAt &&
            Date.now() - new Date(r.updatedAt).getTime() > WEEK_MS
          );
          expired.forEach((r) =>
            fetch(`/api/reviews/${r.id}`, { method: 'DELETE' })
          );
          const alive = data.filter((r) => !expired.find((e) => e.id === r.id));
          setApiReviews(alive);
          setReviewStatuses(Object.fromEntries(alive.map((r) => [r.id, r.status])));
        })
        .finally(() => setLoadingReviews(false));

      // Load user's lists
      setLoadingLists(true);
      fetch(`/api/lists?userId=${user.id}`)
        .then((r) => r.ok ? r.json() : [])
        .then((data) => {
          if (Array.isArray(data)) {
            setUserLists(data.map((list: { id: string; title: string; status: string; list_items?: { snapshot_image_url?: string }[] }) => ({
              id: list.id,
              title: list.title,
              status: list.status,
              coverUrl: list.list_items?.[0]?.snapshot_image_url ?? null,
              reviewCount: list.list_items?.length ?? 0,
            })));
          }
        })
        .finally(() => setLoadingLists(false));
    });

    // Load localStorage settings
    try {
      const storedPool = localStorage.getItem(TAGS_STORAGE_KEY);
      if (storedPool) setTagPool(JSON.parse(storedPool));
      const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const p = JSON.parse(storedProfile);
        if (p.info) setProfileInfo(p.info);
        if (p.privacy) setProfilePrivacy(p.privacy);
        if (p.tags) setUserTags(p.tags);
        if (p.icon) setUserIcon(p.icon);
      }
    } catch {}
  }, []);

  const saveProfile = async () => {
    const trimmed = nameInput.trim();
    if (trimmed) setUserName(trimmed);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ info: profileInfo, privacy: profilePrivacy, tags: userTags, icon: userIcon }));
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: trimmed || userName }),
    });
    setShowProfileModal(false);
  };

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return tagPool;
    return tagPool.filter((t) => t.toLowerCase().includes(q));
  }, [tagPool, tagSearch]);

  const addTag = (tag: string) => {
    if (userTags.length >= 3 || userTags.includes(tag)) return;
    setUserTags((prev) => [...prev, tag]);
    setTagSearch("");
  };

  const createTag = () => {
    const raw = tagSearch.trim();
    if (!raw) return;
    const tag = raw.startsWith("#") ? raw : `#${raw}`;
    if (!tagPool.includes(tag)) {
      const newPool = [...tagPool, tag];
      setTagPool(newPool);
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(newPool));
    }
    addTag(tag);
  };

  const removeTag = (tag: string) => setUserTags((prev) => prev.filter((t) => t !== tag));

  // 新規タグボタンの表示条件
  const newTagLabel = tagSearch.trim().startsWith("#") ? tagSearch.trim() : `#${tagSearch.trim()}`;
  const showCreateButton = tagSearch.trim() !== "" && !tagPool.includes(newTagLabel);

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col h-full relative">

      {/* ─── Profile Card（コンパクト横並び） ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-border-light relative flex-shrink-0"
      >
        {/* ─── Icon Modal ─── */}
        <AnimatePresence>
          {showIconModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setPendingIcon(null); setShowIconModal(false); }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md landscape:max-w-2xl bg-white rounded-3xl z-[70] shadow-2xl border border-border-light max-h-[85vh] flex flex-col landscape:flex-row overflow-hidden"
              >
                {/* アイコングリッド側 */}
                <div className="flex flex-col flex-1 p-6 min-h-0">
                  <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-text-main">アイコンの変更</h3>
                    <button onClick={() => { setPendingIcon(null); setShowIconModal(false); }} className="w-8 h-8 flex items-center justify-center bg-background-soft rounded-full text-text-sub">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3 overflow-y-auto py-2 flex-1 place-items-center">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const src = `/icons/processed_icon-${i + 1}.png`;
                      const isSelected = (pendingIcon ?? userIcon) === src;
                      return (
                        <button key={i} onClick={() => setPendingIcon(src)}
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 transition-all p-1.5 hover:scale-105 ${isSelected ? "border-primary bg-primary/10" : "border-border-light hover:border-primary/50"}`}>
                          <img src={src} alt={`Icon ${i + 1}`} className="w-full h-full object-contain" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 右パネル（横画面でのみ表示） / 縦画面では下に追加 */}
                <div className="landscape:w-44 landscape:border-l border-t landscape:border-t-0 border-border-light p-5 flex flex-col gap-4 flex-shrink-0 landscape:justify-between">
                  {/* プレビュー */}
                  <div className="hidden landscape:flex flex-col items-center gap-2">
                    <p className="text-xs text-text-sub font-bold">選択中</p>
                    <div className="w-20 h-20 rounded-full border-2 border-primary bg-primary/5 overflow-hidden p-2">
                      <img
                        src={pendingIcon ?? userIcon}
                        alt="preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-text-sub text-center landscape:mt-auto">
                    イラスト提供：<a href="https://tegakisozai.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">てがきっず</a> / ©てがきっず
                  </div>

                  <div className="flex landscape:flex-col gap-3">
                    <button
                      onClick={() => { setPendingIcon(null); setShowIconModal(false); }}
                      className="flex-1 py-2.5 border border-border-light rounded-xl text-sm font-bold text-text-sub hover:bg-background-soft transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      disabled={!pendingIcon}
                      onClick={async () => {
                        if (!pendingIcon) return;
                        setUserIcon(pendingIcon);
                        try {
                          const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
                          const p = stored ? JSON.parse(stored) : {};
                          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...p, icon: pendingIcon }));
                        } catch {}
                        setPendingIcon(null);
                        setShowIconModal(false);
                        await fetch('/api/user/profile', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ icon_url: pendingIcon }),
                        });
                      }}
                      className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-40"
                    >
                      変更する
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ─── Tag Picker Sheet ─── */}
        <AnimatePresence>
          {showTagPicker && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setShowTagPicker(false); setTagSearch(""); }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]" />
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.96 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md bg-white rounded-3xl z-[90] shadow-2xl border border-border-light flex flex-col max-h-[80vh]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-light flex-shrink-0">
                  <div>
                    <h3 className="text-base font-bold text-text-main">タグを選ぶ</h3>
                    <p className="text-xs text-text-sub mt-0.5">最大3つまで選択できます</p>
                  </div>
                  <button onClick={() => { setShowTagPicker(false); setTagSearch(""); }}
                    className="w-8 h-8 flex items-center justify-center bg-background-soft rounded-full text-text-sub hover:text-text-main transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {/* Selected tags */}
                <div className="px-5 py-3 border-b border-border-light flex-shrink-0 min-h-[52px] flex flex-wrap gap-2 items-center">
                  <AnimatePresence>
                    {userTags.map((tag) => (
                      <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1.5 bg-primary/15 text-text-main border border-primary/30 px-3 py-1 rounded-full text-xs font-bold">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-text-sub hover:text-[#d00000] transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/></svg>
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  {userTags.length === 0 && <span className="text-xs text-text-sub">選択中のタグなし</span>}
                  {userTags.length < 3 && userTags.length > 0 && <span className="text-xs text-text-sub">あと {3 - userTags.length} つ</span>}
                </div>

                {/* Search */}
                <div className="px-5 py-3 flex-shrink-0">
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub pointer-events-none">
                      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                    </svg>
                    <input type="text" value={tagSearch} onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="タグを検索、または新しく作成..."
                      className="w-full bg-background-soft border border-border-light rounded-xl pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
                    {tagSearch && (
                      <button onClick={() => setTagSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-text-main">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tag list */}
                <div className="flex-1 overflow-y-auto px-5 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {userTags.length < 3 && filteredTags.filter((t) => !userTags.includes(t)).map((tag) => (
                      <button key={tag} onClick={() => addTag(tag)}
                        className="px-3 py-1.5 text-xs border border-border-light rounded-full text-text-sub hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
                        {tag}
                      </button>
                    ))}
                    {userTags.length >= 3 && (
                      <p className="text-xs text-text-sub py-2 w-full text-center">3つ選択済みです。外すには上のタグをタップ。</p>
                    )}
                    {showCreateButton && userTags.length < 3 && (
                      <button onClick={createTag}
                        className="px-3 py-1.5 text-xs border border-dashed border-primary/50 rounded-full text-primary hover:bg-primary/10 transition-all flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        「{newTagLabel}」を作成して追加
                      </button>
                    )}
                    {filteredTags.filter((t) => !userTags.includes(t)).length === 0 && !tagSearch.trim() && userTags.length < 3 && (
                      <p className="text-xs text-text-sub py-2">タグを検索、または新しく入力して作成できます</p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border-light flex-shrink-0">
                  <button onClick={() => { setShowTagPicker(false); setTagSearch(""); }}
                    className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors">
                    決定する
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ─── Profile Edit Modal ─── */}
        <AnimatePresence>
          {showProfileModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfileModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg landscape:max-w-3xl bg-white rounded-3xl z-[70] shadow-2xl border border-border-light max-h-[90vh] flex flex-col"
              >
                {/* Header */}
                <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-border-light flex-shrink-0">
                  <h3 className="text-xl font-bold text-text-main">プロフィール編集</h3>
                  <button onClick={() => setShowProfileModal(false)} className="w-8 h-8 flex items-center justify-center bg-background-soft rounded-full text-text-sub">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 landscape:flex landscape:gap-6 landscape:space-y-0 landscape:overflow-hidden">

                  <div className="landscape:w-[45%] landscape:overflow-y-auto landscape:flex-shrink-0 space-y-6">
                  {/* ── ユーザー名 ── */}
                  <section>
                    <h4 className="text-sm font-bold text-text-main mb-2">ユーザー名</h4>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="ユーザー名を入力"
                      maxLength={30}
                      className="w-full bg-background-soft border border-border-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </section>

                  {/* ── 自分のタグ ── */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-text-main">自分のタグ <span className="text-xs font-normal text-text-sub ml-1">（最大3つ）</span></h4>
                      <button
                        onClick={() => setShowTagPicker(true)}
                        className="flex items-center gap-1 text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1 rounded-full border border-primary/30 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        タグを選ぶ
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[36px]">
                      <AnimatePresence>
                        {userTags.map((tag) => (
                          <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            className="inline-flex items-center gap-1.5 bg-primary/15 text-text-main border border-primary/30 px-3 py-1 rounded-full text-xs font-bold">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="text-text-sub hover:text-[#d00000] transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/></svg>
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                      {userTags.length === 0 && (
                        <span className="text-xs text-text-sub self-center">タグが選択されていません</span>
                      )}
                    </div>
                  </section>

                  {/* ── 自己紹介 ── */}
                  <section>
                    <ProfileFieldRow label="自己紹介" isPublic={profilePrivacy.bio} onToggle={() => setProfilePrivacy((p) => ({ ...p, bio: !p.bio }))} vertical>
                      <textarea value={profileInfo.bio} onChange={(e) => setProfileInfo((p) => ({ ...p, bio: e.target.value }))} placeholder="ギフト選びのこだわりや、どんな場面でよく送るかなど..." rows={3} maxLength={200} className="w-full bg-background-soft border border-border-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
                      <p className="text-[10px] text-text-sub text-right mt-1">{profileInfo.bio.length}/200</p>
                    </ProfileFieldRow>
                  </section>
                  </div>

                  <div className="landscape:flex-1 landscape:overflow-y-auto">
                  {/* ── 基本情報 ── */}
                  <section>
                    <h4 className="text-sm font-bold text-text-main mb-1">基本情報</h4>
                    <p className="text-xs text-text-sub mb-2">各項目の公開・非公開を個別に設定できます。</p>
                    <div className="space-y-2">
                      <ProfileFieldRow label="年齢" isPublic={profilePrivacy.age} onToggle={() => setProfilePrivacy((p) => ({ ...p, age: !p.age }))}>
                        <select value={profileInfo.age} onChange={(e) => setProfileInfo((p) => ({ ...p, age: e.target.value }))} className="flex-1 bg-background-soft border border-border-light rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:border-primary">
                          <option value="">未設定</option>
                          {["10代", "20代前半", "20代後半", "30代前半", "30代後半", "40代", "50代以上"].map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </ProfileFieldRow>

                      <ProfileFieldRow label="性別" isPublic={profilePrivacy.gender} onToggle={() => setProfilePrivacy((p) => ({ ...p, gender: !p.gender }))}>
                        <select value={profileInfo.gender} onChange={(e) => setProfileInfo((p) => ({ ...p, gender: e.target.value }))} className="flex-1 bg-background-soft border border-border-light rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:border-primary">
                          <option value="">未設定</option>
                          {["男性", "女性", "その他", "回答しない"].map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </ProfileFieldRow>

                      <ProfileFieldRow label="職業" isPublic={profilePrivacy.occupation} onToggle={() => setProfilePrivacy((p) => ({ ...p, occupation: !p.occupation }))}>
                        <input type="text" value={profileInfo.occupation} onChange={(e) => setProfileInfo((p) => ({ ...p, occupation: e.target.value }))} placeholder="エンジニア、看護師など" className="flex-1 bg-background-soft border border-border-light rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:border-primary" />
                      </ProfileFieldRow>

                      <ProfileFieldRow label="地域" isPublic={profilePrivacy.region} onToggle={() => setProfilePrivacy((p) => ({ ...p, region: !p.region }))}>
                        <select value={profileInfo.region} onChange={(e) => setProfileInfo((p) => ({ ...p, region: e.target.value }))} className="flex-1 bg-background-soft border border-border-light rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:border-primary">
                          <option value="">未設定</option>
                          {["北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州・沖縄"].map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </ProfileFieldRow>
                    </div>
                  </section>
                  </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border-light flex gap-3 flex-shrink-0">
                  <button onClick={() => setShowProfileModal(false)} className="flex-1 py-2.5 border border-border-light rounded-xl text-sm font-bold text-text-sub hover:bg-background-soft transition-colors">
                    キャンセル
                  </button>
                  <button onClick={saveProfile} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm">
                    保存する
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Pastel decorative background */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <button onClick={() => setShowIconModal(true)} className="w-14 h-14 rounded-full bg-white p-0.5 border border-border-light shadow-sm hover:scale-105 transition-all group relative flex-shrink-0">
            <div className="w-full h-full rounded-full bg-background-soft overflow-hidden p-1.5 flex items-center justify-center relative">
              <img src={userIcon} alt="Profile" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-full text-[10px] font-bold">編集</div>
            </div>
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-text-main truncate">{userName || 'ゲスト'}</h1>
              <button onClick={() => { setNameInput(userName); setShowProfileModal(true); }} className="text-[10px] font-bold px-2.5 py-1 bg-background-soft border border-border-light rounded-full text-text-sub hover:text-primary transition-colors flex-shrink-0">
                編集
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {userTags.map((tag) => (
                <span key={tag} className="text-[10px] font-bold text-text-sub bg-background-soft border border-border-light px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 bg-background-soft/60 px-4 py-2 rounded-2xl border border-border-light/50 flex-shrink-0">
            <div className="text-center">
              <span className="block text-lg font-black text-text-main">{reviews.filter(r => r.status === 'published').length}</span>
              <span className="text-[9px] font-bold text-text-sub">投稿数</span>
            </div>
          </div>

          {/* Notification Bell */}
          <Link
            href="/notifications"
            className="w-10 h-10 bg-[#fefae0] text-[#fb8500] border border-border-light rounded-full flex items-center justify-center hover:scale-105 transition-transform relative flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </motion.div>

      {/* ─── Tabs ─── */}
      <div className="border-b border-border-light mt-3 flex-shrink-0">
        <div className="flex items-end">
          {/* スクロール可能なタブ */}
          <div className="flex gap-1 sm:gap-5 overflow-x-auto flex-1 px-1 hide-scrollbar">
            {(["published", "private", "draft", "trash", "lists"] as const).map((tab) => {
              const label = tab === "published" ? "公開中" : tab === "private" ? "非公開" : tab === "draft" ? "下書き" : tab === "trash" ? "ごみ箱" : "まとめ";
              const count = tab === "lists" ? userLists.length : reviews.filter((r) => r.status === tab).length;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`relative pb-3 px-2 sm:px-0 text-xs sm:text-sm font-bold transition-colors flex items-center gap-1 flex-shrink-0 ${activeTab === tab ? "text-text-main" : "text-text-sub hover:text-primary"}`}>
                  {label}
                  <span className={`text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab ? "bg-primary/15 text-primary" : "bg-background-soft text-text-sub"
                  }`}>{count}</span>
                  {activeTab === tab && <motion.div layoutId="myPageTabUnderline" className="absolute bottom-0 left-0 w-full h-1 bg-secondary rounded-t-full" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                </button>
              );
            })}
          </div>

          {/* 右詰め：公開情報を編集ボタン */}
          <div className="pb-3 pl-2 flex-shrink-0">
            <button
              onClick={openEditModal}
              className="flex items-center gap-1 bg-white border border-border-light text-text-main px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-bold shadow-sm hover:border-primary hover:text-primary transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span className="hidden sm:inline">公開情報を編集</span>
              <span className="sm:hidden">編集</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 公開情報を編集モーダル ─── */}
      <AnimatePresence>
        {showEditModal && (
          <>
            {/* オーバーレイ */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={tryClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" />

            {/* モーダル本体 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg bg-white rounded-3xl z-[70] shadow-2xl border border-border-light max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-border-light flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-text-main">公開情報を編集</h3>
                  <p className="text-xs text-text-sub mt-0.5">口コミの公開ステータスを変更して「保存」してください</p>
                </div>
                <button onClick={tryClose} className="w-8 h-8 flex items-center justify-center bg-background-soft rounded-full text-text-sub hover:text-text-main transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 px-4 py-4 space-y-2">
                {reviews.filter((r) => r.status !== "draft" && r.status !== "trash" && !pendingTrash.has(r.id)).length === 0 && (
                  <p className="text-center text-sm text-text-sub py-10">公開・非公開の口コミがありません</p>
                )}
                {pendingTrash.size > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-500 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
                    {pendingTrash.size}件をゴミ箱に移動します（保存で確定）
                  </div>
                )}
                {reviews.filter((r) => r.status !== "draft" && r.status !== "trash" && !pendingTrash.has(r.id)).map((review) => (
                  <motion.div key={review.id} layout className="flex items-start gap-3 p-4 bg-background-soft/60 border border-border-light/60 rounded-2xl hover:border-primary/30 transition-colors">
                    {/* テキスト情報 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-sub mb-0.5 truncate">{review.title}</p>
                      <p className="text-sm font-bold text-text-main truncate">{review.productName}</p>
                      <p className="text-xs text-text-sub mt-1 line-clamp-2 leading-relaxed">{review.episode}</p>
                      <p className="text-[10px] text-text-sub mt-1.5">{review.price}</p>
                    </div>

                    {/* ステータストグル + 削除 */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1.5">

                      {/* 削除ボタン → ゴミ箱予約（保存時に確定） */}
                      <button
                        onClick={() => setPendingTrash((prev) => new Set([...prev, review.id]))}
                        className="text-[10px] text-text-sub/50 hover:text-red-500 transition-colors flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                        </svg>
                        削除
                      </button>

                      <button
                        onClick={() => toggleDraft(review.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                          draftStatuses[review.id] === "published"
                            ? "bg-primary/10 border-primary/40 text-primary hover:bg-[#d00000]/10 hover:border-[#d00000]/40 hover:text-[#d00000]"
                            : "bg-background-soft border-border-light text-text-sub hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        {draftStatuses[review.id] === "published" ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>
                            公開中
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474zM5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/></svg>
                            非公開
                          </>
                        )}
                      </button>
                      <span className="text-[9px] text-text-sub/60">タップで切替</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border-light flex gap-3 flex-shrink-0">
                {/* キャンセル: 変更あり→確認、なし→即閉じ */}
                <button
                  onClick={onCancelClick}
                  className="flex-1 py-2.5 border border-border-light rounded-xl text-sm font-bold text-text-sub hover:bg-background-soft transition-colors"
                >
                  キャンセル
                </button>
                {/* 保存: 変更あり→確認、なし→無効 */}
                <button
                  onClick={onSaveClick}
                  disabled={!hasChanges}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm ${
                    hasChanges
                      ? "bg-primary text-white hover:bg-primary-hover"
                      : "bg-background-soft text-text-sub cursor-not-allowed"
                  }`}
                >
                  保存する
                </button>
              </div>

              {/* 確認ダイアログ */}
              <AnimatePresence>
                {confirmMode !== null && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/25 rounded-3xl z-10"
                      onClick={() => setConfirmMode(null)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
                      transition={{ type: "spring", bounce: 0.3 }}
                      className="absolute bottom-6 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-border-light p-5 z-20"
                    >
                      {confirmMode === "discard" ? (
                        // --- キャンセル時の確認 ---
                        <>
                          <p className="text-sm font-bold text-text-main mb-1">変更を破棄しますか？</p>
                          <p className="text-xs text-text-sub mb-4">未保存の変更は元に戻ります。</p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setConfirmMode(null)}
                              className="flex-1 py-2.5 border border-border-light rounded-xl text-sm font-bold text-text-sub hover:bg-background-soft transition-colors"
                            >
                              戻る
                            </button>
                            <button
                              onClick={discardEdit}
                              className="flex-1 py-2.5 bg-[#d00000]/10 border border-[#d00000]/30 text-[#d00000] rounded-xl text-sm font-bold hover:bg-[#d00000]/20 transition-colors"
                            >
                              変更を破棄
                            </button>
                          </div>
                        </>
                      ) : (
                        // --- 保存時の確認 ---
                        <>
                          <p className="text-sm font-bold text-text-main mb-1">変更を保存しますか？</p>
                          <p className="text-xs text-text-sub mb-4">
                            {pendingTrash.size > 0
                              ? `${pendingTrash.size}件の口コミがゴミ箱に移動されます。1週間後に自動削除されますが、それ以内なら元に戻せます。`
                              : 'ステータスの変更が反映されます。'}
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setConfirmMode(null)}
                              className="flex-1 py-2.5 border border-border-light rounded-xl text-sm font-bold text-text-sub hover:bg-background-soft transition-colors"
                            >
                              戻る
                            </button>
                            <button
                              onClick={saveEdit}
                              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm"
                            >
                              確定
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto mt-4 pb-4">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={activeTab} initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.98 }} transition={{ duration: 0.5, type: "spring", bounce: 0.3 }} className="w-full">
            {activeTab === "lists" ? (
              loadingLists ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(4)].map((_, i) => <div key={i} className="aspect-square bg-border-light rounded-2xl animate-pulse" />)}
                </div>
              ) : userLists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-text-sub text-sm font-bold">まとめ投稿はありません</p>
                  <Link href="/lists/new" className="mt-4 px-5 py-2 bg-primary text-white text-xs font-bold rounded-full hover:opacity-90 transition-opacity">まとめを作る</Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {userLists.map((list, i) => (
                    <motion.div key={list.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: "spring" }}>
                      <Link href={`/lists/${list.id}/edit`} className="block group relative rounded-2xl overflow-hidden border border-border-light bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-background-soft">
                          {list.coverUrl
                            ? <img src={list.coverUrl} alt={list.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-text-sub/30"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 1-1 0v-3A1.5 1.5 0 0 1 1.5 0h3a.5.5 0 0 1 0 1zM11 .5a.5.5 0 0 1 .5-.5h3A1.5 1.5 0 0 1 16 1.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 1-.5-.5M.5 11a.5.5 0 0 1 .5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 1 0 1h-3A1.5 1.5 0 0 1 0 14.5v-3a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a.5.5 0 0 1 0-1h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 1 .5-.5"/><path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/></svg></div>
                          }
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-bold text-text-main line-clamp-2 mb-1">{list.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-text-sub">{list.reviewCount}件</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${list.status === 'published' ? 'bg-primary/10 text-primary' : 'bg-background-soft text-text-sub'}`}>
                              {list.status === 'published' ? '公開中' : '下書き'}
                            </span>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors pointer-events-none rounded-2xl" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (() => {
              const filtered = reviews.filter((r) => r.status === activeTab);
              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div style={{ width: 48, height: 48, backgroundColor: 'var(--primary)', maskImage: 'url(/icons/cat.png)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskImage: 'url(/icons/cat.png)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', opacity: 0.3 }} className="mb-4" />
                    <p className="text-text-sub text-sm font-bold">
                      {activeTab === "published" && "公開中の口コミはありません"}
                      {activeTab === "private" && "非公開の口コミはありません"}
                      {activeTab === "draft" && "下書きはありません"}
                      {activeTab === "trash" && "ごみ箱は空です"}
                    </p>
                    <Link href="/post" className="mt-4 px-5 py-2 bg-primary text-white text-xs font-bold rounded-full hover:opacity-90 transition-opacity">口コミを書いてみる</Link>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-10">
                  {filtered.map((review, i) => (
                    <motion.div key={review.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: "spring" }} className="relative">
                      {/* ステータスバッジ */}
                      {activeTab === "draft" && (
                        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/50 text-white text-[9px] font-bold rounded-full backdrop-blur-sm">下書き</span>
                      )}
                      {activeTab === "private" && (
                        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-text-sub/60 text-white text-[9px] font-bold rounded-full backdrop-blur-sm">非公開</span>
                      )}
                      {activeTab === "trash" && (() => {
                        const trashedAt = review.updatedAt ? new Date(review.updatedAt) : null;
                        const daysLeft = trashedAt
                          ? 7 - Math.floor((Date.now() - trashedAt.getTime()) / 86400000)
                          : null;
                        return (
                          <div className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center gap-2 z-10 p-2">
                            {daysLeft !== null && (
                              <span className="text-[10px] text-white/80 font-bold">
                                {daysLeft > 0 ? `${daysLeft}日後に完全削除` : '間もなく削除'}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setApiReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: 'published' } : r));
                                setReviewStatuses(prev => ({ ...prev, [review.id]: 'published' }));
                                fetch('/api/user/reviews', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: review.id, status: 'published' }) });
                              }}
                              className="px-3 py-1.5 bg-white text-text-main text-xs font-bold rounded-full hover:opacity-90"
                            >
                              元に戻す
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (confirm('完全に削除しますか？この操作は取り消せません。')) permanentDelete(review.id); }}
                              className="text-[10px] text-white/60 hover:text-red-300 transition-colors"
                            >
                              今すぐ完全削除
                            </button>
                          </div>
                        );
                      })()}
                      <LongPressPreviewCard review={review} />
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ───────── Sub Components ─────────

function SlideToggle({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={isOn ? "公開中（タップで非公開に）" : "非公開（タップで公開に）"}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${isOn ? 'bg-green-300/80' : 'bg-border-light'}`}
    >
      <span className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${isOn ? 'left-[19px]' : 'left-[2px]'}`} />
    </button>
  );
}

function ProfileFieldRow({ label, isPublic, onToggle, children, vertical = false }: {
  label: string;
  isPublic: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  vertical?: boolean;
}) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-main">{label}</span>
          <SlideToggle isOn={isPublic} onToggle={onToggle} />
        </div>
        <div className="w-full">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-text-main w-12 flex-shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
      <SlideToggle isOn={isPublic} onToggle={onToggle} />
    </div>
  );
}

function LongPressPreviewCard({ review }: { review: any }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => { timerRef.current = setTimeout(() => setIsPreviewOpen(true), 400); };
  const clearPress = () => { if (timerRef.current) clearTimeout(timerRef.current); setIsPreviewOpen(false); };

  return (
    <div className="relative" onPointerDown={startPress} onPointerUp={clearPress} onPointerLeave={clearPress} onContextMenu={(e) => e.preventDefault()}>
      <ReviewCard {...review} />
      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }} transition={{ type: "spring", bounce: 0.4 }}
            className="absolute -top-4 -left-4 -right-4 bg-white/95 backdrop-blur shadow-2xl border border-border-light rounded-3xl p-5 z-50 pointer-events-none">
            <div className="flex items-center justify-between mb-3 border-b border-border-light pb-3">
              <span className="text-xs font-bold text-secondary flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                {review.likes}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-background-soft text-text-sub">詳細プレビュー</span>
            </div>
            <p className="text-sm text-text-main leading-relaxed font-medium line-clamp-4">"{review.episode}"</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
