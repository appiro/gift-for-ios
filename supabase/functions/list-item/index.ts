import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const supabase = userClient(req);
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const itemId = url.searchParams.get('itemId');
  if (!id || !itemId) return json({ error: 'id and itemId are required' }, 400);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { data: list } = await supabase.from('lists').select('user_id').eq('id', id).single();
  if (!list || list.user_id !== user.id) return json({ error: 'Forbidden' }, 403);

  if (req.method === 'PATCH') {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty ok */ }

    const updates: Record<string, unknown> = {};
    if (body.comment !== undefined) updates.comment = body.comment;
    if (body.position !== undefined) updates.position = body.position;

    const { data: updated, error } = await supabase.from('list_items')
      .update(updates).eq('id', itemId).eq('list_id', id).select().single();
    if (error) return json({ error: error.message }, 500);
    return json(updated);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('list_items').delete().eq('id', itemId).eq('list_id', id);
    if (error) return json({ error: error.message }, 500);
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, 405);
});
