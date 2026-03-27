const CACHE_NAME = 'gift-for-v2';

// アプリシェル：インストール時にキャッシュするファイル
const APP_SHELL = [
  '/',
  '/likes',
  '/lists',
  '/offline',
  '/icons/cat.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── Install ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API・外部リクエストはネットワーク優先（キャッシュしない）
  if (url.pathname.startsWith('/api/') || url.origin !== location.origin) {
    event.respondWith(fetch(request).catch(() => new Response('offline', { status: 503 })));
    return;
  }

  // 画像・静的ファイル → キャッシュ優先（Cache First）
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // ページナビゲーション → Network First（HTMLはキャッシュしない。常に最新デプロイを表示）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline'))
    );
    return;
  }
});
