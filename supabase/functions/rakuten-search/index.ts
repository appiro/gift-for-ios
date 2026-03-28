import { corsResponse, json } from '../_shared/cors.ts';

const AFFILIATE_ID = '523fa562.2be79479.523fa563.3c618458';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const keyword = new URL(req.url).searchParams.get('q');
  if (!keyword) return json([]);

  const APPLICATION_ID = Deno.env.get('RAKUTEN_APPLICATION_ID') ?? '';
  const ACCESS_KEY = Deno.env.get('RAKUTEN_ACCESS_KEY') ?? '';

  const params = new URLSearchParams({
    applicationId: APPLICATION_ID, accessKey: ACCESS_KEY,
    affiliateId: AFFILIATE_ID, keyword, hits: '8', format: 'json', formatVersion: '2',
  });

  try {
    const res = await fetch(
      `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?${params}`,
      { headers: { Origin: 'https://giftfor.info' } }
    );
    const data = await res.json();
    if (data.errors) return json({ error: JSON.stringify(data.errors) });

    const items = (data.Items ?? []).map((item: {
      itemName: string; itemPrice: number; affiliateUrl: string;
      mediumImageUrls: string[]; shopName: string;
    }) => ({
      itemName: item.itemName, itemPrice: item.itemPrice,
      affiliateUrl: item.affiliateUrl,
      mediumImageUrl: item.mediumImageUrls?.[0] ?? '',
      shopName: item.shopName,
    }));

    return json(items);
  } catch {
    return json([]);
  }
});
