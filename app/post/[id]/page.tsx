import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import PostDetailClient from './PostDetailClient';
import type { Metadata } from 'next';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('reviews')
    .select('title, product_name, episode, image_url, author_name')
    .eq('id', id)
    .single();

  if (!data) {
    return { title: 'Gift for' };
  }

  const title = `${data.title} | Gift for`;
  const description = data.episode
    ? data.episode.slice(0, 120) + (data.episode.length > 120 ? '…' : '')
    : `${data.product_name ?? ''} のギフト体験談`;
  const image = data.image_url ?? 'https://giftfor.info/icons/icon-512.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://giftfor.info/post/${id}`,
      images: [{ url: image, width: 800, height: 800, alt: data.title }],
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
  return (
    <Suspense>
      <PostDetailClient params={params} />
    </Suspense>
  );
}
