import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/reviews/[id]/comments/[commentId]'>
) {
  const { commentId } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id); // 自分のコメントのみ削除可能

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
