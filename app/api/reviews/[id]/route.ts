import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

function toReview(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    productName: row.product_name,
    price: row.price,
    imageUrl: row.image_url,
    images: row.images ?? [],
    episode: row.episode,
    likes: row.likes ?? 0,
    wantCount: row.want_count ?? 0,
    giftCount: row.gift_count ?? 0,
    gender: row.gender,
    ageGroup: row.age_group,
    relationship: row.relationship ?? [],
    scene: row.scene ?? [],
    category: row.category ?? [],
    authorId: row.user_id,
    authorName: row.author_name,
    authorIcon: row.author_icon,
    createdAt: row.created_at,
    productUrl: row.product_url,
    amazonUrl: row.amazon_url,
    rakutenUrl: row.rakuten_url,
    referencePrice: row.reference_price,
  };
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/reviews/[id]'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json(toReview(data as Record<string, unknown>));
}
