import Link from 'next/link';

export default function ReviewCard({
  id = '1',
  imageUrl = 'https://placehold.co/400x400/FFB6B9/FFF?text=Gift',
  title = '職場の先輩の退職祝い',
  productName = 'Jo Malone ボディクリーム',
  price = '〜5,000円',
  wantCount = 0,
  giftCount = 0,
  authorId,
  authorName,
  authorIcon,
}: {
  id?: string;
  imageUrl?: string;
  title?: string;
  productName?: string;
  price?: string;
  likes?: number;
  wantCount?: number;
  giftCount?: number;
  authorId?: string;
  authorName?: string;
  authorIcon?: string;
  [key: string]: unknown;
}) {
  const saves = wantCount + giftCount;

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/post/${id}?img=${encodeURIComponent(imageUrl)}`} className="group block">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-background-soft border border-border-light shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1">
          <img
            src={imageUrl}
            alt={title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />

          {/* 保存数バッジ */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="text-secondary" viewBox="0 0 16 16">
              <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2"/>
            </svg>
            <span className="text-xs font-bold text-text-main">{saves}</span>
          </div>
        </div>
      </Link>

      <div className="px-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-white shadow-sm border border-primary/20 whitespace-nowrap flex-shrink-0 tracking-wide">
            {price}
          </span>
          <span className="text-[10px] text-text-sub line-clamp-1">{title}</span>
        </div>
        <Link href={`/post/${id}?img=${encodeURIComponent(imageUrl)}`}>
          <h3 className="text-sm font-bold text-text-main line-clamp-2 leading-snug hover:text-primary transition-colors">
            {productName}
          </h3>
        </Link>

        {/* 著者リンク */}
        {authorId && authorName && (
          <Link href={`/user/${authorId}`} className="flex items-center gap-1.5 mt-1.5 group/author w-fit">
            {authorIcon && (
              <div className="w-4 h-4 rounded-full overflow-hidden bg-background-soft flex-shrink-0">
                <img src={authorIcon} alt={authorName} className="w-full h-full object-contain" />
              </div>
            )}
            <span className="text-[10px] text-text-sub group-hover/author:text-primary transition-colors">
              {authorName}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
