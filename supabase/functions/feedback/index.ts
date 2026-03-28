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

  if (req.method === 'POST') {
    const { message } = await req.json();
    if (!message?.trim()) return json({ error: 'メッセージを入力してください' }, 400);

    const supabase = userClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    const admin = adminClient();
    const { error } = await admin.from('feedback').insert({ message: message.trim(), user_id: user?.id ?? null });
    if (error) return json({ error: 'エラーが発生しました' }, 500);
    return json({ ok: true });
  }

  if (req.method === 'GET') {
    if (!await requireAdmin(req)) return json({ error: 'Forbidden' }, 403);
    const admin = adminClient();
    const { data, error } = await admin.from('feedback')
      .select('id, message, user_id, created_at').order('created_at', { ascending: false });
    if (error) return json({ error: 'エラーが発生しました' }, 500);
    return json(data);
  }

  return json({ error: 'Method not allowed' }, 405);
});
