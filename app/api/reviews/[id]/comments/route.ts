import { createClient } from '@/lib/supabase/server';
import { containsNgWord } from '@/lib/wordFilter';
import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/reviews/[id]/comments'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .select('id, author_name, author_icon, content, created_at, user_id, parent_id')
    .eq('review_id', id)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data ?? []);
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/reviews/[id]/comments'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { content, parent_id } = body as { content: string; parent_id?: string };

  if (!content?.trim()) return Response.json({ error: '内容を入力してください' }, { status: 400 });

  // NGワードチェック
  if (containsNgWord(content)) {
    return Response.json({ error: '不適切な表現が含まれています' }, { status: 422 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, icon_url')
    .eq('id', user.id)
    .single();

  const authorName = profile?.display_name ?? user.email?.split('@')[0] ?? 'ゲスト';
  const authorIcon = profile?.icon_url ?? '/icons/cat.png';

  const { data, error } = await supabase
    .from('comments')
    .insert({
      review_id: id,
      user_id: user.id,
      author_name: authorName,
      author_icon: authorIcon,
      content: content.trim(),
      parent_id: parent_id ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 通知を作成
  try {
    if (parent_id) {
      // 返信：親コメントの投稿者に通知
      const { data: parentComment } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', parent_id)
        .single();

      if (parentComment && parentComment.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: parentComment.user_id,
          type: 'reply',
          review_id: id,
          comment_id: data.id,
          actor_name: authorName,
          actor_icon: authorIcon,
          message: `${authorName}さんがあなたのコメントに返信しました`,
        });
      }
    } else {
      // 新規コメント：レビュー投稿者に通知
      const { data: review } = await supabase
        .from('reviews')
        .select('user_id')
        .eq('id', id)
        .single();

      if (review && review.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: review.user_id,
          type: 'comment',
          review_id: id,
          comment_id: data.id,
          actor_name: authorName,
          actor_icon: authorIcon,
          message: `${authorName}さんがあなたの投稿にコメントしました`,
        });
      }
    }
  } catch {
    // 通知失敗はサイレントに無視
  }

  return Response.json(data, { status: 201 });
}
