"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReviewCard from '@/components/ReviewCard';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

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
  author_name: string;
  author_icon: string;
  created_at: string;
  user_id: string;
  status: string;
  list_items: ListItem[];
}

function interpolate(text: string, activeCount: number): string {
  return text.replace(/\{n\}/g, String(activeCount));
}

function SkeletonCard() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center">
      <div className="w-full aspect-[21/9] md:aspect-[21/7] rounded-3xl bg-background-soft border border-border-light animate-pulse mb-12" />
      <div className="w-full grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-background-soft border border-border-light animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function ListsPage() {
  const [lists, setLists] = useState<GiftList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/lists');
        if (res.ok) {
          const data = await res.json();
          setLists(data);
        }
      } finally {
        setLoading(false);
      }
    }

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }

    fetchData();
    checkAuth();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '', body: '', status: 'draft' }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? '作成に失敗しました');
        return;
      }
      const list = await res.json();
      router.push(`/lists/${list.id}/edit`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="w-full space-y-16 py-8">
      {/* Page Header */}
      <div className="max-w-4xl mx-auto text-center space-y-4 relative">
        <h1 className="text-3xl font-bold text-text-main flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="text-secondary" viewBox="0 0 16 16">
            <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783"/>
          </svg>
          まとめ投稿
        </h1>
        <p className="text-text-sub">目的やシーンに応じた、先輩たちのおすすめギフトリスト</p>

        {isLoggedIn && (
          <div className="absolute right-0 top-0">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-accent-strong text-white px-4 py-2 rounded-full text-sm font-bold disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              {creating ? '作成中...' : 'まとめ投稿を作成'}
            </button>
          </div>
        )}
      </div>

      {/* Lists Collection */}
      <div className="space-y-20">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : lists.length === 0 ? (
          <div className="text-center py-24 text-text-sub text-lg">
            まだまとめ投稿がありません
          </div>
        ) : (
          lists.map((list, listIndex) => {
            const activeItems = list.list_items.filter((item) => item.review_id !== null);
            const activeCount = activeItems.length;
            const displayTitle = interpolate(list.title, activeCount);
            const displayBody = interpolate(list.body, activeCount);
            const previewItems = activeItems.slice(0, 3);

            return (
              <motion.section
                key={list.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: listIndex * 0.2, duration: 0.6, type: 'spring', bounce: 0.2 }}
                className="max-w-7xl mx-auto flex flex-col items-center"
              >
                {/* Magazine Style Header */}
                <Link
                  href={`/lists/${list.id}`}
                  className="group relative w-full aspect-[21/9] md:aspect-[21/7] rounded-3xl overflow-hidden mb-12 flex items-center justify-center"
                >
                  {previewItems[0]?.snapshot_image_url ? (
                    <img
                      src={previewItems[0].snapshot_image_url}
                      alt={displayTitle}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-secondary/60" />
                  )}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />

                  <div className="relative z-10 text-center px-4 max-w-4xl">
                    <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold mb-6 border border-white/30 uppercase tracking-widest">
                      Curated List
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight drop-shadow-lg font-serif">
                      {displayTitle || '(タイトルなし)'}
                    </h2>
                    <div className="flex items-center justify-center gap-4 text-white/90 text-sm">
                      <span className="flex items-center gap-1.5">
                        {list.author_icon && (
                          <img
                            src={list.author_icon}
                            className="w-[18px] h-[18px] object-contain mix-blend-screen"
                            alt="Author Icon"
                          />
                        )}
                        {list.author_name}
                      </span>
                      <span>•</span>
                      <span>{activeCount}選</span>
                    </div>
                  </div>
                </Link>

                {/* List Items Content Grid */}
                <motion.div
                  variants={{
                    hidden: {},
                    show: {
                      transition: { staggerChildren: 0.1, delayChildren: 0.3 + listIndex * 0.2 },
                    },
                  }}
                  initial="hidden"
                  animate="show"
                  className="w-full grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, scale: 0.8, y: 20 },
                      show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } },
                    }}
                    className="col-span-2 md:col-span-1 border border-border-light bg-background-soft rounded-2xl p-8 flex flex-col justify-center text-center"
                  >
                    <span className="text-secondary text-5xl font-serif mb-4 block">&ldquo;</span>
                    <p className="text-text-main leading-relaxed font-medium mb-6">
                      {displayBody || '詳細はリストをご覧ください。'}
                    </p>
                    <Link
                      href={`/lists/${list.id}`}
                      className="text-primary font-bold hover:underline flex items-center justify-center gap-1"
                    >
                      リストをすべて見る
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                      </svg>
                    </Link>
                  </motion.div>

                  {previewItems.map((item) => (
                    <motion.div
                      key={item.id}
                      variants={{
                        hidden: { opacity: 0, scale: 0.8, y: 20 },
                        show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } },
                      }}
                    >
                      <ReviewCard
                        id={item.review_id ?? undefined}
                        imageUrl={item.snapshot_image_url}
                        title={item.snapshot_title}
                        productName={item.snapshot_product_name}
                        authorName={item.snapshot_author_name}
                      />
                    </motion.div>
                  ))}

                  {previewItems.length < 3 && (
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, scale: 0.8, y: 20 },
                        show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } },
                      }}
                      className="hidden xl:flex border-2 border-dashed border-border-light rounded-2xl items-center justify-center text-text-sub font-medium hover:bg-white hover:border-primary/50 transition-colors cursor-pointer group"
                    >
                      <Link href={`/lists/${list.id}`} className="flex flex-col items-center gap-2 group-hover:text-primary transition-colors p-8 w-full h-full justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
                        </svg>
                        <span>もっと見る</span>
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              </motion.section>
            );
          })
        )}
      </div>
    </div>
  );
}
