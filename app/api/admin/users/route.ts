import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createAdminClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, icon_url, role, banned_at, created_at')
    .order('created_at', { ascending: false });

  if (!profiles) return Response.json([]);

  const { data: reviewCounts } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('status', 'published');

  const countMap: Record<string, number> = {};
  reviewCounts?.forEach((r: { user_id: string }) => {
    countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1;
  });

  return Response.json(profiles.map((p) => ({
    id: p.id,
    displayName: p.display_name ?? 'ゲスト',
    iconUrl: p.icon_url ?? '/icons/cat.png',
    role: p.role ?? 'user',
    bannedAt: p.banned_at ?? null,
    createdAt: p.created_at,
    reviewCount: countMap[p.id] ?? 0,
  })));
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createAdminClient();
  const body = await req.json() as { id: string; action: 'ban' | 'unban' | 'setAdmin' | 'removeAdmin' };
  const { id, action } = body;

  let update: Record<string, unknown> = {};
  if (action === 'ban') update = { banned_at: new Date().toISOString() };
  else if (action === 'unban') update = { banned_at: null };
  else if (action === 'setAdmin') update = { role: 'admin' };
  else if (action === 'removeAdmin') update = { role: 'user' };

  const { error } = await supabase.from('profiles').update(update).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
