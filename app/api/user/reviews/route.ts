import { createClient } from '@/lib/supabase/server';

function toReview(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    productName: row.product_name,
    price: row.price,
    imageUrl: row.image_url,
    images: row.images ?? [],
    episode: row.episode,
    likes: row.likes ?? 0,
    wantCount: row.want_count ?? 0,
    giftCount: row.gift_count ?? 0,
    gender: row.gender,
    ageGroup: row.age_group,
    relationship: row.relationship ?? [],
    scene: row.scene ?? [],
    category: row.category ?? [],
    authorName: row.author_name,
    authorIcon: row.author_icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
  };
}

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json((data ?? []).map(toReview));
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, status } = body as { id: string; status: string };

  if (!['published', 'private', 'draft', 'trash'].includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('reviews')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
