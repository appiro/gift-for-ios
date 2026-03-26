"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WHO_OPTIONS, SCENE_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import PhotoEditor from '@/components/PhotoEditor';

type RakutenItem = { itemName: string; itemPrice: number; affiliateUrl: string; mediumImageUrl: string; shopName: string };
type ProductSuggestion = { id: string; name: string; brand: string | null; image_url: string | null; tags: string[] };

export default function PostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [reviewType, setReviewType] = useState<'gave' | 'received'>('gave');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null]);
  const [compressing, setCompressing] = useState(false);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [priceUnknown, setPriceUnknown] = useState(false);
  const [editingFile, setEditingFile] = useState<{ file: File; index: number } | null>(null);

  const [formData, setFormData] = useState({
    brandName: '',
    productName: '',
    productId: '',
    productTags: [] as string[],
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

  // Internal product suggest
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const productWrapRef = useRef<HTMLDivElement>(null);

  // Rakuten search state
  const [rakutenItems, setRakutenItems] = useState<RakutenItem[]>([]);
  const [rakutenLoading, setRakutenLoading] = useState(false);
  const [rakutenSearched, setRakutenSearched] = useState(false);
  const [showCustomUrl, setShowCustomUrl] = useState(false);

  // Check auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login');
    });
  }, []);

  // Debounce internal product suggest
  useEffect(() => {
    const q = formData.productName;
    if (!q || formData.productId) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
        if (res.ok) setSuggestions(await res.json());
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.productName, formData.productId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (productWrapRef.current && !productWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const updateData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'relationship' | 'scene' | 'category', value: string) => {
    setFormData(prev => {
      const currentArray = prev[key];
      if (currentArray.includes(value)) return { ...prev, [key]: currentArray.filter(i => i !== value) };
      if (currentArray.length >= 3) return prev;
      return { ...prev, [key]: [...currentArray, value] };
    });
  };

  // Step 1 → 2: advance immediately, fire Rakuten search in background
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

  const clearRakutenSelection = () => {
    setFormData(prev => ({ ...prev, rakutenUrl: '', rakutenImageUrl: '', rakutenItemName: '', rakutenItemPrice: 0 }));
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
    setCompressing(false);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => { const n = [...prev]; n[index] = null; return n; });
    setImagePreviews(prev => { const n = [...prev]; n[index] = null; return n; });
  };

  const handleSubmit = async () => {
    if (!formData.productName || (!priceUnknown && !formData.priceCategory) || !formData.episode) return;
    if (!imagePreviews[0]) { setError('メインビジュアルをアップロードしてください'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < 2; i++) {
        const file = imageFiles[i];
        if (!file) continue;
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('review-images').upload(fileName, file, { upsert: false });
        if (uploadError) throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
        const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(uploadData.path);
        uploadedUrls.push(publicUrl);
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.brandName
            ? `${formData.brandName}　${formData.productName}`
            : formData.productName,
          productName: formData.productName,
          productId: formData.productId || null,
          productUrl: formData.productUrl || null,
          rakutenUrl: formData.rakutenUrl || null,
          rakutenImageUrl: formData.rakutenImageUrl || null,
          rakutenItemName: formData.rakutenItemName || null,
          rakutenItemPrice: formData.rakutenItemPrice || null,
          price: priceUnknown ? '不明' : `〜${Number(formData.priceCategory).toLocaleString()}円`,
          imageUrl: uploadedUrls[0] ?? '',
          images: uploadedUrls,
          episode: formData.episode,
          gender: formData.gender,
          ageGroup: formData.ageGroup,
          relationship: formData.relationship,
          scene: formData.scene,
          category: formData.category,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? '投稿に失敗しました');
      }
      const review = await res.json();
      router.push(`/post/${review.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Valid = !!formData.productName.trim();
  const isStep3Valid = !!(formData.episode && (priceUnknown || formData.priceCategory) && formData.productName && imagePreviews[0]);

  const Spinner = ({ size = 4, color = 'text-white' }: { size?: number; color?: string }) => (
    <svg className={`animate-spin w-${size} h-${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );

  return (
    <>
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-background-card border border-border-light rounded-2xl shadow-sm p-4 sm:p-8 mt-2 sm:mt-4">

        {/* Progress header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <img src="/icons/cat.png" className="w-[30px] h-[30px] object-contain" alt="Cat Icon" />
            口コミを書く
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

        {/* ── STEP 1: 商品名 ─────────────────────────── */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            {/* 贈った / もらった */}
            <div>
              <p className="text-sm font-bold text-text-main mb-3">どちらの口コミですか？</p>
              <div className="flex rounded-2xl border border-border-light overflow-hidden bg-background-soft">
                <button onClick={() => setReviewType('gave')}
                  className={`flex-1 py-3 text-sm font-bold transition-all ${reviewType === 'gave' ? 'bg-primary text-white shadow-sm' : 'text-text-sub hover:text-text-main'}`}>
                  🎁 贈ったギフト
                </button>
                <button onClick={() => setReviewType('received')}
                  className={`flex-1 py-3 text-sm font-bold transition-all ${reviewType === 'received' ? 'bg-secondary text-white shadow-sm' : 'text-text-sub hover:text-text-main'}`}>
                  🎀 もらったギフト
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <p className="text-sm font-bold text-text-main">どんなギフトでしたか？</p>

              {/* Brand name */}
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

              {/* Product name */}
              <div>
                <label className="block text-sm font-bold text-text-main mb-2">
                  商品名 <span className="text-accent-strong text-xs">*</span>
                </label>
                <div ref={productWrapRef} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="例）ボディクリーム 154ml"
                      value={formData.productName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, productName: e.target.value, productId: '', productTags: [] }));
                        setShowSuggestions(true);
                      }}
                      onFocus={() => { if (!formData.productId) setShowSuggestions(true); }}
                      className={`w-full bg-background-soft border rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white transition-colors pr-10 ${
                        formData.productId ? 'border-primary/30 bg-primary/5' : 'border-border-light focus:border-primary'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {formData.productId ? (
                        <button onClick={() => setFormData(prev => ({ ...prev, productId: '', productTags: [] }))}
                          className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-red-50 hover:text-red-400 transition-colors">
                          公式
                          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/>
                          </svg>
                        </button>
                      ) : suggestLoading ? <Spinner size={3} color="text-text-sub" /> : null}
                    </div>
                  </div>

                  {/* Internal product suggest */}
                  {showSuggestions && suggestions.length > 0 && !formData.productId && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-border-light rounded-xl shadow-lg overflow-hidden">
                      {suggestions.map((p) => (
                        <button key={p.id} onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData(prev => ({ ...prev, productId: p.id, productName: p.name, productTags: p.tags ?? [] }));
                            setShowSuggestions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background-soft transition-colors border-b border-border-light last:border-b-0">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-background-soft border border-border-light">
                            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-border-light" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-text-main line-clamp-1">{p.name}</p>
                            {p.brand && <p className="text-xs text-text-sub">{p.brand}</p>}
                          </div>
                          <span className="flex-shrink-0 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">公式</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {formData.productTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.productTags.map((tag) => (
                        <span key={tag} className="text-[11px] bg-background-soft border border-border-light text-text-sub px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
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

        {/* ── STEP 2: 楽天商品選択 ────────────────────── */}
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

              {/* Selected state */}
              {formData.rakutenUrl && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ef4444" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05"/></svg>
                  <span className="text-sm font-bold text-red-700 flex-1">楽天商品を選択済み</span>
                  <button onClick={clearRakutenSelection} className="text-xs text-red-400 hover:text-red-600 font-bold">解除</button>
                </div>
              )}

              {/* Loading skeleton */}
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

              {/* Results */}
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

            {/* Custom URL section */}
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
                  <input
                    type="url"
                    placeholder="https://..."
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

        {/* ── STEP 3: 詳細情報 ────────────────────────── */}
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

            {/* Photo & Core Info Grid */}
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
                          <img src={imagePreviews[index]!} alt="preview" className="w-full h-full object-cover" />
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
                {/* Gender */}
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

                {/* Age */}
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

                {/* Price */}
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
                placeholder="先輩からは「センスいいね！」と言われました..."
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
                  <><Spinner size={4} /> 投稿中...</>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/>
                    </svg>
                    この内容で投稿する
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
