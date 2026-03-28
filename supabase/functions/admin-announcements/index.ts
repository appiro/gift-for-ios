import { corsResponse, json } from '../_shared/cors.ts';
import { userClient, adminClient } from '../_shared/supabase.ts';

async function requireAdmin(req: Request) {
  const supabase = userClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (data?.role !== 'admin') return null;
  return { userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const admin = await requireAdmin(req);
  if (!admin) return json({ error: 'Forbidden' }, 403);

  const supabase = adminClient();

  if (req.method === 'GET') {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    return json(data ?? []);
  }

  if (req.method === 'POST') {
    const body = await req.json() as { title: string; body: string; type?: string };
    const { data, error } = await supabase.from('announcements')
      .insert({ title: body.title, body: body.body, type: body.type ?? 'info', created_by: admin.userId })
      .select().single();
    if (error) return json({ error: error.message }, 500);
    return json(data, 201);
  }

  if (req.method === 'DELETE') {
    const { id } = await req.json() as { id: string };
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
});
