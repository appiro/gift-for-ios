import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/mypage',
          '/likes',
          '/api/',
          '/auth/',
          '/lists/*/edit',
        ],
      },
    ],
    sitemap: 'https://giftfor.info/sitemap.xml',
  };
}
