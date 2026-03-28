import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const supabase = userClient(req);
  const userId = new URL(req.url).searchParams.get('userId');

  if (req.method === 'GET') {
    let query = supabase.from('lists').select(`
      id, title, body, author_name, author_icon, created_at, user_id, status,
      list_items ( id, review_id, position, snapshot_title, snapshot_product_name, snapshot_image_url, snapshot_author_name, comment )
    `).order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    else query = query.eq('status', 'published');

    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500);

    const lists = (data ?? []).map((list) => ({
      ...list,
      list_items: (list.list_items ?? []).sort(
        (a: { position: number }, b: { position: number }) => a.position - b.position
      ),
    }));
    return json(lists);
  }

  if (req.method === 'POST') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    let body: { title?: string; body?: string; status?: string } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const { data: profile } = await supabase.from('profiles').select('display_name, icon_url').eq('id', user.id).single();

    const { data: list, error } = await supabase.from('lists').insert({
      title: body.title ?? '',
      body: body.body ?? '',
      status: body.status ?? 'draft',
      user_id: user.id,
      author_name: profile?.display_name ?? user.email ?? 'ユーザー',
      author_icon: profile?.icon_url ?? '/icons/cat.png',
    }).select().single();

    if (error) return json({ error: error.message }, 500);
    return json(list, 201);
  }

  return json({ error: 'Method not allowed' }, 405);
});
