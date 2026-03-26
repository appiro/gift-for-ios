"use client";

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WHO_OPTIONS, SCENE_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import PhotoEditor from '@/components/PhotoEditor';
import type { Review } from '@/lib/types';
import type { RakutenItem } from '@/app/api/rakuten/search/route';

export default function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [editingFile, setEditingFile] = useState<{ file: File; index: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priceUnknown, setPriceUnknown] = useState(false);

  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null]);
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null]);
  const [originalUrls, setOriginalUrls] = useState<(string | null)[]>([null, null]);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const [formData, setFormData] = useState({
    brandName: '',
    productName: '',
    gender: '',
    ageGroup: '',
    priceCategory: '',
    productUrl: '',
    rakutenUrl: '',
    rakutenImageUrl: '',
    rakutenItemName: '',
    rakutenItemPrice: 0,
    relationship: [] as string[],
    scene: [] as string[],
    category: [] as string[],
    episode: '',
  });

  // Rakuten
  const [rakutenItems, setRakutenItems] = useState<RakutenItem[]>([]);
  const [rakutenLoading, setRakutenLoading] = useState(false);
  const [rakutenSearched, setRakutenSearched] = useState(false);
  const [showCustomUrl, setShowCustomUrl] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const res = await fetch(`/api/reviews/${id}`);
      if (!res.ok) { router.push('/'); return; }
      const review: Review = await res.json();
      if (review.authorId !== user.id) { router.push(`/post/${id}`); return; }

      const imgs = review.images?.length ? review.images : review.imageUrl ? [review.imageUrl] : [];
      setImagePreviews([imgs[0] ?? null, imgs[1] ?? null]);
      setOriginalUrls([imgs[0] ?? null, imgs[1] ?? null]);

      const rawPrice = review.price ?? '';
      let priceNum = '';
      if (rawPrice === '不明') {
        setPriceUnknown(true);
      } else {
        const m = rawPrice.match(/[\d,]+/);
        if (m) priceNum = m[0].replace(/,/g, '');
      }

      if (review.productUrl) setShowCustomUrl(true);

      setFormData({
        brandName: review.brandName ?? '',
        productName: review.productName ?? '',
        gender: review.gender ?? '',
        ageGroup: review.ageGroup ?? '',
        priceCategory: priceNum,
        productUrl: review.productUrl ?? '',
        rakutenUrl: review.rakutenUrl ?? '',
        rakutenImageUrl: review.rakutenImageUrl ?? '',
        rakutenItemName: review.rakutenItemName ?? '',
        rakutenItemPrice: review.rakutenItemPrice ?? 0,
        relationship: review.relationship ?? [],
        scene: review.scene ?? [],
        category: review.category ?? [],
        episode: review.episode ?? '',
      });
      setLoading(false);
    };
    init();
  }, [id]);

  const updateData = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const toggleArrayItem = (key: 'relationship' | 'scene' | 'category', value: string) => {
    setFormData(prev => {
      const arr = prev[key];
      if (arr.includes(value)) return { ...prev, [key]: arr.filter(i => i !== value) };
      if (arr.length >= 3) return prev;
      return { ...prev, [key]: [...arr, value] };
    });
  };

  const handleNext1 = () => {
    setStep(2);
    setRakutenLoading(true);
    setRakutenItems([]);
    setRakutenSearched(false);
    const keyword = [formData.brandName, formData.productName].filter(Boolean).join(' ').trim();
    fetch(`/api/rakuten/search?q=${encodeURIComponent(keyword)}`)
      .then(res => res.ok ? res.json() : [])
      .then((items: RakutenItem[]) => setRakutenItems(items))
      .catch(() => setRakutenItems([]))
      .finally(() => { setRakutenLoading(false); setRakutenSearched(true); });
  };

  const handleNext2 = () => setStep(3);
  const handleBack = () => setStep(prev => prev - 1);

  const selectRakutenItem = (item: RakutenItem) => {
    setFormData(prev => ({
      ...prev,
      rakutenUrl: item.affiliateUrl,
      rakutenImageUrl: item.mediumImageUrl,
      rakutenItemName: item.itemName,
      rakutenItemPrice: item.itemPrice,
      productUrl: '',
    }));
    setShowCustomUrl(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditingFile({ file, index });
    e.target.value = '';
  };

  const handleEditorConfirm = async (edited: File) => {
    if (!editingFile) return;
    const index = editingFile.index;
    setEditingFile(null);
    setCompressing(true);
    const compressed = await compressImage(edited);
    setImageFiles(prev => { const n = [...prev]; n[index] = compressed; return n; });
    setImagePreviews(prev => { const n = [...prev]; n[index] = URL.createObjectURL(compressed); return n; });
    setOriginalUrls(prev => { const n = [...prev]; n[index] = null; return n; });
    setCompressing(false);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => { const n = [...prev]; n[index] = null; return n; });
    setImagePreviews(prev => { const n = [...prev]; n[index] = null; return n; });
    setOriginalUrls(prev => { const n = [...prev]; n[index] = null; return n; });
  };

  const handleSubmit = async () => {
    if (!formData.productName || !formData.episode) return;
    if (!priceUnknown && !formData.priceCategory) return;
    if (!imagePreviews[0]) { setError('1枚目の写真は必須です'); return; }

    setSubmitting(true);
    setError(null);

    const finalUrls: string[] = [];
    for (let i = 0; i < 2; i++) {
      if (imageFiles[i]) {
        const file = imageFiles[i]!;
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('review-images').upload(fileName, file, { upsert: false });
        if (uploadError) { setError(`画像のアップロードに失敗しました: ${uploadError.message}`); setSubmitting(false); return; }
        const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(uploadData.path);
        finalUrls.push(publicUrl);
      } else if (originalUrls[i]) {
        finalUrls.push(originalUrls[i]!);
      }
    }

    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.brandName
          ? `${formData.brandName}　${formData.productName}`
          : formData.productName,
        brandName: formData.brandName || null,
        productName: formData.productName,
        price: priceUnknown ? '不明' : `〜${Number(formData.priceCategory).toLocaleString()}円`,
        productUrl: formData.productUrl || null,
        rakutenUrl: formData.rakutenUrl || null,
        rakutenImageUrl: formData.rakutenImageUrl || null,
        rakutenItemName: formData.rakutenItemName || null,
        rakutenItemPrice: formData.rakutenItemPrice || null,
        gender: formData.gender,
        ageGroup: formData.ageGroup,
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

  const isStep1Valid = !!formData.productName.trim();
  const isStep3Valid = !!(formData.productName && formData.episode && (priceUnknown || formData.priceCategory) && imagePreviews[0]);

  const Spinner = ({ size = 4, color = 'text-white' }: { size?: number; color?: string }) => (
    <svg className={`animate-spin w-${size} h-${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto w-full py-20 flex items-center justify-center">
        <Spinner size={8} color="text-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-background-card border border-border-light rounded-2xl shadow-sm p-4 sm:p-8 mt-2 sm:mt-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Link href={`/post/${id}`} className="text-text-sub hover:text-primary transition-colors mr-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
              </svg>
            </Link>
            口コミを編集
          </h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s, i) => (
              <>
                {i > 0 && <div key={`line-${s}`} className={`w-8 h-1 rounded-full ${step > i ? 'bg-primary' : 'bg-border-light'}`} />}
                <div key={s} className={`w-3 h-3 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-border-light'}`} />
              </>
            ))}
          </div>
        </div>

        {/* ── STEP 1: 商品名 ── */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-5">
              <p className="text-sm font-bold text-text-main">どんなギフトでしたか？</p>

              <div>
                <label className="block text-sm font-bold text-text-main mb-2">
                  ブランド名 <span className="text-xs font-normal text-text-sub ml-1">（任意）</span>
                </label>
                <input
                  type="text"
                  placeholder="例）Jo Malone、無印良品"
                  value={formData.brandName}
                  onChange={(e) => updateData('brandName', e.target.value)}
                  className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-text-main mb-2">
                  商品名 <span className="text-accent-strong text-xs">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例）ボディクリーム 154ml"
                  value={formData.productName}
                  onChange={(e) => updateData('productName', e.target.value)}
                  className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-border-light flex justify-end">
              <button onClick={handleNext1} disabled={!isStep1Valid}
                className={`px-8 py-3 rounded-full font-bold shadow-sm transition-all flex items-center gap-2 ${
                  isStep1Valid ? 'bg-primary text-white hover:bg-primary-hover hover:scale-105' : 'bg-border-light text-text-sub cursor-not-allowed opacity-70'
                }`}>
                次へ進む
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: 楽天商品選択 ── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="text-sm text-text-sub hover:text-primary flex items-center gap-1 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                </svg>
                戻る
              </button>
              <div className="flex items-center gap-2 text-xs bg-background-soft px-3 py-1.5 rounded-full border border-border-light text-text-sub">
                {formData.brandName && <span className="font-bold text-text-main">{formData.brandName}</span>}
                {formData.brandName && <span className="text-border-light">·</span>}
                <span className="font-bold text-text-main">{formData.productName}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-text-main mb-1">楽天で商品を選択</p>
              <p className="text-xs text-text-sub mb-4">該当する商品があれば選んでください。なければスキップできます。</p>

              {formData.rakutenUrl && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ef4444" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05"/></svg>
                  <span className="text-sm font-bold text-red-700 flex-1">楽天商品を選択済み</span>
                  <button onClick={() => setFormData(prev => ({ ...prev, rakutenUrl: '' }))} className="text-xs text-red-400 hover:text-red-600 font-bold">解除</button>
                </div>
              )}

              {rakutenLoading && (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-border-light rounded-xl animate-pulse">
                      <div className="w-14 h-14 bg-border-light rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-border-light rounded-full w-3/4" />
                        <div className="h-2.5 bg-border-light rounded-full w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!rakutenLoading && rakutenSearched && (
                <>
                  {rakutenItems.length === 0 ? (
                    <div className="text-center py-6 text-text-sub text-sm border border-dashed border-border-light rounded-xl">
                      楽天に該当商品が見つかりませんでした
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {rakutenItems.map((item, i) => (
                        <button key={i} onClick={() => selectRakutenItem(item)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            formData.rakutenUrl === item.affiliateUrl
                              ? 'border-red-400 bg-red-50'
                              : 'border-border-light hover:border-red-300 hover:bg-background-soft'
                          }`}>
                          {item.mediumImageUrl && (
                            <img src={item.mediumImageUrl} alt={item.itemName} className="w-14 h-14 object-contain rounded-lg bg-background-soft flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-text-main line-clamp-2 leading-relaxed">{item.itemName}</p>
                            <p className="text-xs text-text-sub mt-1">¥{item.itemPrice.toLocaleString()} · {item.shopName}</p>
                          </div>
                          {formData.rakutenUrl === item.affiliateUrl && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ef4444" viewBox="0 0 16 16" className="flex-shrink-0"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05"/></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-border-light pt-4">
              <button onClick={() => setShowCustomUrl(v => !v)}
                className="flex items-center gap-2 text-xs font-bold text-text-sub hover:text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"
                  className={`transition-transform ${showCustomUrl ? 'rotate-180' : ''}`}>
                  <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                </svg>
                楽天以外のショップURLを入力する
              </button>
              {showCustomUrl && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-text-sub">入力したURLは「商品詳細を見る」として口コミに表示されます。</p>
                  <input type="url" placeholder="https://..."
                    value={formData.productUrl}
                    onChange={(e) => updateData('productUrl', e.target.value)}
                    className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-between items-center">
              <span className="text-xs text-text-sub">商品が見つからない場合はスキップできます</span>
              <button onClick={handleNext2}
                className="px-8 py-3 rounded-full font-bold shadow-sm transition-all flex items-center gap-2 bg-primary text-white hover:bg-primary-hover hover:scale-105">
                次へ進む
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: 詳細情報 ── */}
        {step === 3 && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="text-sm text-text-sub hover:text-primary flex items-center gap-1 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                </svg>
                戻る
              </button>
              <p className="text-text-sub font-medium text-sm">ギフトの詳細を教えてください✨</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-bold text-text-main mb-2">
                  写真 <span className="text-accent-strong text-xs">*</span>
                  <span className="text-xs font-normal text-text-sub ml-2">（最大2枚・1枚目必須）</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map((index) => (
                    <div key={index}>
                      <div onClick={() => fileInputRefs[index].current?.click()}
                        className="aspect-square bg-background-soft border-2 border-dashed border-border-light rounded-2xl flex flex-col items-center justify-center text-text-sub hover:bg-white hover:border-primary cursor-pointer transition-colors group overflow-hidden relative">
                        {compressing && !imagePreviews[index] ? (
                          <Spinner size={8} color="text-primary" />
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
                        <button onClick={() => removeImage(index)} className="mt-1 w-full text-xs text-text-sub hover:text-red-500 transition-colors text-center">削除</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gender + Age + Price */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
                    <span className="bg-primary text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">1</span>
                    性別を選択 <span className="text-accent-strong text-xs">*</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['女性', '男性', 'その他', '指定なし'].map(g => (
                      <button key={g} onClick={() => updateData('gender', g)}
                        className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all border-2 text-sm font-bold ${
                          formData.gender === g ? 'border-primary bg-primary/10 text-primary' : 'border-border-light bg-background-soft text-text-sub hover:border-primary/50'
                        }`}>
                        {g === '女性' && '👩'}{g === '男性' && '👨'}{g === 'その他' && '🧑'}{g === '指定なし' && '🎁'}
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
                    <span className="bg-primary text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">2</span>
                    年齢層を選択 <span className="text-accent-strong text-xs">*</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['10代', '20代前半', '20代後半', '30代', '40代', '50代〜'].map(age => (
                      <button key={age} onClick={() => updateData('ageGroup', age)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                          formData.ageGroup === age ? 'border-primary bg-primary text-white' : 'border-border-light bg-background-soft text-text-sub hover:border-primary/50'
                        }`}>
                        {age}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-main mb-2">予算（約） <span className="text-accent-strong text-xs">*</span></label>
                  {!priceUnknown && (
                    <div className="relative max-w-[200px]">
                      <input type="number" step="100" placeholder="5000" value={formData.priceCategory}
                        onChange={(e) => updateData('priceCategory', e.target.value)}
                        className="w-full bg-background-soft border border-border-light rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors" />
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
              </div>
            </div>

            {/* Chips */}
            <div className="space-y-6 pt-6 border-t border-border-light">
              {[
                { key: 'relationship' as const, label: '具体的な関係性', options: WHO_OPTIONS },
                { key: 'scene' as const, label: 'シーン', options: SCENE_OPTIONS },
                { key: 'category' as const, label: 'カテゴリ', options: CATEGORY_OPTIONS },
              ].map(({ key, label, options }) => (
                <div key={key}>
                  <label className="block text-sm font-bold text-text-main mb-2">
                    {label} <span className="text-xs font-normal text-text-sub ml-2">（最大3つまで）</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => {
                      const isSelected = formData[key].includes(opt);
                      const isDisabled = !isSelected && formData[key].length >= 3;
                      return (
                        <button key={opt} onClick={() => toggleArrayItem(key, opt)} disabled={isDisabled}
                          className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                            isSelected ? 'border-accent-strong bg-accent-strong text-white' : 'border-border-light text-text-main bg-white hover:border-accent-strong/50 hover:text-accent-strong'
                          } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Episode */}
            <div className="pt-6 border-t border-border-light">
              <label className="block text-sm font-bold text-text-main mb-2">
                このギフトを選んだ理由・喜ばれたポイント <span className="text-accent-strong text-xs">*</span>
              </label>
              <textarea rows={4} value={formData.episode} onChange={(e) => updateData('episode', e.target.value)}
                className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors resize-none" />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
            )}

            <div className="pt-6 flex justify-between items-center">
              <span className="text-xs text-text-sub">必須項目をすべて埋めてください</span>
              <button onClick={handleSubmit} disabled={!isStep3Valid || submitting || compressing}
                className={`px-10 py-3.5 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 ${
                  isStep3Valid && !submitting ? 'bg-accent-strong text-white hover:opacity-90 hover:-translate-y-1' : 'bg-border-light text-text-sub cursor-not-allowed opacity-70'
                }`}>
                {submitting ? (
                  <><Spinner size={4} /> 保存中...</>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/>
                    </svg>
                    変更を保存する
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>

    {editingFile && (
      <PhotoEditor
        file={editingFile.file}
        onConfirm={handleEditorConfirm}
        onCancel={() => setEditingFile(null)}
      />
    )}
    </>
  );
}
