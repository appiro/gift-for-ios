import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const supabase = userClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  if (req.method === 'GET') {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return json(profile ?? { id: user.id, email: user.email });
  }

  if (req.method === 'PATCH') {
    const body = await req.json();
    const { error } = await supabase.from('profiles').upsert({ id: user.id, ...body });
    if (error) return json({ error: error.message }, 500);

    if (body.display_name) {
      await supabase.from('reviews').update({ author_name: body.display_name }).eq('user_id', user.id);
      await supabase.from('lists').update({ author_name: body.display_name }).eq('user_id', user.id);
    }
    if (body.icon_url) {
      await supabase.from('reviews').update({ author_icon: body.icon_url }).eq('user_id', user.id);
      await supabase.from('lists').update({ author_icon: body.icon_url }).eq('user_id', user.id);
    }

    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
});
