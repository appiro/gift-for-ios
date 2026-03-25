import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/lists/[id]'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lists')
    .select(`
      id,
      title,
      body,
      author_name,
      author_icon,
      created_at,
      user_id,
      status,
      list_items (
        id,
        review_id,
        position,
        snapshot_title,
        snapshot_product_name,
        snapshot_image_url,
        snapshot_author_name,
        comment
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const list = {
    ...data,
    list_items: (data.list_items ?? []).sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    ),
  };

  return Response.json(list);
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/lists/[id]'>
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
  const { data: existing } = await supabase
    .from('lists')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.body !== undefined) updates.body = body.body;
  if (body.status !== undefined) updates.status = body.status;

  const { data: updated, error } = await supabase
    .from('lists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/lists/[id]'>
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
  const { data: existing } = await supabase
    .from('lists')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('lists').delete().eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
