"use client";

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface ListItem {
  id: string;
  review_id: string | null;
  position: number;
  snapshot_title: string;
  snapshot_product_name: string;
  snapshot_image_url: string;
  snapshot_author_name: string;
  comment: string;
}

interface GiftList {
  id: string;
  title: string;
  body: string;
  author_name: string;
  author_icon: string;
  created_at: string;
  user_id: string;
  status: string;
  list_items: ListItem[];
}

function interpolate(text: string, activeCount: number): string {
  return text.replace(/\{n\}/g, String(activeCount));
}

export default function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [list, setList] = useState<GiftList | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const [listRes, { data: { user } }] = await Promise.all([
          fetch(`/api/lists/${id}`),
          supabase.auth.getUser(),
        ]);

        if (!listRes.ok) return;
        const data: GiftList = await listRes.json();
        setList(data);

        if (user && data.user_id === user.id) {
          setIsOwner(true);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8">
        <div className="h-10 bg-background-soft rounded-xl animate-pulse w-3/4" />
        <div className="h-5 bg-background-soft rounded-lg animate-pulse w-1/2" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-background-soft rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="max-w-3xl mx-auto py-24 text-center text-text-sub text-lg">
        リストが見つかりませんでした。
      </div>
    );
  }

  const activeItems = list.list_items.filter((item) => item.review_id !== null);
  const activeCount = activeItems.length;
  const displayTitle = interpolate(list.title, activeCount);
  const displayBody = interpolate(list.body, activeCount);

  // Assign real numbers only to active items
  let activeIndex = 0;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-10">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-text-main leading-tight font-serif flex-1">
            {displayTitle || '(タイトルなし)'}
          </h1>
          {isOwner && (
            <Link
              href={`/lists/${list.id}/edit`}
              className="flex-shrink-0 bg-accent-strong text-white px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
            >
              編集
            </Link>
          )}
        </div>

        {/* Author info */}
        <div className="flex items-center gap-3 text-text-sub text-sm">
          {list.author_icon && (
            <img
              src={list.author_icon}
              alt={list.author_name}
              className="w-8 h-8 rounded-full object-contain bg-background-soft border border-border-light"
            />
          )}
          <span className="font-medium text-text-main">{list.author_name}</span>
          <span>•</span>
          <span>{new Date(list.created_at).toLocaleDateString('ja-JP')}</span>
        </div>

        {/* Body */}
        {displayBody && (
          <div className="bg-background-soft border border-border-light rounded-2xl p-6 text-text-main leading-relaxed">
            {displayBody.split('\n').map((line, i) => (
              <p key={i} className={i > 0 ? 'mt-3' : ''}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-6">
        {list.list_items.map((item) => {
          const isActive = item.review_id !== null;
          if (isActive) activeIndex++;
          const itemNumber = isActive ? activeIndex : null;

          return (
            <div
              key={item.id}
              className="border border-border-light rounded-2xl overflow-hidden bg-white shadow-sm"
            >
              {!isActive && (
                <div className="bg-background-soft border-b border-border-light px-4 py-2 text-xs text-text-sub flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                  </svg>
                  この口コミは削除されました
                </div>
              )}

              <div className="flex gap-4 p-4">
                {/* Number badge */}
                <div className="flex-shrink-0 flex items-start pt-1">
                  {itemNumber !== null ? (
                    <span className="w-8 h-8 rounded-full bg-accent-strong text-white text-sm font-bold flex items-center justify-center">
                      {itemNumber}
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-background-soft border border-border-light text-text-sub text-sm font-bold flex items-center justify-center">
                      -
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex gap-3">
                    {item.snapshot_image_url && (
                      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-background-soft border border-border-light">
                        {isActive ? (
                          <Link href={`/post/${item.review_id}`}>
                            <img
                              src={item.snapshot_image_url}
                              alt={item.snapshot_title}
                              className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                            />
                          </Link>
                        ) : (
                          <img
                            src={item.snapshot_image_url}
                            alt={item.snapshot_title}
                            className="w-full h-full object-cover opacity-60"
                          />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {isActive ? (
                        <Link href={`/post/${item.review_id}`} className="hover:text-primary transition-colors">
                          <h3 className="font-bold text-text-main leading-snug line-clamp-2">
                            {item.snapshot_title}
                          </h3>
                        </Link>
                      ) : (
                        <h3 className="font-bold text-text-sub leading-snug line-clamp-2">
                          {item.snapshot_title}
                        </h3>
                      )}
                      <p className="text-xs text-text-sub mt-1">{item.snapshot_product_name}</p>
                      {item.snapshot_author_name && (
                        <p className="text-xs text-text-sub mt-0.5">by {item.snapshot_author_name}</p>
                      )}
                    </div>
                  </div>

                  {item.comment && (
                    <p className="text-sm text-text-main bg-background-soft rounded-xl px-4 py-3 leading-relaxed border border-border-light">
                      {item.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {list.list_items.length === 0 && (
        <div className="text-center py-16 text-text-sub">
          このリストにはまだアイテムがありません。
        </div>
      )}

      <div className="pt-4">
        <Link href="/lists" className="text-primary font-bold hover:underline flex items-center gap-1 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
          まとめ投稿一覧に戻る
        </Link>
      </div>
    </div>
  );
}
