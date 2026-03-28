import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

interface RakutenItem {
  Item: {
    itemName: string; itemUrl: string; affiliateUrl: string;
    mediumImageUrls: { imageUrl: string }[]; shopName: string; itemCode: string;
  };
}

async function searchRakuten(keyword: string): Promise<RakutenItem[]> {
  const appId = Deno.env.get('RAKUTEN_APP_ID');
  const affiliateId = Deno.env.get('RAKUTEN_AFFILIATE_ID');
  if (!appId) return [];

  const params = new URLSearchParams({ applicationId: appId, keyword, hits: '3', format: 'json' });
  if (affiliateId) params.set('affiliateId', affiliateId);

  try {
    const res = await fetch(`https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items ?? []) as RakutenItem[];
  } catch { return []; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const supabase = userClient(req);
  const q = new URL(req.url).searchParams.get('q') ?? '';
  if (!q) return json([]);

  const { data: dbResults } = await supabase.from('products')
    .select('id, name, brand, image_url, tags').ilike('name', `%${q}%`).order('name').limit(3);

  if (dbResults && dbResults.length >= 3) return json(dbResults);

  const rakutenItems = await searchRakuten(q);
  if (rakutenItems.length === 0) return json(dbResults ?? []);

  const toInsert = rakutenItems.map(({ Item }) => ({
    name: Item.itemName, brand: Item.shopName || null,
    image_url: Item.mediumImageUrls?.[0]?.imageUrl ?? null,
    rakuten_url: Item.affiliateUrl || Item.itemUrl || null,
    rakuten_item_code: Item.itemCode, tags: [],
  }));

  const { data: saved } = await supabase.from('products')
    .upsert(toInsert, { onConflict: 'rakuten_item_code' }).select('id, name, brand, image_url, tags');

  const existingIds = new Set((dbResults ?? []).map((p) => p.id));
  const merged = [
    ...(dbResults ?? []),
    ...(saved ?? []).filter((p) => !existingIds.has(p.id)),
  ].slice(0, 3);

  return json(merged);
});
