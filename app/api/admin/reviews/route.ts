import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createAdminClient();
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = 30;
  const from = (page - 1) * limit;

  const { data, count } = await supabase
    .from('reviews')
    .select('id, title, product_name, image_url, author_name, user_id, status, created_at, want_count, gift_count', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  return Response.json({ reviews: data ?? [], total: count ?? 0 });
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createAdminClient();
  const { id } = await req.json() as { id: string };

  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
