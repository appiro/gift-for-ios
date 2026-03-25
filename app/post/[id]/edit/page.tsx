"use client";

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WHO_OPTIONS, SCENE_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import type { Review } from '@/lib/types';

export default function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceUnknown, setPriceUnknown] = useState(false);

  // 画像: 現在のURL（既存）と新しいファイル（差し替え）を管理
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null]);
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null]);
  const [originalUrls, setOriginalUrls] = useState<(string | null)[]>([null, null]);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

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

      // 既存画像をセット
      const imgs = review.images?.length ? review.images : review.imageUrl ? [review.imageUrl] : [];
      const previews: (string | null)[] = [imgs[0] ?? null, imgs[1] ?? null];
      const originals: (string | null)[] = [imgs[0] ?? null, imgs[1] ?? null];
      setImagePreviews(previews);
      setOriginalUrls(originals);

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    const compressed = await compressImage(file);
    setImageFiles(prev => { const n = [...prev]; n[index] = compressed; return n; });
    setImagePreviews(prev => { const n = [...prev]; n[index] = URL.createObjectURL(compressed); return n; });
    setCompressing(false);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => { const n = [...prev]; n[index] = null; return n; });
    setImagePreviews(prev => { const n = [...prev]; n[index] = null; return n; });
    setOriginalUrls(prev => { const n = [...prev]; n[index] = null; return n; });
  };

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
    if (!imagePreviews[0]) { setError('1枚目の写真は必須です'); return; }

    setSubmitting(true);
    setError(null);

    // 新しいファイルをアップロード、既存URLはそのまま使用
    const finalUrls: string[] = [];
    for (let i = 0; i < 2; i++) {
      if (imageFiles[i]) {
        // 新しいファイルをアップロード
        const file = imageFiles[i]!;
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(fileName, file, { upsert: false });
        if (uploadError) { setError(`画像のアップロードに失敗しました: ${uploadError.message}`); setSubmitting(false); return; }
        const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(uploadData.path);
        finalUrls.push(publicUrl);
      } else if (originalUrls[i]) {
        // 既存URLをそのまま使用
        finalUrls.push(originalUrls[i]!);
      }
    }

    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: formData.productName,
        price: priceUnknown ? '不明' : `〜${Number(formData.priceCategory).toLocaleString()}円`,
        productUrl: formData.productUrl || null,
        relationship: formData.relationship,
        scene: formData.scene,
        category: formData.category,
        episode: formData.episode,
        imageUrl: finalUrls[0] ?? '',
        images: finalUrls,
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

  const isValid = !!(formData.productName && formData.episode && (priceUnknown || formData.priceCategory) && imagePreviews[0]);

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
          {/* 写真 */}
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">
              写真 <span className="text-accent-strong text-xs">*</span>
              <span className="text-xs font-normal text-text-sub ml-2">（最大2枚・1枚目必須）</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((index) => (
                <div key={index}>
                  <div
                    onClick={() => fileInputRefs[index].current?.click()}
                    className="aspect-square bg-background-soft border-2 border-dashed border-border-light rounded-2xl flex flex-col items-center justify-center text-text-sub hover:bg-white hover:border-primary cursor-pointer transition-colors group overflow-hidden relative"
                  >
                    {compressing && !imagePreviews[index] ? (
                      <svg className="animate-spin w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : imagePreviews[index] ? (
                      <>
                        <img src={imagePreviews[index]!} alt="preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold">タップして変更</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="text-border-light group-hover:text-primary transition-colors" viewBox="0 0 16 16">
                          <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
                          <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0"/>
                        </svg>
                        <span className="text-xs text-text-sub">{index === 0 ? '必須' : '任意'}</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRefs[index]} type="file" accept="image/*"
                    onChange={(e) => handleImageChange(e, index)} className="hidden" />
                  {imagePreviews[index] && (
                    <button onClick={() => removeImage(index)}
                      className="mt-1 w-full text-xs text-text-sub hover:text-red-500 transition-colors text-center">
                      削除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

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
              <input type="checkbox" checked={priceUnknown}
                onChange={(e) => { setPriceUnknown(e.target.checked); if (e.target.checked) updateData('priceCategory', ''); }}
                className="rounded" />
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
              disabled={!isValid || submitting || compressing}
              className={`px-8 py-3 rounded-full font-bold shadow-sm transition-all text-sm ${
                isValid && !submitting && !compressing
                  ? 'bg-primary text-white hover:opacity-90'
                  : 'bg-border-light text-text-sub cursor-not-allowed opacity-70'
              }`}
            >
              {submitting ? '保存中...' : compressing ? '画像処理中...' : '変更を保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
