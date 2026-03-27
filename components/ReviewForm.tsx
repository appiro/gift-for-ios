"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WHO_OPTIONS, SCENE_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import PhotoEditor from '@/components/PhotoEditor';
import type { Review } from '@/lib/types';

type RakutenItem = { itemName: string; itemPrice: number; affiliateUrl: string; mediumImageUrl: string; shopName: string };
type ProductSuggestion = { id: string; name: string; brand: string | null; image_url: string | null; tags: string[] };

interface ReviewFormProps {
  mode: 'create' | 'edit';
  reviewId?: string;
}

export default function ReviewForm({ mode, reviewId }: ReviewFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [reviewType, setReviewType] = useState<'gave' | 'received'>('gave');
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [priceUnknown, setPriceUnknown] = useState(false);
  const [editingFile, setEditingFile] = useState<{ file: File; index: number } | null>(null);
  const [previewingFile, setPreviewingFile] = useState<{ file: File; previewUrl: string; index: number } | null>(null);

  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null]);
  const [originalUrls, setOriginalUrls] = useState<(string | null)[]>([null, null]);
  const fileInputRef0 = useRef<HTMLInputElement>(null);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRefs = [fileInputRef0, fileInputRef1];

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

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const productWrapRef = useRef<HTMLDivElement>(null);

  const [rakutenItems, setRakutenItems] = useState<RakutenItem[]>([]);
  const [rakutenLoading, setRakutenLoading] = useState(false);
  const [rakutenSearched, setRakutenSearched] = useState(false);
  const [showCustomUrl, setShowCustomUrl] = useState(false);

  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const toggleAccordion = (key: string) => setOpenAccordions(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const DRAFT_KEY = 'review-draft';

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, priceUnknown, reviewType }));
    setShowInterruptModal(false);
    router.push('/');
  };

  const discardAndLeave = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowInterruptModal(false);
    router.push('/');
  };

  // Load draft on create mode mount
  useEffect(() => {
    if (mode !== 'create') return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as { formData: typeof formData; priceUnknown: boolean; reviewType: 'gave' | 'received' };
      setFormData(draft.formData);
      setPriceUnknown(draft.priceUnknown);
      setReviewType(draft.reviewType);
      localStorage.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
  }, [mode]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      if (mode === 'edit' && reviewId) {
        const res = await fetch(`/api/reviews/${reviewId}`);
        if (!res.ok) { router.push('/'); return; }
        const review: Review = await res.json();
        if (review.authorId !== user.id) { router.push(`/post/${reviewId}`); return; }

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

        let brandName = review.brandName ?? '';
        if (!brandName && review.title?.includes('　')) {
          const parts = review.title.split('　');
          if (parts.length === 2 && parts[1] === review.productName) brandName = parts[0];
        }

        setFormData({
          brandName,
          productName: review.productName ?? '',
          productId: '',
          productTags: [],
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
      }
    };
    init();
  }, [mode, reviewId]);

  useEffect(() => {
    const q = formData.productName;
    if (!q || formData.productId) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
        if (res.ok) setSuggestions(await res.json());
      } finally { setSuggestLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.productName, formData.productId]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (productWrapRef.current && !productWrapRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const updateData = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const toggleArrayItem = (key: 'relationship' | 'scene' | 'category', value: string) => {
    setFormData(prev => {
      const arr = prev[key];
      if (arr.includes(value)) return { ...prev, [key]: arr.filter(i => i !== value) };
      if (arr.length >= 3) return prev;
      return { ...prev, [key]: [...arr, value] };
    });
  };

  const fireRakutenSearch = () => {
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

  const handleNext1 = () => { setStep(2); fireRakutenSearch(); };
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

  const clearRakutenSelection = () =>
    setFormData(prev => ({ ...prev, rakutenUrl: '', rakutenImageUrl: '', rakutenItemName: '', rakutenItemPrice: 0 }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPreviewingFile({ file, previewUrl, index });
    e.target.value = '';
  };

  const handlePreviewDelete = () => {
    if (!previewingFile) return;
    URL.revokeObjectURL(previewingFile.previewUrl);
    setPreviewingFile(null);
  };

  const handlePreviewEdit = () => {
    if (!previewingFile) return;
    const { file, previewUrl, index } = previewingFile;
    URL.revokeObjectURL(previewUrl);
    setPreviewingFile(null);
    setEditingFile({ file, index });
  };

  const handlePreviewConfirm = async () => {
    if (!previewingFile) return;
    const { file, previewUrl, index } = previewingFile;
    URL.revokeObjectURL(previewUrl);
    setPreviewingFile(null);
    setCompressing(true);
    const compressed = await compressImage(file);
    setImageFiles(prev => { const n = [...prev]; n[index] = compressed; return n; });
    setImagePreviews(prev => { const n = [...prev]; n[index] = URL.createObjectURL(compressed); return n; });
    setOriginalUrls(prev => { const n = [...prev]; n[index] = null; return n; });
    setCompressing(false);
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
    try {
      const finalUrls: string[] = [];
      for (let i = 0; i < 2; i++) {
        if (imageFiles[i]) {
          const file = imageFiles[i]!;
          const ext = file.name.split('.').pop();
          const fileName = `${Date.now()}_${i}.${ext}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('review-images').upload(fileName, file, { upsert: false });
          if (uploadError) throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
          const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(uploadData.path);
          finalUrls.push(publicUrl);
        } else if (originalUrls[i]) {
          finalUrls.push(originalUrls[i]!);
        }
      }

      const title = formData.brandName
        ? `${formData.brandName}　${formData.productName}`
        : formData.productName;

      const payload: Record<string, unknown> = {
        title,
        brandName: formData.brandName || null,
        productName: formData.productName,
        price: priceUnknown ? '不明' : `〜${Number(formData.priceCategory).toLocaleString()}円`,
        imageUrl: finalUrls[0] ?? '',
        images: finalUrls,
        episode: formData.episode,
        gender: formData.gender,
        ageGroup: formData.ageGroup,
        relationship: formData.relationship,
        scene: formData.scene,
        category: formData.category,
        productUrl: formData.productUrl || null,
        rakutenUrl: formData.rakutenUrl || null,
        rakutenImageUrl: formData.rakutenImageUrl || null,
        rakutenItemName: formData.rakutenItemName || null,
        rakutenItemPrice: formData.rakutenItemPrice || null,
      };
      if (mode === 'create') payload.productId = formData.productId || null;

      const url = mode === 'create' ? '/api/reviews' : `/api/reviews/${reviewId}`;
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? (mode === 'create' ? '投稿に失敗しました' : '更新に失敗しました'));
      }
      const review = await res.json();
      router.push(`/post/${mode === 'create' ? review.id : reviewId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : (mode === 'create' ? '投稿に失敗しました' : '更新に失敗しました'));
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Valid = !!formData.productName.trim();
  const isStep2Valid = !!(formData.gender && formData.ageGroup);
  const isStep3Valid = !!(formData.episode && (priceUnknown || formData.priceCategory) && formData.productName && imagePreviews[0]);

  const Spinner = ({ size = 4, color = 'text-white' }: { size?: number; color?: string }) => (
    <svg className={`animate-spin w-${size} h-${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );

  const BackButton = () => (
    <button onClick={handleBack} className="text-sm text-text-sub hover:text-primary flex items-center gap-1 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
      </svg>
      戻る
    </button>
  );

  const NextButton = ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
    <button onClick={onClick} disabled={disabled}
      className={`px-8 py-3 rounded-full font-bold shadow-sm transition-all flex items-center gap-2 ${
        !disabled ? 'bg-primary text-white hover:bg-primary-hover hover:scale-105' : 'bg-border-light text-text-sub cursor-not-allowed opacity-70'
      }`}>
      次へ進む
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
      </svg>
    </button>
  );

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto w-full py-20 flex items-center justify-center">
        <Spinner size={8} color="text-primary" />
      </div>
    );
  }

  const titlePreview = formData.brandName ? `${formData.brandName}　${formData.productName}` : formData.productName;

  return (
    <>
      <div className="max-w-2xl mx-auto w-full">
        <div className="bg-background-card border border-border-light rounded-2xl shadow-sm p-4 sm:p-8 mt-2 sm:mt-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
              {mode === 'edit' ? (
                <>
                  <Link href={`/post/${reviewId}`} className="text-text-sub hover:text-primary transition-colors mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                    </svg>
                  </Link>
                  口コミを編集
                </>
              ) : (
                <>
                  <img src="/icons/cat.png" className="w-[30px] h-[30px] object-contain" alt="" />
                  口コミを書く
                </>
              )}
            </h1>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-8 h-1 rounded-full ${step > i ? 'bg-primary' : 'bg-border-light'}`} />}
                  <div className={`w-3 h-3 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-border-light'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* ── STEP 1: ブランド・商品名 ── */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              {mode === 'create' && (
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
              )}

              <div className="space-y-5">
                <p className="text-sm font-bold text-text-main">どんなギフトでしたか？</p>
                <div>
                  <label className="block text-sm font-bold text-text-main mb-2">
                    ブランド名 <span className="text-xs font-normal text-text-sub ml-1">（任意）</span>
                  </label>
                  <input type="text" placeholder="例）Jo Malone、無印良品" value={formData.brandName}
                    onChange={(e) => updateData('brandName', e.target.value)}
                    className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-main mb-2">
                    商品名 <span className="text-accent-strong text-xs">*</span>
                  </label>
                  <div ref={productWrapRef} className="relative">
                    <div className="relative">
                      <input type="text" placeholder="例）ボディクリーム 154ml" value={formData.productName}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, productName: e.target.value, productId: '', productTags: [] }));
                          setShowSuggestions(true);
                        }}
                        onFocus={() => { if (!formData.productId) setShowSuggestions(true); }}
                        className={`w-full bg-background-soft border rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white transition-colors pr-10 ${
                          formData.productId ? 'border-primary/30 bg-primary/5' : 'border-border-light focus:border-primary'
                        }`} />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {formData.productId ? (
                          <button onClick={() => setFormData(prev => ({ ...prev, productId: '', productTags: [] }))}
                            className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-red-50 hover:text-red-400 transition-colors">
                            公式
                            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                              <line x1="2" y1="14" x2="14" y2="2" /><line x1="2" y1="2" x2="14" y2="14" />
                            </svg>
                          </button>
                        ) : suggestLoading ? <Spinner size={3} color="text-text-sub" /> : null}
                      </div>
                    </div>
                    {showSuggestions && suggestions.length > 0 && !formData.productId && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-border-light rounded-xl shadow-lg overflow-hidden">
                        {suggestions.map((p) => (
                          <button key={p.id} onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData(prev => ({ ...prev, productId: p.id, productName: p.name, productTags: p.tags ?? [] }));
                            setShowSuggestions(false);
                          }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background-soft transition-colors border-b border-border-light last:border-b-0">
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
                <NextButton onClick={handleNext1} disabled={!isStep1Valid} />
              </div>
            </div>
          )}

          {/* ── STEP 2: 性別・年齢層 ── */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <BackButton />
                <div className="text-xs bg-background-soft px-3 py-1.5 rounded-full border border-border-light text-text-sub flex items-center gap-1.5">
                  {formData.brandName && <span className="font-bold text-text-main">{formData.brandName}</span>}
                  {formData.brandName && <span>·</span>}
                  <span className="font-bold text-text-main">{formData.productName}</span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-text-main mb-3">ギフトを贈った相手の性別 <span className="text-accent-strong text-xs">*</span></h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['女性', '男性', 'その他', '指定なし'].map(g => (
                      <button key={g} onClick={() => updateData('gender', g)}
                        className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all border-2 text-sm font-bold ${
                          formData.gender === g ? 'border-primary bg-primary/10 text-primary' : 'border-border-light bg-background-soft text-text-sub hover:border-primary/50'
                        }`}>
                        {g === '女性' && '👩'}{g === '男性' && '👨'}{g === 'その他' && '🧑'}{g === '指定なし' && '🎁'}{g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-main mb-3">相手の年齢層 <span className="text-accent-strong text-xs">*</span></h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['10代', '20代前半', '20代後半', '30代', '40代', '50代〜'].map(age => (
                      <button key={age} onClick={() => updateData('ageGroup', age)}
                        className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                          formData.ageGroup === age ? 'border-primary bg-primary text-white' : 'border-border-light bg-background-soft text-text-sub hover:border-primary/50'
                        }`}>
                        {age}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border-light flex justify-end">
                <NextButton onClick={handleNext2} disabled={!isStep2Valid} />
              </div>
            </div>
          )}

          {/* ── STEP 3: 詳細 ── */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <BackButton />
                <p className="text-text-sub font-medium text-sm">詳細を教えてください✨</p>
              </div>

              {/* Title preview */}
              <div className="bg-background-soft rounded-xl px-4 py-3 border border-border-light">
                <p className="text-xs text-text-sub mb-0.5">タイトル（自動生成）</p>
                <p className="text-sm font-bold text-text-main">{titlePreview}</p>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-bold text-text-main mb-2">
                  写真 <span className="text-accent-strong text-xs">*</span>
                  <span className="text-xs font-normal text-text-sub ml-2">（最大2枚・1枚目必須）</span>
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  {[0, 1].map((index) => (
                    <div key={index}>
                      <div onClick={() => fileInputRefs[index].current?.click()}
                        className="aspect-square bg-background-soft border-2 border-dashed border-border-light rounded-2xl flex flex-col items-center justify-center text-text-sub hover:bg-white hover:border-primary cursor-pointer transition-colors group overflow-hidden">
                        {compressing && !imagePreviews[index] ? (
                          <Spinner size={8} color="text-primary" />
                        ) : imagePreviews[index] ? (
                          <img src={imagePreviews[index]!} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="text-border-light group-hover:text-primary transition-colors" viewBox="0 0 16 16">
                              <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0" />
                              <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0" />
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

              {/* Rakuten */}
              <div className="bg-background-soft rounded-2xl p-4 space-y-3">
                <p className="text-sm font-bold text-text-main">楽天で商品を選択</p>
                <p className="text-xs text-text-sub">該当する商品があれば選んでください。なければスキップできます。</p>

                {formData.rakutenUrl && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ef4444" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" /><path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05" /></svg>
                    <span className="text-sm font-bold text-red-700 flex-1">楽天商品を選択済み</span>
                    <button onClick={clearRakutenSelection} className="text-xs text-red-400 hover:text-red-600 font-bold">解除</button>
                  </div>
                )}

                {rakutenLoading && (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border border-border-light rounded-xl animate-pulse bg-white">
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
                  rakutenItems.length === 0 ? (
                    <div className="text-center py-4 text-text-sub text-sm border border-dashed border-border-light rounded-xl bg-white">
                      楽天に該当商品が見つかりませんでした
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {rakutenItems.map((item, i) => (
                        <button key={i} onClick={() => selectRakutenItem(item)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left bg-white ${
                            formData.rakutenUrl === item.affiliateUrl ? 'border-red-400 bg-red-50' : 'border-border-light hover:border-red-300 hover:bg-background-soft'
                          }`}>
                          {item.mediumImageUrl && <img src={item.mediumImageUrl} alt={item.itemName} className="w-14 h-14 object-contain rounded-lg bg-background-soft flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-text-main line-clamp-2 leading-relaxed">{item.itemName}</p>
                            <p className="text-xs text-text-sub mt-1">¥{item.itemPrice.toLocaleString()} · {item.shopName}</p>
                          </div>
                          {formData.rakutenUrl === item.affiliateUrl && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ef4444" viewBox="0 0 16 16" className="flex-shrink-0"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" /><path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05" /></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                )}

                <button onClick={() => setShowCustomUrl(v => !v)}
                  className="flex items-center gap-2 text-xs font-bold text-text-sub hover:text-primary transition-colors pt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"
                    className={`transition-transform ${showCustomUrl ? 'rotate-180' : ''}`}>
                    <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                  </svg>
                  楽天以外のショップURLを入力する
                </button>
                {showCustomUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-text-sub">入力したURLは「商品詳細を見る」として口コミに表示されます。</p>
                    <input type="url" placeholder="https://..." value={formData.productUrl}
                      onChange={(e) => updateData('productUrl', e.target.value)}
                      className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
                  </div>
                )}
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

              {/* Accordion chips */}
              <div className="space-y-2 border-t border-border-light pt-4">
                {([
                  { key: 'relationship' as const, label: '具体的な関係性', options: WHO_OPTIONS },
                  { key: 'scene' as const, label: 'シーン', options: SCENE_OPTIONS },
                  { key: 'category' as const, label: 'カテゴリ', options: CATEGORY_OPTIONS },
                ]).map(({ key, label, options }) => {
                  const isOpen = openAccordions.has(key);
                  const selected = formData[key];
                  return (
                    <div key={key} className="border border-border-light rounded-xl overflow-hidden">
                      <button onClick={() => toggleAccordion(key)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-background-soft hover:bg-white transition-colors text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-text-main">{label}</span>
                          <span className="text-xs text-text-sub">（最大3つ）</span>
                          {selected.length > 0 && (
                            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{selected.length}</span>
                          )}
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"
                          className={`text-text-sub transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                          <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-4 py-3 bg-white border-t border-border-light">
                          {selected.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {selected.map(v => (
                                <span key={v} className="py-1 px-3 rounded-full text-xs font-bold border border-accent-strong bg-accent-strong text-white">{v}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {options.map(opt => {
                              const isSel = selected.includes(opt);
                              const isDis = !isSel && selected.length >= 3;
                              return (
                                <button key={opt} onClick={() => toggleArrayItem(key, opt)} disabled={isDis}
                                  className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                                    isSel ? 'border-accent-strong bg-accent-strong text-white' : 'border-border-light text-text-main bg-white hover:border-accent-strong/50 hover:text-accent-strong'
                                  } ${isDis ? 'opacity-40 cursor-not-allowed' : ''}`}>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Episode */}
              <div>
                <label className="block text-sm font-bold text-text-main mb-2">
                  このギフトを選んだ理由・喜ばれたポイント <span className="text-accent-strong text-xs">*</span>
                </label>
                <textarea rows={4} value={formData.episode} onChange={(e) => updateData('episode', e.target.value)}
                  placeholder="先輩からは「センスいいね！」と言われました..."
                  className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors resize-none" />
              </div>

              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

              <div className="pt-4 flex justify-between items-center border-t border-border-light">
                <span className="text-xs text-text-sub">必須項目をすべて埋めてください</span>
                <button onClick={handleSubmit} disabled={!isStep3Valid || submitting || compressing}
                  className={`px-10 py-3.5 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 ${
                    isStep3Valid && !submitting ? 'bg-accent-strong text-white hover:opacity-90 hover:-translate-y-1' : 'bg-border-light text-text-sub cursor-not-allowed opacity-70'
                  }`}>
                  {submitting ? (
                    <><Spinner size={4} /> {mode === 'create' ? '投稿中...' : '更新中...'}</>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
                      </svg>
                      {mode === 'create' ? 'この内容で投稿する' : 'この内容で更新する'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 中断ボタン（右下固定） */}
      <button
        onClick={() => setShowInterruptModal(true)}
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-40 flex items-center gap-1.5 px-4 py-2 bg-white border border-border-light rounded-full text-xs font-bold text-text-sub shadow-md hover:border-red-300 hover:text-red-400 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
        </svg>
        中断する
      </button>

      {/* 中断モーダル */}
      {showInterruptModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInterruptModal(false)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <div className="w-10 h-1 bg-border-light rounded-full mx-auto mb-5 sm:hidden" />
              <h2 className="text-base font-bold text-text-main mb-1">投稿を中断しますか？</h2>
              <p className="text-xs text-text-sub mb-5">入力した内容はどうしますか？</p>
            </div>
            <div className="px-4 pb-6 space-y-2">
              <button
                onClick={() => setShowInterruptModal(false)}
                className="w-full py-3.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
              >
                続けて投稿する
              </button>
              {mode === 'create' && (
                <button
                  onClick={saveDraft}
                  className="w-full py-3.5 rounded-xl bg-background-soft border border-border-light text-sm font-bold text-text-main hover:border-primary hover:text-primary transition-colors"
                >
                  下書きに保存する
                </button>
              )}
              <button
                onClick={discardAndLeave}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-red-400 hover:text-red-600 transition-colors"
              >
                投稿をやめる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo preview overlay: 右上=編集, 左下=削除, 右下=確認 */}
      {previewingFile && (
        <div
          className="fixed inset-0 z-[200] bg-black flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex-1 relative flex items-center justify-center min-h-0">
            <img
              src={previewingFile.previewUrl}
              alt="preview"
              className="max-w-full max-h-full object-contain"
            />
            {/* 右上: 編集 */}
            <button
              onClick={handlePreviewEdit}
              className="absolute top-4 right-4 px-4 py-2 bg-black/60 rounded-full text-white text-sm font-bold backdrop-blur-sm"
            >
              編集
            </button>
          </div>
          {/* ボトムバー */}
          <div className="flex items-center justify-between px-8 py-5">
            {/* 左下: 削除 */}
            <button
              onClick={handlePreviewDelete}
              className="px-5 py-3 rounded-full bg-white/10 text-white text-sm font-bold"
            >
              削除
            </button>
            {/* 右下: 確認 */}
            <button
              onClick={handlePreviewConfirm}
              disabled={compressing}
              className="px-7 py-3 rounded-full bg-primary text-white text-sm font-bold disabled:opacity-50"
            >
              {compressing ? '処理中...' : '確認'}
            </button>
          </div>
        </div>
      )}

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
