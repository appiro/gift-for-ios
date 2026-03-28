import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();
  if (req.method !== 'DELETE') return json({ error: 'Method not allowed' }, 405);

  const supabase = userClient(req);
  const commentId = new URL(req.url).searchParams.get('commentId');
  if (!commentId) return json({ error: 'commentId is required' }, 400);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
