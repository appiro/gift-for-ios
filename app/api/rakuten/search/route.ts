import type { NextRequest } from 'next/server';

const APPLICATION_ID = process.env.RAKUTEN_APPLICATION_ID!;
const AFFILIATE_ID = '523fa562.2be79479.523fa563.3c618458';

export interface RakutenItem {
  itemName: string;
  itemPrice: number;
  affiliateUrl: string;
  mediumImageUrl: string;
  shopName: string;
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q');
  if (!keyword) return Response.json([], { status: 200 });

  const params = new URLSearchParams({
    applicationId: APPLICATION_ID,
    affiliateId: AFFILIATE_ID,
    keyword,
    hits: '8',
    format: 'json',
    formatVersion: '2',
  });

  const res = await fetch(
    `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706?${params}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    const errBody = await res.text();
    return Response.json({ error: errBody, status: res.status }, { status: 200 });
  }

  const json = await res.json() as { Items?: { itemName: string; itemPrice: number; affiliateUrl: string; mediumImageUrls: { imageUrl: string }[]; shopName: string }[] };
  const items: RakutenItem[] = (json.Items ?? []).map((item) => ({
    itemName: item.itemName,
    itemPrice: item.itemPrice,
    affiliateUrl: item.affiliateUrl,
    mediumImageUrl: item.mediumImageUrls?.[0]?.imageUrl ?? '',
    shopName: item.shopName,
  }));

  return Response.json(items);
}
