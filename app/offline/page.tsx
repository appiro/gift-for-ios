"use client";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <img src="/icons/cat.png" className="w-16 h-16 object-contain opacity-50 mb-6" alt="" />
      <h1 className="text-xl font-bold text-text-main mb-2">オフラインです</h1>
      <p className="text-sm text-text-sub mb-6">
        インターネット接続を確認してから、もう一度お試しください。
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary-hover transition-colors"
      >
        再読み込み
      </button>
    </div>
  );
}
