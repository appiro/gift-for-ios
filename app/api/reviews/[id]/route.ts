import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

function toReview(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    brandName: row.brand_name,
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
    rakutenImageUrl: row.rakuten_image_url,
    rakutenItemName: row.rakuten_item_name,
    rakutenItemPrice: row.rakuten_item_price,
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

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/reviews/[id]'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: existing } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('id', id)
    .single();
  if (!existing || existing.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.brandName !== undefined) updates.brand_name = body.brandName;
  if (body.title !== undefined) updates.title = body.title;
  if (body.productName !== undefined) updates.product_name = body.productName;
  if (body.price !== undefined) updates.price = body.price;
  if (body.episode !== undefined) updates.episode = body.episode;
  if (body.relationship !== undefined) updates.relationship = body.relationship;
  if (body.scene !== undefined) updates.scene = body.scene;
  if (body.category !== undefined) updates.category = body.category;
  if (body.productUrl !== undefined) updates.product_url = body.productUrl;
  if (body.rakutenUrl !== undefined) updates.rakuten_url = body.rakutenUrl;
  if (body.rakutenImageUrl !== undefined) updates.rakuten_image_url = body.rakutenImageUrl;
  if (body.rakutenItemName !== undefined) updates.rakuten_item_name = body.rakutenItemName;
  if (body.rakutenItemPrice !== undefined) updates.rakuten_item_price = body.rakutenItemPrice;
  if (body.images !== undefined) updates.images = body.images;
  if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;
  if (body.priceCategory !== undefined) {
    updates.price = body.priceCategory
      ? `〜${Number(body.priceCategory).toLocaleString()}円`
      : '不明';
  }

  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(toReview(data as Record<string, unknown>));
}
