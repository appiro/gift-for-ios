import { createClient } from '@/lib/supabase/server';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://giftfor.info';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/lists`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const supabase = await createClient();

    const [reviewsRes, listsRes] = await Promise.all([
      supabase
        .from('reviews')
        .select('id, updated_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('lists')
        .select('id, updated_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    const reviewRoutes: MetadataRoute.Sitemap = (reviewsRes.data ?? []).map((r) => ({
      url: `${base}/post/${r.id}`,
      lastModified: new Date(r.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const listRoutes: MetadataRoute.Sitemap = (listsRes.data ?? []).map((l) => ({
      url: `${base}/lists/${l.id}`,
      lastModified: new Date(l.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...reviewRoutes, ...listRoutes];
  } catch {
    return staticRoutes;
  }
}
