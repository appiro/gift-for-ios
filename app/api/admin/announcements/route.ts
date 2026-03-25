import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createAdminClient();
  const body = await req.json() as { title: string; body: string; type?: string };

  const { data, error } = await supabase
    .from('announcements')
    .insert({ title: body.title, body: body.body, type: body.type ?? 'info', created_by: admin.userId })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createAdminClient();
  const { id } = await req.json() as { id: string };

  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
