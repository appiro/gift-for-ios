"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // 新しいバージョンのSWが待機中になったら通知
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch(() => {});
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-text-main text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-3 text-sm font-bold">
      <span>新しいバージョンが利用できます</span>
      <button
        onClick={() => window.location.reload()}
        className="bg-white text-text-main px-3 py-1 rounded-full text-xs font-bold hover:opacity-90"
      >
        更新
      </button>
    </div>
  );
}
