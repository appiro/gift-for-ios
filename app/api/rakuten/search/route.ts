import type { NextRequest } from 'next/server';
import https from 'node:https';

const APPLICATION_ID = process.env.RAKUTEN_APPLICATION_ID ?? '';
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY ?? '';
const AFFILIATE_ID = '523fa562.2be79479.523fa563.3c618458';

export interface RakutenItem {
  itemName: string;
  itemPrice: number;
  affiliateUrl: string;
  mediumImageUrl: string;
  shopName: string;
}

function httpsGet(url: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => resolve(body));
      }
    ).on('error', reject);
  });
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q');
  if (!keyword) return Response.json([], { status: 200 });

  const params = new URLSearchParams({
    applicationId: APPLICATION_ID,
    accessKey: ACCESS_KEY,
    affiliateId: AFFILIATE_ID,
    keyword,
    hits: '8',
    format: 'json',
    formatVersion: '2',
  });

  try {
    const body = await httpsGet(
      `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?${params}`,
      { Origin: 'https://giftfor.info' }
    );
    const json = JSON.parse(body) as { Items?: { itemName: string; itemPrice: number; affiliateUrl: string; mediumImageUrls: string[]; shopName: string }[]; errors?: unknown };
    if (json.errors) return Response.json({ error: body }, { status: 200 });
    const items: RakutenItem[] = (json.Items ?? []).map((item) => ({
      itemName: item.itemName,
      itemPrice: item.itemPrice,
      affiliateUrl: item.affiliateUrl,
      mediumImageUrl: item.mediumImageUrls?.[0] ?? '',
      shopName: item.shopName,
    }));
    return Response.json(items);
  } catch {
    return Response.json([], { status: 200 });
  }
}
