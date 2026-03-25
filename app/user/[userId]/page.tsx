"use client";

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ReviewCard from '@/components/ReviewCard';
import type { Review } from '@/lib/types';

interface UserProfile {
  id: string;
  displayName: string | null;
  iconUrl: string;
  reviewCount: number;
  wantTotal: number;
  giftTotal: number;
}

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/user/${userId}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/reviews?userId=${userId}`).then((r) => r.ok ? r.json() : []),
    ]).then(([prof, revs]) => {
      setProfile(prof);
      setReviews(Array.isArray(revs) ? revs : []);
    }).finally(() => setLoading(false));
  }, [userId]);

  if (!loading && !profile) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-text-main font-bold">ユーザーが見つかりませんでした</p>
        <Link href="/" className="mt-4 inline-block px-5 py-2 bg-primary text-white rounded-full text-sm font-bold">トップへ戻る</Link>
      </div>
    );
  }

  const displayName = profile?.displayName ?? 'ゲスト';

  return (
    <div className="max-w-4xl mx-auto w-full py-6">

      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-border-light shadow-sm overflow-hidden mb-8">
        <div className="h-24 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent-strong/10" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-white p-1 border border-border-light shadow-sm flex-shrink-0">
              <div className="w-full h-full rounded-full bg-background-soft overflow-hidden p-2">
                {loading ? (
                  <div className="w-full h-full bg-border-light rounded-full animate-pulse" />
                ) : (
                  <img src={profile?.iconUrl ?? '/icons/cat.png'} alt={displayName} className="w-full h-full object-contain" />
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-6 w-32 bg-border-light rounded-full" />
              <div className="flex gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 w-20 bg-border-light rounded-xl" />)}
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-text-main mb-3">{displayName}</h1>
              <div className="flex flex-wrap gap-3">
                <div className="bg-background-soft border border-border-light rounded-2xl px-4 py-2.5 text-center min-w-[72px]">
                  <p className="text-xl font-black text-text-main">{profile?.reviewCount ?? 0}</p>
                  <p className="text-[10px] font-bold text-text-sub mt-0.5">投稿数</p>
                </div>
                <div className="bg-background-soft border border-border-light rounded-2xl px-4 py-2.5 text-center min-w-[72px]">
                  <p className="text-xl font-black text-secondary">{profile?.wantTotal ?? 0}</p>
                  <p className="text-[10px] font-bold text-text-sub mt-0.5">欲しい！</p>
                </div>
                <div className="bg-background-soft border border-border-light rounded-2xl px-4 py-2.5 text-center min-w-[72px]">
                  <p className="text-xl font-black text-accent-strong">{profile?.giftTotal ?? 0}</p>
                  <p className="text-[10px] font-bold text-text-sub mt-0.5">贈りたい！</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reviews */}
      <h2 className="text-sm font-bold text-text-main mb-4">
        {displayName}の口コミ
        {reviews.length > 0 && <span className="text-text-sub font-normal ml-2">({reviews.length}件)</span>}
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-border-light rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-text-sub text-sm">まだ投稿がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} {...review} />
          ))}
        </div>
      )}
    </div>
  );
}
