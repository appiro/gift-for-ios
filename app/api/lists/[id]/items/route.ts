import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/lists/[id]/items'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('list_items')
    .select('id, review_id, position, snapshot_title, snapshot_product_name, snapshot_image_url, snapshot_author_name, comment')
    .eq('list_id', id)
    .order('position', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data ?? []);
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/lists/[id]/items'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: list } = await supabase
    .from('lists')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!list || list.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { review_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { review_id } = body;
  if (!review_id) {
    return Response.json({ error: 'review_id is required' }, { status: 400 });
  }

  // Fetch review for snapshot data
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select('title, product_name, image_url, author_name')
    .eq('id', review_id)
    .single();

  if (reviewError || !review) {
    return Response.json({ error: 'Review not found' }, { status: 404 });
  }

  // Calculate next position
  const { data: maxPositionRow } = await supabase
    .from('list_items')
    .select('position')
    .eq('list_id', id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const nextPosition = maxPositionRow ? maxPositionRow.position + 1 : 1;

  const { data: item, error: insertError } = await supabase
    .from('list_items')
    .insert({
      list_id: id,
      review_id,
      position: nextPosition,
      snapshot_title: review.title,
      snapshot_product_name: review.product_name,
      snapshot_image_url: review.image_url,
      snapshot_author_name: review.author_name,
      comment: '',
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json(item, { status: 201 });
}
