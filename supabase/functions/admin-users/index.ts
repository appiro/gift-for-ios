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
    const { data: profiles } = await supabase.from('profiles')
      .select('id, display_name, icon_url, role, banned_at, created_at')
      .order('created_at', { ascending: false });

    if (!profiles) return json([]);

    const { data: reviewCounts } = await supabase.from('reviews').select('user_id').eq('status', 'published');
    const countMap: Record<string, number> = {};
    reviewCounts?.forEach((r: { user_id: string }) => { countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1; });

    return json(profiles.map((p) => ({
      id: p.id, displayName: p.display_name ?? 'ゲスト', iconUrl: p.icon_url ?? '/icons/cat.png',
      role: p.role ?? 'user', bannedAt: p.banned_at ?? null, createdAt: p.created_at,
      reviewCount: countMap[p.id] ?? 0,
    })));
  }

  if (req.method === 'PATCH') {
    const { id, action } = await req.json() as { id: string; action: 'ban' | 'unban' | 'setAdmin' | 'removeAdmin' };
    let update: Record<string, unknown> = {};
    if (action === 'ban') update = { banned_at: new Date().toISOString() };
    else if (action === 'unban') update = { banned_at: null };
    else if (action === 'setAdmin') update = { role: 'admin' };
    else if (action === 'removeAdmin') update = { role: 'user' };

    const { error } = await supabase.from('profiles').update(update).eq('id', id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
});
