"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import ReviewCard from "@/components/ReviewCard";
import MobileFilterSheet from "@/components/MobileFilterSheet";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "@/components/SearchProvider";
import type { Review } from "@/lib/types";

/** "予算: 〜3,000円" の予算ラベル → DB の price フィールド値へのマッピング */
const PRICE_MAP: Record<string, string> = {
  '〜3,000円': '〜3,000円',
  '3,000円〜5,000円': '〜5,000円',
  '5,000円〜10,000円': '〜10,000円',
  '10,000円〜': '10,000円〜',
};

interface ParsedFilter {
  key: string;
  value: string;
}

function parseFilter(filter: string): ParsedFilter | null {
  const prefixMap: Record<string, string> = {
    'シーン: ': 'scene',
    '関係: ': 'relationship',
    'カテゴリ: ': 'category',
    '予算: ': 'price',
    '性別: ': 'gender',
    '年齢: ': 'age',
  };
  for (const [prefix, key] of Object.entries(prefixMap)) {
    if (filter.startsWith(prefix)) {
      return { key, value: filter.slice(prefix.length) };
    }
  }
  return null;
}

function applyFilters(reviews: Review[], activeFilters: string[]): Review[] {
  if (activeFilters.length === 0) return reviews;

  // グループ化: key -> value[] (同じキー内は OR, キー間は AND)
  const groups = new Map<string, string[]>();
  for (const filter of activeFilters) {
    const parsed = parseFilter(filter);
    if (!parsed) continue;
    if (!groups.has(parsed.key)) groups.set(parsed.key, []);
    groups.get(parsed.key)!.push(parsed.value);
  }

  return reviews.filter((review) => {
    for (const [key, values] of groups) {
      const matches = values.some((value) => {
        switch (key) {
          case 'scene':
            return review.scene.includes(value);
          case 'relationship':
            return review.relationship.includes(value);
          case 'category':
            return review.category.includes(value);
          case 'gender':
            return value === '指定なし' || review.gender === value;
          case 'age':
            return review.ageGroup === value;
          case 'price': {
            const dbPrice = PRICE_MAP[value] ?? value;
            return review.price === dbPrice;
          }
          default:
            return true;
        }
      });
      if (!matches) return false;
    }
    return true;
  });
}

export default function Home() {
  const { activeFilters, removeFilter, clearFilters, searchQuery } = useSearch();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // 全件取得は初回のみ（フィルタリングはクライアント側で完結）
  useEffect(() => {
    fetch('/api/reviews')
      .then((res) => res.json())
      .then((data: Review[]) => setReviews(data))
      .finally(() => setLoading(false));
  }, []);

  const displayReviews = useMemo(() => {
    let result = applyFilters(reviews, activeFilters);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) =>
        (r.title ?? '').toLowerCase().includes(q) ||
        (r.productName ?? '').toLowerCase().includes(q) ||
        (r.episode ?? '').toLowerCase().includes(q) ||
        (r.authorName ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [reviews, activeFilters, searchQuery]);

  return (
    <div className="flex w-full gap-8">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Active Filters (Chips) */}
        <div className="flex items-center flex-wrap gap-2 mb-8 min-h-[32px]">
          {activeFilters.length > 0 && (
            <span className="text-xs font-bold text-text-sub mr-2">
              適用中の条件:
            </span>
          )}
          <AnimatePresence>
            {activeFilters.map((filter) => (
              <motion.div
                key={filter}
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  filter: "blur(4px)",
                  transition: { duration: 0.2 },
                }}
                layout
                className="flex items-center gap-2 bg-[#ffb3c1]/20 text-[#d00000] border border-[#ffb3c1] px-3 py-1.5 rounded-full text-sm font-medium shadow-sm cursor-pointer hover:bg-[#ffb3c1]/40 transition-colors group"
                onClick={() => removeFilter(filter)}
              >
                {filter}
                <div className="p-0.5 rounded-full bg-[#ffb3c1]/50 group-hover:bg-[#ffb3c1] text-[#d00000] transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="2" y1="14" x2="14" y2="2" />
                    <line x1="2" y1="2" x2="14" y2="14" />
                  </svg>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {activeFilters.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                layout
                onClick={clearFilters}
                className="text-xs font-bold text-text-sub hover:text-text-main underline ml-2 py-1 px-2 rounded-md hover:bg-background-soft transition-colors"
              >
                すべてリセット
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 animate-pulse">
                <div className="aspect-square w-full rounded-2xl bg-border-light" />
                <div className="h-4 w-3/4 rounded-full bg-border-light" />
                <div className="h-3 w-1/2 rounded-full bg-border-light" />
              </div>
            ))}
          </div>
        )}

        {/* Tile Grid */}
        {!loading && (
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-10"
          >
            <AnimatePresence mode="popLayout">
              {displayReviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    y: 10,
                    transition: { duration: 0.2 },
                  }}
                  transition={{
                    duration: 0.4,
                    type: "spring",
                    bounce: 0.3,
                    delay: i * 0.05,
                  }}
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
            <p className="text-text-main font-bold text-lg">
              条件に合う投稿が見つかりませんでした
            </p>
            <p className="text-sm text-text-sub mt-2">
              絞り込み条件を変更してみてください
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 px-5 py-2 bg-primary text-white rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
            >
              条件をリセット
            </button>
          </div>
        )}

        {/* Mobile Floating Filter Button - above mobile nav */}
        <div className="lg:hidden fixed bottom-20 right-4 z-40">
          <button
            onClick={() => setFilterSheetOpen(true)}
            className="bg-primary text-white w-14 h-14 rounded-full font-bold shadow-xl flex items-center justify-center active:scale-95 transition-transform relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2z" />
            </svg>
            {activeFilters.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-strong text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        <MobileFilterSheet open={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} />
      </div>
    </div>
  );
}
