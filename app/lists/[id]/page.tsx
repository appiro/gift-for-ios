import { createClient } from '@/lib/supabase/server';
import ListDetailClient from './ListDetailClient';
import type { Metadata } from 'next';

function interpolate(text: string, count: number): string {
  return text.replace(/\{n\}/g, String(count));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('lists')
    .select(`
      title, body, author_name,
      list_items ( review_id, snapshot_image_url )
    `)
    .eq('id', id)
    .single();

  if (!data) {
    return { title: 'Gift for' };
  }

  const activeItems = (data.list_items as any[]).filter((i) => i.review_id);
  const activeCount = activeItems.length;
  const displayTitle = interpolate(data.title, activeCount);
  const displayBody = interpolate(data.body ?? '', activeCount);

  const title = `${displayTitle || 'まとめ投稿'} | Gift for`;
  const description = displayBody
    ? displayBody.slice(0, 120) + (displayBody.length > 120 ? '…' : '')
    : `${activeCount}個のギフト体験談をまとめたリストです。`;
  const image =
    activeItems[0]?.snapshot_image_url ?? 'https://giftfor.info/icons/icon-512.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://giftfor.info/lists/${id}`,
      images: [{ url: image, width: 800, height: 800, alt: displayTitle }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ListDetailClient params={params} />;
}
