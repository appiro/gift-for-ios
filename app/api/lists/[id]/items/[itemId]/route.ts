import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/lists/[id]/items/[itemId]'>
) {
  const { id, itemId } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify list ownership
  const { data: list } = await supabase
    .from('lists')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!list || list.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const updates: Record<string, unknown> = {};
  if (body.comment !== undefined) updates.comment = body.comment;
  if (body.position !== undefined) updates.position = body.position;

  const { data: updated, error } = await supabase
    .from('list_items')
    .update(updates)
    .eq('id', itemId)
    .eq('list_id', id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/lists/[id]/items/[itemId]'>
) {
  const { id, itemId } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify list ownership
  const { data: list } = await supabase
    .from('lists')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!list || list.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', itemId)
    .eq('list_id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
