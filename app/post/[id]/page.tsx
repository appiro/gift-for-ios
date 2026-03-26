"use client";

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WantButton, GiftButton } from '@/components/AnimatedActionButtons';
import { createClient } from '@/lib/supabase/client';
import type { Review } from '@/lib/types';
import { rakutenAffiliateUrl, rakutenSearchUrl } from '@/lib/rakuten';

interface Comment {
  id: string;
  author_name: string;
  author_icon: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
}

interface VoteState {
  wantCount: number;
  giftCount: number;
  userVotedWant: boolean;
  userVotedGift: boolean;
}

export default function PostDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ img?: string }>;
}) {
  const { id } = use(params);
  const { img } = use(searchParams);
  const router = useRouter();
  const supabase = createClient();

  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const previewImg = img ? decodeURIComponent(img) : '';

  // Vote state
  const [voteState, setVoteState] = useState<VoteState | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginToast, setLoginToast] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [ngError, setNgError] = useState('');
  const [rakutenProduct, setRakutenProduct] = useState<Pick<RakutenItem, 'itemName' | 'itemPrice' | 'mediumImageUrl' | 'shopName'> | null>(null);

  useEffect(() => {
    // Load review
    fetch(`/api/reviews/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Review | null) => {
        setReview(data);
        if (data?.rakutenItemName) {
          setRakutenProduct({
            itemName: data.rakutenItemName,
            itemPrice: data.rakutenItemPrice ?? 0,
            mediumImageUrl: data.rakutenImageUrl ?? '',
            shopName: '',
          });
        }
      })
      .finally(() => setLoading(false));

    // Load vote state
    fetch(`/api/reviews/${id}/like`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: VoteState | null) => { if (data) setVoteState(data); });

    // Load comments
    fetch(`/api/reviews/${id}/comments`)
      .then((res) => res.ok ? res.json() : [])
      .then((data: Comment[]) => setComments(data));

    // Check auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setCurrentUserId(user?.id ?? null);
    });
  }, [id]);

  const handleLike = async (type: 'want' | 'gift') => {
    const res = await fetch(`/api/reviews/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    if (res.ok) {
      const data: VoteState = await res.json();
      setVoteState(data);
      return data;
    }
  };

  const handleRequireLogin = () => {
    setLoginToast(true);
    setTimeout(() => setLoginToast(false), 3000);
  };

  const handleCommentDelete = async (commentId: string) => {
    const res = await fetch(`/api/reviews/${id}/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || submitting) return;
    if (!isLoggedIn) { handleRequireLogin(); return; }
    setSubmitting(true);
    setNgError('');
    const res = await fetch(`/api/reviews/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText }),
    });
    if (res.ok) {
      const newComment: Comment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } else if (res.status === 422) {
      setNgError('不適切な表現が含まれているため送信できません');
    }
    setSubmitting(false);
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!replyText.trim() || submitting) return;
    if (!isLoggedIn) { handleRequireLogin(); return; }
    setSubmitting(true);
    setNgError('');
    const res = await fetch(`/api/reviews/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyText, parent_id: parentId }),
    });
    if (res.ok) {
      const newComment: Comment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setReplyText('');
      setReplyingTo(null);
      setExpandedReplies((prev) => new Set(prev).add(parentId));
    } else if (res.status === 422) {
      setNgError('不適切な表現が含まれているため送信できません');
    }
    setSubmitting(false);
  };

  const images = review?.images?.length
    ? review.images
    : review?.imageUrl
    ? [review.imageUrl]
    : previewImg
    ? [previewImg]
    : [];

  const currentImg = images[activeImage] || previewImg;

  if (!loading && !review) {
    return (
      <div className="max-w-5xl mx-auto w-full py-20 text-center">
        <p className="text-text-main font-bold text-lg">投稿が見つかりませんでした</p>
        <Link href="/" className="mt-4 inline-block px-5 py-2 bg-primary text-white rounded-full text-sm font-bold hover:opacity-90">
          トップへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full py-4">
      {/* Login toast */}
      {loginToast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-text-main text-white px-5 py-3 rounded-full shadow-xl text-sm font-bold flex items-center gap-3">
          <span>ログインが必要です</span>
          <button onClick={() => router.push('/login')} className="bg-white text-text-main px-3 py-1 rounded-full text-xs font-bold">
            ログイン
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-sub mb-6">
        <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
        <span>/</span>
        {review?.scene[0] && (
          <>
            <span className="hover:text-primary transition-colors cursor-pointer">{review.scene[0]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-text-main font-bold line-clamp-1">{review?.title ?? '読み込み中...'}</span>
      </nav>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-8 xl:gap-12 items-start">

        {/* Left: Image Slider */}
        <div className="space-y-4">
          <div className="aspect-[4/5] md:aspect-square w-full bg-background-soft rounded-3xl overflow-hidden border border-border-light relative">
            {currentImg ? (
              <img key={currentImg} src={currentImg} alt={review?.title ?? 'Gift'} className="w-full h-full object-cover animate-fade-in" />
            ) : (
              <div className="w-full h-full bg-border-light animate-pulse" />
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage((p) => (p === 0 ? images.length - 1 : p - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-text-sub hover:text-primary hover:scale-110 transition-all shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveImage((p) => (p === images.length - 1 ? 0 : p + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-text-sub hover:text-primary hover:scale-110 transition-all shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </>
            )}

            {/* Action Buttons */}
            {review && voteState && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 whitespace-nowrap">
                <WantButton
                  initialCount={voteState.wantCount}
                  initialVoted={voteState.userVotedWant}
                  reviewId={review.id}
                  onLike={handleLike}
                  isLoggedIn={isLoggedIn}
                  onRequireLogin={handleRequireLogin}
                />
                <GiftButton
                  initialCount={voteState.giftCount}
                  initialVoted={voteState.userVotedGift}
                  reviewId={review.id}
                  onLike={handleLike}
                  isLoggedIn={isLoggedIn}
                  onRequireLogin={handleRequireLogin}
                />
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeImage ? 'bg-primary w-6' : 'bg-border-light'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="flex flex-col h-full space-y-8">

          {loading && !review ? (
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-border-light" />
                <div className="space-y-1">
                  <div className="h-3 w-24 bg-border-light rounded-full" />
                  <div className="h-2 w-16 bg-border-light rounded-full" />
                </div>
              </div>
              <div className="h-7 w-full bg-border-light rounded-full" />
              <div className="h-7 w-3/4 bg-border-light rounded-full" />
            </div>
          ) : review ? (
            <>
              {/* Author */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Link href={`/user/${review.authorId}`} className="w-10 h-10 rounded-full bg-border-light overflow-hidden hover:opacity-80 transition-opacity flex-shrink-0">
                    <img src={review.authorIcon} alt={review.authorName} className="w-full h-full object-contain p-1" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/user/${review.authorId}`} className="text-sm font-bold text-text-main hover:text-primary transition-colors">{review.authorName}</Link>
                    <p className="text-xs text-text-sub">{new Date(review.createdAt).toLocaleDateString('ja-JP')}</p>
                  </div>
                  {currentUserId === review.authorId && (
                    <Link href={`/post/${review.id}/edit`}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-text-sub border border-border-light px-3 py-1.5 rounded-full hover:border-primary hover:text-primary transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      編集
                    </Link>
                  )}
                </div>

                <p className="text-xs text-text-sub mb-1">{review.title}</p>
                <h1 className="text-2xl font-bold text-text-main leading-tight mb-4">{review.productName}</h1>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-background-soft border border-border-light rounded-full text-xs text-text-sub">{review.price}</span>
                  <span className="px-3 py-1 bg-background-soft border border-border-light rounded-full text-xs text-text-sub">{review.gender}・{review.ageGroup}</span>
                  {review.relationship.map((r) => (
                    <span key={r} className="px-3 py-1 bg-background-soft border border-border-light rounded-full text-xs text-text-sub">{r}</span>
                  ))}
                  {review.scene.map((s) => (
                    <span key={s} className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">{s}</span>
                  ))}
                </div>
              </div>

              {/* Episode */}
              <div className="bg-background-soft rounded-2xl p-6 relative">
                <svg className="absolute -top-3 -left-3 text-primary/20 w-10 h-10" fill="currentColor" viewBox="0 0 32 32">
                  <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-2.2 1.8-4 4-4V8zm14 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-2.2 1.8-4 4-4V8z" />
                </svg>
                <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap relative z-10">{review.episode}</p>
              </div>

              {/* Product Card */}
              <div className="border border-border-light rounded-2xl overflow-hidden bg-white">
                <div className="px-4 pt-4 pb-2">
                  <span className="text-xs font-bold text-primary">ネットショップ</span>
                </div>
                {rakutenProduct ? (
                  <div className="flex gap-3 px-4 pb-4">
                    {rakutenProduct.mediumImageUrl && (
                      <img src={rakutenProduct.mediumImageUrl} alt={rakutenProduct.itemName} className="w-20 h-20 object-cover rounded-xl flex-shrink-0 border border-border-light" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-main line-clamp-2 mb-1">{rakutenProduct.itemName}</p>
                      <p className="text-sm font-bold text-red-500 mb-1">¥{rakutenProduct.itemPrice.toLocaleString()}</p>
                      <p className="text-[10px] text-text-sub">{rakutenProduct.shopName}</p>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pb-4">
                    <p className="text-sm font-bold text-text-main line-clamp-1">{review.productName}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  {review.productUrl && (
                    <a href={review.productUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] py-2 bg-primary text-white rounded-xl text-xs font-bold text-center hover:opacity-90">ショップで見る</a>
                  )}
                  {review.amazonUrl && (
                    <a href={review.amazonUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] py-2 bg-orange-500 text-white rounded-xl text-xs font-bold text-center hover:opacity-90">Amazonで見る</a>
                  )}
                  {review.rakutenUrl ? (
                    <a href={rakutenAffiliateUrl(review.rakutenUrl)} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] py-2 bg-red-500 text-white rounded-xl text-xs font-bold text-center hover:opacity-90">楽天で見る</a>
                  ) : (
                    <a href={rakutenSearchUrl(review.productName)} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] py-2 bg-red-500 text-white rounded-xl text-xs font-bold text-center hover:opacity-90">楽天で探す</a>
                  )}
                </div>
              </div>

              {/* Comment Section */}
              <div className="pt-6 border-t border-border-light">
                <h3 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z" />
                  </svg>
                  コメント・質問
                  <span className="text-text-sub font-normal">({comments.filter(c => !c.parent_id).length})</span>
                </h3>

                {/* NGエラー */}
                {ngError && (
                  <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                    {ngError}
                  </div>
                )}

                {/* Comment input */}
                <div className="flex gap-2 mb-5">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => { setCommentText(e.target.value); setNgError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCommentSubmit(); }}
                    placeholder={isLoggedIn ? '質問や感想を送る...' : 'ログインするとコメントできます'}
                    disabled={!isLoggedIn || submitting}
                    className="flex-1 bg-background-soft border border-border-light rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                  />
                  <button
                    onClick={handleCommentSubmit}
                    disabled={!isLoggedIn || !commentText.trim() || submitting}
                    className="bg-primary text-white p-2 rounded-full hover:bg-primary-hover transition-colors disabled:opacity-40"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
                    </svg>
                  </button>
                </div>

                {/* Comment list (YouTube style) */}
                <div className="space-y-4">
                  {comments.filter(c => !c.parent_id).map((c) => {
                    const replies = comments.filter(r => r.parent_id === c.id);
                    const isExpanded = expandedReplies.has(c.id);
                    const isReplying = replyingTo?.id === c.id;

                    return (
                      <div key={c.id}>
                        {/* Parent comment */}
                        <div className="flex gap-3 group/comment">
                          <Link href={`/user/${c.user_id}`} className="w-8 h-8 rounded-full bg-background-soft overflow-hidden flex-shrink-0 mt-0.5">
                            <img src={c.author_icon} alt={c.author_name} className="w-full h-full object-contain p-1" />
                          </Link>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1">
                              <Link href={`/user/${c.user_id}`} className="text-xs font-bold text-text-main hover:text-primary transition-colors">
                                {c.author_name}
                              </Link>
                              <span className="text-[10px] text-text-sub">
                                {new Date(c.created_at).toLocaleDateString('ja-JP')}
                              </span>
                              {currentUserId === c.user_id && (
                                <button onClick={() => handleCommentDelete(c.id)}
                                  className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity text-text-sub hover:text-red-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-text-main leading-relaxed">{c.content}</p>
                            {/* Reply button */}
                            {isLoggedIn && (
                              <button
                                onClick={() => {
                                  setReplyingTo(isReplying ? null : { id: c.id, name: c.author_name });
                                  setReplyText('');
                                  setNgError('');
                                }}
                                className="mt-1.5 text-xs text-text-sub hover:text-primary transition-colors font-medium"
                              >
                                返信
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reply input */}
                        {isReplying && (
                          <div className="ml-11 mt-2 flex gap-2">
                            <input
                              autoFocus
                              type="text"
                              value={replyText}
                              onChange={(e) => { setReplyText(e.target.value); setNgError(''); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleReplySubmit(c.id); if (e.key === 'Escape') { setReplyingTo(null); setReplyText(''); } }}
                              placeholder={`${c.author_name}さんへ返信...`}
                              className="flex-1 bg-background-soft border border-primary/40 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                            />
                            <button onClick={() => handleReplySubmit(c.id)} disabled={!replyText.trim() || submitting}
                              className="bg-primary text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-primary-hover disabled:opacity-40 transition-colors">
                              送信
                            </button>
                            <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="text-xs text-text-sub hover:text-text-main px-2">
                              キャンセル
                            </button>
                          </div>
                        )}

                        {/* Replies toggle + list */}
                        {replies.length > 0 && (
                          <div className="ml-11 mt-2">
                            <button
                              onClick={() => setExpandedReplies((prev) => {
                                const next = new Set(prev);
                                next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                return next;
                              })}
                              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"
                                className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                              </svg>
                              {isExpanded ? '返信を非表示' : `${replies.length}件の返信`}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 space-y-3 border-l-2 border-border-light pl-3">
                                {replies.map((r) => (
                                  <div key={r.id} className="flex gap-2 group/reply">
                                    <Link href={`/user/${r.user_id}`} className="w-6 h-6 rounded-full bg-background-soft overflow-hidden flex-shrink-0 mt-0.5">
                                      <img src={r.author_icon} alt={r.author_name} className="w-full h-full object-contain p-0.5" />
                                    </Link>
                                    <div className="flex-1">
                                      <div className="flex items-baseline gap-2 mb-0.5">
                                        <Link href={`/user/${r.user_id}`} className="text-xs font-bold text-text-main hover:text-primary transition-colors">
                                          {r.author_name}
                                        </Link>
                                        <span className="text-[10px] text-text-sub">
                                          {new Date(r.created_at).toLocaleDateString('ja-JP')}
                                        </span>
                                        {currentUserId === r.user_id && (
                                          <button onClick={() => handleCommentDelete(r.id)}
                                            className="ml-auto opacity-0 group-hover/reply:opacity-100 transition-opacity text-text-sub hover:text-red-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                                              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                                              <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-xs text-text-main leading-relaxed">{r.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
