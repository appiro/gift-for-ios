import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return Response.json(profile ?? { id: user.id, email: user.email });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...body });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Sync author_name in reviews and lists when display_name changes
  if (body.display_name) {
    await supabase.from('reviews').update({ author_name: body.display_name }).eq('user_id', user.id);
    await supabase.from('lists').update({ author_name: body.display_name }).eq('user_id', user.id);
  }
  if (body.icon_url) {
    await supabase.from('reviews').update({ author_icon: body.icon_url }).eq('user_id', user.id);
    await supabase.from('lists').update({ author_icon: body.icon_url }).eq('user_id', user.id);
  }

  return Response.json({ ok: true });
}
