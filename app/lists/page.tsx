"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { apiFetch, listsUrl } from '@/lib/api';

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
    <div className="bg-white border border-border-light rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[3/2] bg-background-soft" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-background-soft rounded-lg w-3/4" />
        <div className="h-3 bg-background-soft rounded-lg w-full" />
        <div className="h-3 bg-background-soft rounded-lg w-2/3" />
        <div className="flex gap-2 mt-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-1 aspect-square rounded-xl bg-background-soft" />
          ))}
        </div>
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
        const res = await apiFetch(listsUrl());
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
      const res = await apiFetch(listsUrl(), {
        method: 'POST',
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
    <div className="w-full max-w-5xl mx-auto py-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-main flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="text-secondary" viewBox="0 0 16 16">
              <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783"/>
            </svg>
            まとめ投稿
          </h1>
          <p className="text-xs text-text-sub mt-0.5">シーンや目的別のおすすめギフトリスト</p>
        </div>
        {isLoggedIn && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 bg-accent-strong text-white px-4 py-2.5 rounded-full text-sm font-bold disabled:opacity-60 hover:opacity-90 transition-opacity shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
            </svg>
            {creating ? '作成中...' : '作成する'}
          </button>
        )}
      </div>

      {/* Lists Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-24 text-text-sub">
          <p className="text-lg font-medium">まだまとめ投稿がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {lists.map((list, listIndex) => {
            const activeItems = list.list_items.filter((item) => item.review_id !== null);
            const activeCount = activeItems.length;
            const displayTitle = interpolate(list.title, activeCount);
            const displayBody = interpolate(list.body, activeCount);
            const coverItem = activeItems[0];
            const previewItems = activeItems.slice(1, 4);

            return (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: listIndex * 0.07, duration: 0.4 }}
              >
                <Link
                  href={`/lists/${list.id}`}
                  className="group block bg-white border border-border-light rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
                >
                  {/* Cover image */}
                  <div className="relative aspect-[3/2] bg-background-soft overflow-hidden">
                    {coverItem?.snapshot_image_url ? (
                      <img
                        src={coverItem.snapshot_image_url}
                        alt={displayTitle}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                    {/* Item count badge */}
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-text-main text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                        {activeCount}選
                      </span>
                    </div>

                    {/* Title on image */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h2 className="text-white font-bold text-base leading-snug drop-shadow line-clamp-2">
                        {displayTitle || '(タイトルなし)'}
                      </h2>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    {/* Description */}
                    {displayBody && (
                      <p className="text-text-sub text-xs leading-relaxed line-clamp-2">
                        {displayBody}
                      </p>
                    )}

                    {/* Preview thumbnails */}
                    {previewItems.length > 0 && (
                      <div className="flex gap-1.5">
                        {previewItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex-1 aspect-square rounded-lg overflow-hidden bg-background-soft border border-border-light"
                          >
                            {item.snapshot_image_url ? (
                              <img
                                src={item.snapshot_image_url}
                                alt={item.snapshot_title}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-border-light" />
                            )}
                          </div>
                        ))}
                        {previewItems.length < 3 && [...Array(3 - previewItems.length)].map((_, i) => (
                          <div key={i} className="flex-1 aspect-square rounded-lg bg-background-soft border border-dashed border-border-light" />
                        ))}
                      </div>
                    )}

                    {/* Author */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border-light">
                      {list.author_icon && (
                        <img
                          src={list.author_icon}
                          alt={list.author_name}
                          loading="lazy"
                          decoding="async"
                          className="w-5 h-5 rounded-full object-cover bg-background-soft"
                        />
                      )}
                      <span className="text-xs text-text-sub font-medium flex-1 truncate">{list.author_name}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="text-text-sub group-hover:text-primary transition-colors flex-shrink-0" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
