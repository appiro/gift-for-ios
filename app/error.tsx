"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-text-main mb-2">
        エラーが発生しました
      </h2>
      <p className="text-sm text-text-sub mb-6 max-w-sm">
        ページの読み込み中に問題が起きました。再試行するか、トップページへ戻ってください。
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
        >
          再試行
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 bg-background-soft border border-border-light rounded-full text-sm font-bold text-text-main hover:border-primary hover:text-primary transition-colors"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}
