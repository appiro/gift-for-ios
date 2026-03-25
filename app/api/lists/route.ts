import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get('userId');

  let query = supabase
    .from('lists')
    .select(`
      id,
      title,
      body,
      author_name,
      author_icon,
      created_at,
      user_id,
      status,
      list_items (
        id,
        review_id,
        position,
        snapshot_title,
        snapshot_product_name,
        snapshot_image_url,
        snapshot_author_name,
        comment
      )
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Sort list_items by position for each list
  const lists = (data ?? []).map((list) => ({
    ...list,
    list_items: (list.list_items ?? []).sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    ),
  }));

  return Response.json(lists);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { title?: string; body_text?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { title = '', body: bodyField, status = 'draft' } = body as {
    title?: string;
    body?: string;
    status?: string;
  };

  // Get profile info
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, icon_url')
    .eq('id', user.id)
    .single();

  const author_name = profile?.display_name ?? user.email ?? 'ユーザー';
  const author_icon = profile?.icon_url ?? '/icons/cat.png';

  const { data: list, error } = await supabase
    .from('lists')
    .insert({
      title,
      body: bodyField ?? '',
      status,
      user_id: user.id,
      author_name,
      author_icon,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(list, { status: 201 });
}
