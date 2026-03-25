import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

interface RakutenItem {
  Item: {
    itemName: string;
    itemUrl: string;
    affiliateUrl: string;
    mediumImageUrls: { imageUrl: string }[];
    shopName: string;
    itemCode: string;
  };
}

async function searchRakuten(keyword: string): Promise<RakutenItem[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  if (!appId) return [];

  const params = new URLSearchParams({
    applicationId: appId,
    keyword,
    hits: '3',
    format: 'json',
  });
  if (affiliateId) params.set('affiliateId', affiliateId);

  try {
    const res = await fetch(
      `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items ?? []) as RakutenItem[];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const q = request.nextUrl.searchParams.get('q') ?? '';

  if (!q) return Response.json([]);

  // 1. まずローカルDBを検索
  const { data: dbResults } = await supabase
    .from('products')
    .select('id, name, brand, image_url, tags')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(3);

  if (dbResults && dbResults.length >= 3) {
    return Response.json(dbResults);
  }

  // 2. 楽天APIにフォールバック
  const rakutenItems = await searchRakuten(q);
  if (rakutenItems.length === 0) {
    return Response.json(dbResults ?? []);
  }

  // 3. 楽天結果をDBにupsert（item_codeで重複排除）
  const toInsert = rakutenItems.map(({ Item }) => ({
    name: Item.itemName,
    brand: Item.shopName || null,
    image_url: Item.mediumImageUrls?.[0]?.imageUrl ?? null,
    rakuten_url: Item.affiliateUrl || Item.itemUrl || null,
    rakuten_item_code: Item.itemCode,
    tags: [],
  }));

  const { data: saved } = await supabase
    .from('products')
    .upsert(toInsert, { onConflict: 'rakuten_item_code' })
    .select('id, name, brand, image_url, tags');

  // 4. DBの結果と楽天結果をマージして返す
  const existingIds = new Set((dbResults ?? []).map((p) => p.id));
  const merged = [
    ...(dbResults ?? []),
    ...(saved ?? []).filter((p) => !existingIds.has(p.id)),
  ].slice(0, 3);

  return Response.json(merged);
}
