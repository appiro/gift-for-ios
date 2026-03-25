import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gift for',
    short_name: 'Gift for',
    description: '実体験に基づいた「成功したギフト体験」を可視化・共有するサービス',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAFAFA',
    theme_color: '#FFB6B9',
    categories: ['lifestyle', 'shopping', 'social'],
    icons: [
      { src: '/icons/icon-72.png',  sizes: '72x72',  type: 'image/png' },
      { src: '/icons/icon-96.png',  sizes: '96x96',  type: 'image/png' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      {
        src: '/screenshots/screenshot-mobile.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Gift for ホーム画面',
      },
      {
        src: '/screenshots/screenshot-desktop.png',
        sizes: '1280x800',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Gift for デスクトップ',
      },
    ],
    shortcuts: [
      {
        name: '口コミを書く',
        url: '/post',
        icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }],
      },
      {
        name: '保存したギフト',
        url: '/likes',
        icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }],
      },
    ],
  };
}
