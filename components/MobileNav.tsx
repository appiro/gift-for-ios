"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MobileNav() {
  const pathname = usePathname();
  const supabase = createClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => setIsLoggedIn(!!session?.user)
    );
    return () => subscription.unsubscribe();
  }, []);

  const items = [
    {
      href: "/",
      label: "ホーム",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6-.354.353V14.5A1.5 1.5 0 0 0 2.5 16h3a.5.5 0 0 0 .5-.5V11h4v4.5a.5.5 0 0 0 .5.5h3a1.5 1.5 0 0 0 1.5-1.5V7.5l-.354-.354z"/>
        </svg>
      ),
    },
    {
      href: "/likes",
      label: "保存",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
        </svg>
      ),
    },
    {
      href: "/post",
      label: "投稿",
      isPost: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
        </svg>
      ),
    },
    {
      href: "/lists",
      label: "まとめ",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
          <path d="M1.5 0A1.5 1.5 0 0 0 0 1.5v2A1.5 1.5 0 0 0 1.5 5h2A1.5 1.5 0 0 0 5 3.5v-2A1.5 1.5 0 0 0 3.5 0zm5 0A1.5 1.5 0 0 0 5 1.5v2A1.5 1.5 0 0 0 6.5 5h2A1.5 1.5 0 0 0 10 3.5v-2A1.5 1.5 0 0 0 8.5 0zm5 0A1.5 1.5 0 0 0 10 1.5v2A1.5 1.5 0 0 0 11.5 5h2A1.5 1.5 0 0 0 15 3.5v-2A1.5 1.5 0 0 0 13.5 0zM1.5 6A1.5 1.5 0 0 0 0 7.5v2A1.5 1.5 0 0 0 1.5 11h2A1.5 1.5 0 0 0 5 9.5v-2A1.5 1.5 0 0 0 3.5 6zm5 0A1.5 1.5 0 0 0 5 7.5v2A1.5 1.5 0 0 0 6.5 11h2A1.5 1.5 0 0 0 10 9.5v-2A1.5 1.5 0 0 0 8.5 6zm5 0A1.5 1.5 0 0 0 10 7.5v2A1.5 1.5 0 0 0 11.5 11h2A1.5 1.5 0 0 0 15 9.5v-2A1.5 1.5 0 0 0 13.5 6z"/>
        </svg>
      ),
    },
    {
      href: isLoggedIn ? "/mypage" : "/login",
      label: isLoggedIn ? "マイページ" : "ログイン",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
          <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
        </svg>
      ),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background-card border-t border-border-light">
      <div className="flex items-center justify-around px-2 py-1 safe-area-inset-bottom">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          if (item.isPost) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-14 h-14 rounded-full bg-accent-strong text-white flex items-center justify-center shadow-lg shadow-accent-strong/30 active:scale-95 transition-transform">
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold text-accent-strong mt-1">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-colors min-w-[52px] ${
                isActive ? "text-primary" : "text-text-sub"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
