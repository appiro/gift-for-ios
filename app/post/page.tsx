"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WHO_OPTIONS, SCENE_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';

export default function PostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [reviewType, setReviewType] = useState<'gave' | 'received'>('gave');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    gender: '',
    ageGroup: '',
    productId: '',
    productName: '',
    productTags: [] as string[],   // productsテーブル由来のタグ（商品タグ）
    priceCategory: '',
    relationship: [] as string[],
    scene: [] as string[],
    category: [] as string[],
    episode: ''
  });

  // Product inline suggest
  type ProductSuggestion = { id: string; name: string; brand: string | null; image_url: string | null; tags: string[] };
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const productWrapRef = useRef<HTMLDivElement>(null);

  // Check auth on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login');
    });
  }, []);

  // Debounce suggest fetch
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

  // Close suggestions on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (productWrapRef.current && !productWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const updateData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'relationship' | 'scene' | 'category', value: string) => {
    setFormData(prev => {
      const currentArray = prev[key];
      if (currentArray.includes(value)) {
        return { ...prev, [key]: currentArray.filter(i => i !== value) };
      }
      if (currentArray.length >= 3) return prev;
      return { ...prev, [key]: [...currentArray, value] };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    setImagePreview(null);
    setImageSize(null);

    const compressed = await compressImage(file);
    const kb = (compressed.size / 1024).toFixed(0);
    const originalKb = (file.size / 1024).toFixed(0);

    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
    setImageSize(
      compressed.size < file.size
        ? `${kb}KB（元: ${originalKb}KB から圧縮）`
        : `${kb}KB`
    );
    setCompressing(false);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!formData.productName || !formData.priceCategory || !formData.episode) return;
    if (!imageFile && !imagePreview) {
      setError('メインビジュアルをアップロードしてください');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let imageUrl = '';

      // Upload image to Supabase Storage
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(fileName, imageFile, { upsert: false });

        if (uploadError) throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('review-images')
          .getPublicUrl(uploadData.path);

        imageUrl = publicUrl;
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reviewType === 'received'
            ? `${formData.relationship[0] ?? formData.gender}からもらったギフト`
            : `${formData.relationship[0] ?? formData.gender}へのギフト`,
          productName: formData.productName,
          productId: formData.productId || null,
          price: `〜${Number(formData.priceCategory).toLocaleString()}円`,
          imageUrl,
          images: imageUrl ? [imageUrl] : [],
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

  const isStep1Valid = formData.gender && formData.ageGroup;
  const isStep2Valid = !!(formData.episode && formData.priceCategory && formData.productName);

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-background-card border border-border-light rounded-2xl shadow-sm p-4 sm:p-8 mt-2 sm:mt-4">

        {/* Progress header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <img src="/icons/cat.png" className="w-[30px] h-[30px] object-contain" alt="Cat Icon" />
            口コミを書く
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border-light'}`}></div>
            <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border-light'}`}></div>
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border-light'}`}></div>
          </div>
        </div>

        {/* Form Content */}
        {step === 1 ? (
          <div className="space-y-10 animate-fade-in">
            {/* 贈った / もらった トグル */}
            <div>
              <p className="text-sm font-bold text-text-main mb-3">どちらの口コミですか？</p>
              <div className="flex rounded-2xl border border-border-light overflow-hidden bg-background-soft">
                <button
                  onClick={() => setReviewType('gave')}
                  className={`flex-1 py-3 text-sm font-bold transition-all ${reviewType === 'gave' ? 'bg-primary text-white shadow-sm' : 'text-text-sub hover:text-text-main'}`}
                >
                  🎁 贈ったギフト
                </button>
                <button
                  onClick={() => setReviewType('received')}
                  className={`flex-1 py-3 text-sm font-bold transition-all ${reviewType === 'received' ? 'bg-secondary text-white shadow-sm' : 'text-text-sub hover:text-text-main'}`}
                >
                  🎀 もらったギフト
                </button>
              </div>
            </div>

            <p className="text-text-sub font-medium">
              {reviewType === 'received' ? 'どんな相手からもらいましたか？' : 'どんな相手へのギフトでしたか？'}
            </p>

            {/* Gender Selection */}
            <div>
              <h3 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                <span className="bg-primary text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">1</span>
                性別を選択してください <span className="text-accent-strong text-xs">*</span>
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {['女性', '男性', 'その他', '指定なし'].map(g => (
                  <button
                    key={g}
                    onClick={() => updateData('gender', g)}
                    className={`py-4 px-6 rounded-2xl flex flex-col items-center gap-3 transition-all border-2 ${
                      formData.gender === g
                        ? 'border-primary bg-primary/10 text-primary shadow-sm scale-[1.02]'
                        : 'border-border-light bg-background-soft text-text-sub hover:border-primary/50 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.gender === g ? 'bg-white' : 'bg-border-light'}`}>
                      {g === '女性' && <span className="text-2xl">👩</span>}
                      {g === '男性' && <span className="text-2xl">👨</span>}
                      {g === 'その他' && <span className="text-2xl">🧑</span>}
                      {g === '指定なし' && <span className="text-2xl">🎁</span>}
                    </div>
                    <span className="font-bold text-sm">{g}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Age Group Selection */}
            <div>
              <h3 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                <span className="bg-primary text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">2</span>
                年齢層を選択してください <span className="text-accent-strong text-xs">*</span>
              </h3>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                {['10代', '20代前半', '20代後半', '30代', '40代', '50代〜'].map(age => (
                  <button
                    key={age}
                    onClick={() => updateData('ageGroup', age)}
                    className={`py-3 px-2 rounded-xl text-sm font-bold transition-all border-2 ${
                      formData.ageGroup === age
                        ? 'border-primary bg-primary text-white shadow-md'
                        : 'border-border-light bg-background-soft text-text-sub hover:border-primary/50'
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-border-light flex justify-end">
              <button
                onClick={handleNext}
                disabled={!isStep1Valid}
                className={`px-8 py-3 rounded-full font-bold shadow-sm transition-all flex items-center gap-2 ${
                  isStep1Valid
                    ? 'bg-primary text-white hover:bg-primary-hover hover:scale-105'
                    : 'bg-border-light text-text-sub cursor-not-allowed opacity-70'
                }`}
              >
                次へ進む
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="text-sm text-text-sub hover:text-primary flex items-center gap-1 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                </svg>
                戻る
              </button>

              <div className="flex items-center gap-2 text-sm bg-background-soft px-4 py-2 rounded-full border border-border-light">
                <span className="text-text-sub text-xs">選択中:</span>
                <span className="font-bold text-text-main">{formData.gender}</span>
                <span className="text-border-light">|</span>
                <span className="font-bold text-text-main">{formData.ageGroup}</span>
              </div>
            </div>

            <p className="text-text-sub font-medium">ギフトの詳細を教えてください✨</p>

            {/* Photo & Core Product Info Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-bold text-text-main mb-2">メインビジュアル <span className="text-accent-strong text-xs">*</span></label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-background-soft border-2 border-dashed border-border-light rounded-2xl flex flex-col items-center justify-center text-text-sub hover:bg-white hover:border-primary cursor-pointer transition-colors group overflow-hidden relative"
                >
                  {compressing ? (
                    <div className="flex flex-col items-center gap-3">
                      <svg className="animate-spin w-10 h-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    </div>
                  ) : imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                          <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
                          <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0"/>
                        </svg>
                      </div>
                      <span className="font-bold text-sm">写真をアップロード</span>
                      <span className="text-xs mt-1">またはクリックして選択</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imagePreview && !compressing && (
                  <div className="mt-2 flex items-center justify-between">
                    {imageSize && (
                      <span className="text-xs text-text-sub">{imageSize}</span>
                    )}
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); setImageSize(null); }}
                      className="text-xs text-text-sub hover:text-red-500 transition-colors ml-auto"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>

              {/* Detail fields */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-text-main mb-2">
                    商品名 <span className="text-accent-strong text-xs">*</span>
                  </label>
                  <div ref={productWrapRef} className="relative">
                    {/* テキスト入力 */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="例）Jo Malone ボディクリーム"
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
                      {/* 公式リンク済みバッジ or ローディング */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {formData.productId ? (
                          <button
                            onClick={() => setFormData(prev => ({ ...prev, productId: '', productTags: [] }))}
                            className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-red-50 hover:text-red-400 transition-colors"
                          >
                            公式
                            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                              <line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/>
                            </svg>
                          </button>
                        ) : suggestLoading ? (
                          <svg className="animate-spin w-3.5 h-3.5 text-text-sub" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        ) : null}
                      </div>
                    </div>

                    {/* サジェストドロップダウン */}
                    {showSuggestions && suggestions.length > 0 && !formData.productId && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-border-light rounded-xl shadow-lg overflow-hidden">
                        {suggestions.map((p) => (
                          <button
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({ ...prev, productId: p.id, productName: p.name, productTags: p.tags ?? [] }));
                              setShowSuggestions(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background-soft transition-colors border-b border-border-light last:border-b-0"
                          >
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-background-soft border border-border-light">
                              {p.image_url
                                ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-border-light" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-text-main line-clamp-1">{p.name}</p>
                              {p.brand && <p className="text-xs text-text-sub">{p.brand}</p>}
                            </div>
                            <span className="flex-shrink-0 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">公式</span>
                          </button>
                        ))}
                        <div className="px-4 py-2 bg-background-soft border-t border-border-light">
                          <p className="text-[11px] text-text-sub">そのまま入力を続けても投稿できます</p>
                        </div>
                      </div>
                    )}

                    {/* 商品タグ（公式選択時のみ） */}
                    {formData.productTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formData.productTags.map((tag) => (
                          <span key={tag} className="text-[11px] bg-background-soft border border-border-light text-text-sub px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-main mb-2">予算（約） <span className="text-accent-strong text-xs">*</span></label>
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
                </div>
              </div>
            </div>

            {/* Chips Vertical Stack */}
            <div className="space-y-6 pt-6 border-t border-border-light">
              {/* Relationship Chip */}
              <div>
                <label className="block text-sm font-bold text-text-main mb-2">
                  具体的な関係性 <span className="text-xs font-normal text-text-sub ml-2">（最大3つまで）</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {WHO_OPTIONS.map(rel => {
                    const isSelected = formData.relationship.includes(rel);
                    const isDisabled = !isSelected && formData.relationship.length >= 3;
                    return (
                      <button
                        key={rel}
                        onClick={() => toggleArrayItem('relationship', rel)}
                        disabled={isDisabled}
                        className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                          isSelected
                            ? 'border-accent-strong bg-accent-strong text-white'
                            : 'border-border-light text-text-main bg-white hover:border-accent-strong/50 hover:text-accent-strong'
                        } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {rel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scene Chip */}
              <div>
                <label className="block text-sm font-bold text-text-main mb-2">
                  シーン <span className="text-xs font-normal text-text-sub ml-2">（最大3つまで）</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SCENE_OPTIONS.map(s => {
                    const isSelected = formData.scene.includes(s);
                    const isDisabled = !isSelected && formData.scene.length >= 3;
                    return (
                      <button
                        key={s}
                        onClick={() => toggleArrayItem('scene', s)}
                        disabled={isDisabled}
                        className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                          isSelected
                            ? 'border-accent-strong bg-accent-strong text-white'
                            : 'border-border-light text-text-main bg-white hover:border-accent-strong/50 hover:text-accent-strong'
                        } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Chip */}
              <div>
                <label className="block text-sm font-bold text-text-main mb-2">
                  カテゴリ <span className="text-xs font-normal text-text-sub ml-2">（最大3つまで）</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(cat => {
                    const isSelected = formData.category.includes(cat);
                    const isDisabled = !isSelected && formData.category.length >= 3;
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleArrayItem('category', cat)}
                        disabled={isDisabled}
                        className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                          isSelected
                            ? 'border-accent-strong bg-accent-strong text-white'
                            : 'border-border-light text-text-main bg-white hover:border-accent-strong/50 hover:text-accent-strong'
                        } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Episode */}
            <div className="mt-8 pt-6 border-t border-border-light">
              <label className="block text-sm font-bold text-text-main mb-2">このギフトを選んだ理由・喜ばれたポイント <span className="text-accent-strong text-xs">*</span></label>
              <textarea
                rows={4}
                value={formData.episode}
                onChange={(e) => updateData('episode', e.target.value)}
                placeholder="先輩からは「センスいいね！」と言われました..."
                className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors resize-none"
              ></textarea>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="pt-8 flex justify-between items-center">
              <span className="text-xs text-text-sub">必須項目をすべて埋めてください</span>
              <button
                onClick={handleSubmit}
                disabled={!isStep2Valid || submitting || compressing}
                className={`px-10 py-3.5 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 ${
                  isStep2Valid && !submitting
                    ? 'bg-accent-strong text-white hover:opacity-90 hover:-translate-y-1'
                    : 'bg-border-light text-text-sub cursor-not-allowed opacity-70'
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    投稿中...
                  </>
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
  );
}
