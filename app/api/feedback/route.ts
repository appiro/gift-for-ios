import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/adminAuth';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { message } = await req.json();
  if (!message?.trim()) {
    return Response.json({ error: 'メッセージを入力してください' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from('feedback').insert({
    message: message.trim(),
    user_id: user?.id ?? null,
  });

  if (error) return Response.json({ error: 'エラーが発生しました' }, { status: 500 });
  return Response.json({ ok: true });
}

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('feedback')
    .select('id, message, user_id, created_at')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: 'エラーが発生しました' }, { status: 500 });
  return Response.json(data);
}
