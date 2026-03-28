import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';
import { containsNgWord } from '../_shared/word-filter.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const supabase = userClient(req);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('comments')
      .select('id, author_name, author_icon, content, created_at, user_id, parent_id')
      .eq('review_id', id)
      .order('created_at', { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json(data ?? []);
  }

  if (req.method === 'POST') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { content, parent_id } = body as { content: string; parent_id?: string };

    if (!content?.trim()) return json({ error: '内容を入力してください' }, 400);
    if (containsNgWord(content)) return json({ error: '不適切な表現が含まれています' }, 422);

    const { data: profile } = await supabase.from('profiles').select('display_name, icon_url').eq('id', user.id).single();
    const authorName = profile?.display_name ?? user.email?.split('@')[0] ?? 'ゲスト';
    const authorIcon = profile?.icon_url ?? '/icons/cat.png';

    const { data, error } = await supabase.from('comments').insert({
      review_id: id, user_id: user.id,
      author_name: authorName, author_icon: authorIcon,
      content: content.trim(), parent_id: parent_id ?? null,
    }).select().single();

    if (error) return json({ error: error.message }, 500);

    try {
      if (parent_id) {
        const { data: parentComment } = await supabase.from('comments').select('user_id').eq('id', parent_id).single();
        if (parentComment && parentComment.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: parentComment.user_id, type: 'reply', review_id: id, comment_id: data.id,
            actor_name: authorName, actor_icon: authorIcon,
            message: `${authorName}さんがあなたのコメントに返信しました`,
          });
        }
      } else {
        const { data: review } = await supabase.from('reviews').select('user_id').eq('id', id).single();
        if (review && review.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: review.user_id, type: 'comment', review_id: id, comment_id: data.id,
            actor_name: authorName, actor_icon: authorIcon,
            message: `${authorName}さんがあなたの投稿にコメントしました`,
          });
        }
      }
    } catch { /* silent */ }

    return json(data, 201);
  }

  return json({ error: 'Method not allowed' }, 405);
});
