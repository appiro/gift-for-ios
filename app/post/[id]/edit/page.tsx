"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WHO_OPTIONS, SCENE_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { Review } from '@/lib/types';

export default function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceUnknown, setPriceUnknown] = useState(false);

  const [formData, setFormData] = useState({
    productName: '',
    priceCategory: '',
    productUrl: '',
    relationship: [] as string[],
    scene: [] as string[],
    category: [] as string[],
    episode: '',
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const res = await fetch(`/api/reviews/${id}`);
      if (!res.ok) { router.push('/'); return; }
      const review: Review = await res.json();

      if (review.authorId !== user.id) { router.push(`/post/${id}`); return; }

      // Parse price
      const rawPrice = review.price ?? '';
      let priceNum = '';
      if (rawPrice === '不明') {
        setPriceUnknown(true);
      } else {
        const m = rawPrice.match(/[\d,]+/);
        if (m) priceNum = m[0].replace(/,/g, '');
      }

      setFormData({
        productName: review.productName ?? '',
        priceCategory: priceNum,
        productUrl: review.productUrl ?? '',
        relationship: review.relationship ?? [],
        scene: review.scene ?? [],
        category: review.category ?? [],
        episode: review.episode ?? '',
      });
      setLoading(false);
    };
    init();
  }, [id]);

  const updateData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'relationship' | 'scene' | 'category', value: string) => {
    setFormData(prev => {
      const arr = prev[key];
      if (arr.includes(value)) return { ...prev, [key]: arr.filter(i => i !== value) };
      if (arr.length >= 3) return prev;
      return { ...prev, [key]: [...arr, value] };
    });
  };

  const handleSubmit = async () => {
    if (!formData.productName || !formData.episode) return;
    if (!priceUnknown && !formData.priceCategory) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: formData.productName,
        priceCategory: priceUnknown ? null : formData.priceCategory,
        price: priceUnknown ? '不明' : `〜${Number(formData.priceCategory).toLocaleString()}円`,
        productUrl: formData.productUrl || null,
        relationship: formData.relationship,
        scene: formData.scene,
        category: formData.category,
        episode: formData.episode,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      router.push(`/post/${id}`);
    } else {
      const json = await res.json();
      setError(json.error ?? '更新に失敗しました');
    }
  };

  const isValid = !!(formData.productName && formData.episode && (priceUnknown || formData.priceCategory));

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto w-full py-20 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-background-card border border-border-light rounded-2xl shadow-sm p-4 sm:p-8 mt-2 sm:mt-4">
        <div className="flex items-center gap-3 mb-8">
          <Link href={`/post/${id}`} className="text-text-sub hover:text-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-text-main">口コミを編集</h1>
        </div>

        <div className="space-y-6">
          {/* 商品名 */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">商品名 <span className="text-accent-strong text-xs">*</span></label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => updateData('productName', e.target.value)}
              className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>

          {/* 予算 */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">予算（約） <span className="text-accent-strong text-xs">*</span></label>
            {!priceUnknown && (
              <div className="relative max-w-[200px]">
                <input
                  type="number"
                  step="100"
                  placeholder="5000"
                  value={formData.priceCategory}
                  onChange={(e) => updateData('priceCategory', e.target.value)}
                  className="w-full bg-background-soft border border-border-light rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-main font-bold text-sm">円</span>
              </div>
            )}
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={priceUnknown}
                onChange={(e) => {
                  setPriceUnknown(e.target.checked);
                  if (e.target.checked) updateData('priceCategory', '');
                }}
                className="rounded"
              />
              <span className="text-xs text-text-sub">値段がわからない</span>
            </label>
          </div>

          {/* ネットショップURL */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">ネットショップURL <span className="text-xs font-normal text-text-sub ml-1">（任意）</span></label>
            <input
              type="url"
              placeholder="https://..."
              value={formData.productUrl}
              onChange={(e) => updateData('productUrl', e.target.value)}
              className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>

          {/* 関係性 */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">
              具体的な関係性 <span className="text-xs font-normal text-text-sub ml-2">（最大3つまで）</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {WHO_OPTIONS.map(rel => {
                const isSelected = formData.relationship.includes(rel);
                const isDisabled = !isSelected && formData.relationship.length >= 3;
                return (
                  <button key={rel} onClick={() => toggleArrayItem('relationship', rel)} disabled={isDisabled}
                    className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                      isSelected ? 'border-accent-strong bg-accent-strong text-white' : 'border-border-light text-text-main bg-white hover:border-accent-strong/50'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    {rel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* シーン */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">
              シーン <span className="text-xs font-normal text-text-sub ml-2">（最大3つまで）</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SCENE_OPTIONS.map(s => {
                const isSelected = formData.scene.includes(s);
                const isDisabled = !isSelected && formData.scene.length >= 3;
                return (
                  <button key={s} onClick={() => toggleArrayItem('scene', s)} disabled={isDisabled}
                    className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                      isSelected ? 'border-accent-strong bg-accent-strong text-white' : 'border-border-light text-text-main bg-white hover:border-accent-strong/50'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">
              カテゴリ <span className="text-xs font-normal text-text-sub ml-2">（最大3つまで）</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(cat => {
                const isSelected = formData.category.includes(cat);
                const isDisabled = !isSelected && formData.category.length >= 3;
                return (
                  <button key={cat} onClick={() => toggleArrayItem('category', cat)} disabled={isDisabled}
                    className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                      isSelected ? 'border-accent-strong bg-accent-strong text-white' : 'border-border-light text-text-main bg-white hover:border-accent-strong/50'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* エピソード */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">このギフトを選んだ理由・喜ばれたポイント <span className="text-accent-strong text-xs">*</span></label>
            <textarea
              rows={5}
              value={formData.episode}
              onChange={(e) => updateData('episode', e.target.value)}
              className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-border-light">
            <Link href={`/post/${id}`} className="px-6 py-3 rounded-full border border-border-light text-text-sub font-bold hover:bg-background-soft transition-colors text-sm">
              キャンセル
            </Link>
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className={`px-8 py-3 rounded-full font-bold shadow-sm transition-all text-sm ${
                isValid && !submitting
                  ? 'bg-primary text-white hover:opacity-90'
                  : 'bg-border-light text-text-sub cursor-not-allowed opacity-70'
              }`}
            >
              {submitting ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
