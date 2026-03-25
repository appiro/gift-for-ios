import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/reviews/[id]/like'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: review } = await supabase
    .from('reviews')
    .select('want_count, gift_count')
    .eq('id', id)
    .single();

  let userVotedWant = false;
  let userVotedGift = false;

  if (user) {
    const { data: votes } = await supabase
      .from('review_votes')
      .select('type')
      .eq('review_id', id)
      .eq('user_id', user.id);

    userVotedWant = votes?.some((v) => v.type === 'want') ?? false;
    userVotedGift = votes?.some((v) => v.type === 'gift') ?? false;
  }

  return Response.json({
    wantCount: review?.want_count ?? 0,
    giftCount: review?.gift_count ?? 0,
    userVotedWant,
    userVotedGift,
  });
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/reviews/[id]/like'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await request.json();
  if (type !== 'want' && type !== 'gift') {
    return Response.json({ error: 'type must be "want" or "gift"' }, { status: 400 });
  }

  const column = type === 'want' ? 'want_count' : 'gift_count';

  // Check if already voted
  const { data: existing } = await supabase
    .from('review_votes')
    .select('review_id')
    .eq('review_id', id)
    .eq('user_id', user.id)
    .eq('type', type)
    .single();

  const { data: current } = await supabase
    .from('reviews')
    .select(column)
    .eq('id', id)
    .single();

  const currentVal = (current as Record<string, number> | null)?.[column] ?? 0;

  if (existing) {
    // Toggle OFF: remove vote + decrement
    await supabase
      .from('review_votes')
      .delete()
      .eq('review_id', id)
      .eq('user_id', user.id)
      .eq('type', type);

    await supabase
      .from('reviews')
      .update({ [column]: Math.max(0, currentVal - 1) })
      .eq('id', id);
  } else {
    // Toggle ON: add vote + increment
    await supabase
      .from('review_votes')
      .insert({ review_id: id, user_id: user.id, type });

    await supabase
      .from('reviews')
      .update({ [column]: currentVal + 1 })
      .eq('id', id);

    // 通知：レビュー投稿者に保存を通知（自分以外）
    try {
      const { data: review } = await supabase
        .from('reviews')
        .select('user_id')
        .eq('id', id)
        .single();
      if (review && review.user_id !== user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, icon_url')
          .eq('id', user.id)
          .single();
        const actorName = profile?.display_name ?? user.email?.split('@')[0] ?? 'ゲスト';
        const label = type === 'want' ? '欲しい！' : '贈りたい！';
        await supabase.from('notifications').insert({
          user_id: review.user_id,
          type: 'save',
          review_id: id,
          actor_name: actorName,
          actor_icon: profile?.icon_url ?? '/icons/cat.png',
          message: `${actorName}さんがあなたの投稿に「${label}」しました`,
        });
      }
    } catch { /* サイレントに無視 */ }
  }

  // Return updated state
  const { data: updated } = await supabase
    .from('reviews')
    .select('want_count, gift_count')
    .eq('id', id)
    .single();

  const { data: votes } = await supabase
    .from('review_votes')
    .select('type')
    .eq('review_id', id)
    .eq('user_id', user.id);

  return Response.json({
    wantCount: updated?.want_count ?? 0,
    giftCount: updated?.gift_count ?? 0,
    userVotedWant: votes?.some((v) => v.type === 'want') ?? false,
    userVotedGift: votes?.some((v) => v.type === 'gift') ?? false,
  });
}
