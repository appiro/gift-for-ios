import { corsResponse, json } from '../_shared/cors.ts';
import { userClient, adminClient } from '../_shared/supabase.ts';

async function requireAdmin(req: Request) {
  const supabase = userClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();
  if (!await requireAdmin(req)) return json({ error: 'Forbidden' }, 403);

  const supabase = adminClient();

  if (req.method === 'GET') {
    const page = parseInt(new URL(req.url).searchParams.get('page') ?? '1');
    const limit = 30;
    const from = (page - 1) * limit;

    const { data, count } = await supabase.from('reviews')
      .select('id, title, product_name, image_url, author_name, user_id, status, created_at, want_count, gift_count', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    return json({ reviews: data ?? [], total: count ?? 0 });
  }

  if (req.method === 'DELETE') {
    const { id } = await req.json() as { id: string };
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
});
