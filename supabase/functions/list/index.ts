import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const supabase = userClient(req);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('lists').select(`
      id, title, body, author_name, author_icon, created_at, user_id, status,
      list_items ( id, review_id, position, snapshot_title, snapshot_product_name, snapshot_image_url, snapshot_author_name, comment )
    `).eq('id', id).single();

    if (error || !data) return json({ error: 'Not found' }, 404);
    return json({ ...data, list_items: (data.list_items ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position) });
  }

  if (req.method === 'PATCH') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: existing } = await supabase.from('lists').select('user_id').eq('id', id).single();
    if (!existing || existing.user_id !== user.id) return json({ error: 'Forbidden' }, 403);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty ok */ }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.body !== undefined) updates.body = body.body;
    if (body.status !== undefined) updates.status = body.status;

    const { data: updated, error } = await supabase.from('lists').update(updates).eq('id', id).select().single();
    if (error) return json({ error: error.message }, 500);
    return json(updated);
  }

  if (req.method === 'DELETE') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: existing } = await supabase.from('lists').select('user_id').eq('id', id).single();
    if (!existing || existing.user_id !== user.id) return json({ error: 'Forbidden' }, 403);

    const { error } = await supabase.from('lists').delete().eq('id', id);
    if (error) return json({ error: error.message }, 500);
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, 405);
});
