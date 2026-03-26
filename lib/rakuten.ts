const AFFILIATE_ID = '523fa562.2be79479.523fa563.3c618458';

/** 任意の楽天URLをアフィリエイトリンクでラップする */
export function rakutenAffiliateUrl(url: string): string {
  return `https://hb.afl.rakuten.co.jp/hgc/${AFFILIATE_ID}/?pc=${encodeURIComponent(url)}&link_type=text`;
}

/** 商品名で楽天市場を検索するアフィリエイトリンクを生成する */
export function rakutenSearchUrl(keyword: string): string {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;
  return `https://hb.afl.rakuten.co.jp/hgc/${AFFILIATE_ID}/?pc=${encodeURIComponent(searchUrl)}&link_type=text`;
}
