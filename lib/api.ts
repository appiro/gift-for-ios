import { createClient } from '@/lib/supabase/client';

const FN_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

/** Edge FunctionのURLを構築する */
function fnUrl(name: string, params?: Record<string, string>): string {
  const url = new URL(`${FN_BASE}/${name}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

/** 認証トークン付きでfetchする */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

// ---- Reviews ----
export const reviewsUrl = (params?: Record<string, string>) => fnUrl('reviews', params);
export const reviewUrl = (id: string) => fnUrl('review', { id });
export const reviewLikeUrl = (id: string) => fnUrl('review-like', { id });
export const reviewCommentsUrl = (id: string) => fnUrl('review-comments', { id });
export const reviewCommentUrl = (commentId: string) => fnUrl('review-comment', { commentId });

// ---- Lists ----
export const listsUrl = (params?: Record<string, string>) => fnUrl('lists', params);
export const listUrl = (id: string) => fnUrl('list', { id });
export const listItemsUrl = (id: string) => fnUrl('list-items', { id });
export const listItemUrl = (id: string, itemId: string) => fnUrl('list-item', { id, itemId });

// ---- User ----
export const userProfileUrl = () => fnUrl('user-profile');
export const userPageUrl = (userId: string) => fnUrl('user-page', { userId });
export const userReviewsUrl = () => fnUrl('user-reviews');

// ---- Other ----
export const notificationsUrl = () => fnUrl('notifications');
export const productsUrl = (q: string) => fnUrl('products', { q });
export const rakutenSearchUrl = (q: string) => fnUrl('rakuten-search', { q });
export const feedbackUrl = () => fnUrl('feedback');

// ---- Admin ----
export const adminStatsUrl = () => fnUrl('admin-stats');
export const adminUsersUrl = () => fnUrl('admin-users');
export const adminReviewsUrl = (params?: Record<string, string>) => fnUrl('admin-reviews', params);
export const adminAnnouncementsUrl = () => fnUrl('admin-announcements');

export { apiFetch };
