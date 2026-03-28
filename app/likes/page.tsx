"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import ReviewCard from '@/components/ReviewCard';
import { getSaves } from '@/lib/saves';
import type { Review } from '@/lib/types';
import { apiFetch, reviewUrl } from '@/lib/api';

type Tab = 'all' | 'want' | 'gift';

export default function SavesPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [wantReviews, setWantReviews] = useState<Review[]>([]);
  const [giftReviews, setGiftReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saves = getSaves();

    const fetchById = async (id: string): Promise<Review | null> => {
      const res = await apiFetch(reviewUrl(id));
      if (!res.ok) return null;
      return res.json();
    };

    Promise.all([
      Promise.all(saves.want.map(fetchById)),
      Promise.all(saves.gift.map(fetchById)),
    ]).then(([wants, gifts]) => {
      setWantReviews(wants.filter((r): r is Review => r !== null));
      setGiftReviews(gifts.filter((r): r is Review => r !== null));
      setLoading(false);
    });
  }, []);

  const displayReviews =
    tab === 'all'
      ? [...wantReviews, ...giftReviews].filter(
          (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i
        )
      : tab === 'want'
      ? wantReviews
      : giftReviews;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'すべて', count: new Set([...wantReviews.map(r => r.id), ...giftReviews.map(r => r.id)]).size },
    { id: 'want', label: '欲しい！', count: wantReviews.length },
    { id: 'gift', label: '贈りたい！', count: giftReviews.length },
  ];

  return (
    <div className="flex w-full gap-8 py-4">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-6 border-b border-border-light pb-4">
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
              <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
            </svg>
            保存したギフト
          </h1>
          <p className="text-sm text-text-sub mt-2">
            「欲しい！」「贈りたい！」を押した口コミが保存されます。
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-background-soft rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t.id
                  ? 'bg-white text-text-main shadow-sm'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    tab === t.id ? 'bg-primary text-white' : 'bg-border-light text-text-sub'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 animate-pulse">
                <div className="aspect-square w-full rounded-2xl bg-border-light" />
                <div className="h-4 w-3/4 rounded-full bg-border-light" />
                <div className="h-3 w-1/2 rounded-full bg-border-light" />
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && displayReviews.length > 0 && (
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-10"
          >
            <AnimatePresence mode="popLayout">
              {displayReviews.map((review, i) => (
                <motion.div
                  key={`${tab}-${review.id}`}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4, type: 'spring', bounce: 0.3, delay: i * 0.05 }}
                >
                  <ReviewCard {...review} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && displayReviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="text-border-light mb-4" viewBox="0 0 16 16">
              <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
            </svg>
            <p className="text-text-main font-bold">
              {tab === 'all'
                ? 'まだ保存したギフトはありません'
                : tab === 'want'
                ? '「欲しい！」した口コミがありません'
                : '「贈りたい！」した口コミがありません'}
            </p>
            <p className="text-sm text-text-sub mt-1">
              気になった口コミの「欲しい！」「贈りたい！」ボタンを押してみましょう
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
