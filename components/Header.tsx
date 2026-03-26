"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WHO_OPTIONS, SCENE_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants';
import { useSearch } from './SearchProvider';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const { addFilter, searchQuery, setSearchQuery } = useSearch();
  const router = useRouter();
  const supabase = createClient();
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      if (user) {
        fetch('/api/notifications')
          .then((r) => r.ok ? r.json() : [])
          .then((data: { is_read: boolean }[]) => {
            setUnreadCount(Array.isArray(data) ? data.filter((n) => !n.is_read).length : 0);
          });
        supabase.from('profiles').select('role').eq('id', user.id).single()
          .then(({ data }) => setIsAdmin(data?.role === 'admin'));
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-color') || 'default';
    if (savedTheme !== 'default') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    setCurrentTheme(savedTheme);
  }, []);

  const changeTheme = (theme: string) => {
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme-color', theme);
    setCurrentTheme(theme);
    setThemePickerOpen(false);
  };

  const themes = [
    { id: 'default', color: '#FFB6B9' },
    { id: 'blue', color: '#A2D2FF' },
    { id: 'green', color: '#B5E48C' },
    { id: 'yellow', color: '#FBEA92' },
    { id: 'purple', color: '#CDB4DB' },
    { id: 'monotone', color: '#CCCCCC' }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-light bg-background-card">
      {/* Top Row */}
      <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-primary flex items-center gap-0">
          <div
            style={{
              width: 39,
              height: 39,
              backgroundColor: 'var(--primary)',
              maskImage: 'url(/icons/cat.png)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskImage: 'url(/icons/cat.png)',
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          Gift for
        </Link>

        {/* Search Bar - Center */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-8">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワードで探す..."
              className="w-full text-sm bg-background-soft border border-border-light rounded-full pl-4 pr-10 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/></svg>
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-5 text-sm font-medium">
          {/* Hint */}
          <div className="relative">
            <button
              onClick={() => setShowHint(!showHint)}
              className={`transition-colors flex items-center justify-center w-9 h-9 rounded-full hover:bg-background-soft ${showHint ? 'text-yellow-500 bg-background-soft' : 'text-text-sub hover:text-yellow-500'}`}
              title="使い方"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5"/>
              </svg>
            </button>
            {showHint && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHint(false)} />
                <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-border-light rounded-2xl shadow-2xl z-50 p-4 space-y-3">
                  <p className="text-sm font-bold text-text-main">Gift forの使い方</p>
                  <div className="space-y-2.5 text-xs text-text-sub leading-relaxed">
                    <div className="flex gap-2">
                      <span className="text-primary font-bold flex-shrink-0">🎁</span>
                      <p><span className="font-bold text-text-main">口コミを書く</span>：プレゼントした（もらった）体験を投稿。写真・商品名・予算・エピソードを記録できます。</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex-shrink-0">📚</span>
                      <p><span className="font-bold text-text-main">まとめ投稿</span>：複数の口コミをまとめてリストにできます。「誕生日おすすめ3選」など。</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex-shrink-0">🔖</span>
                      <p><span className="font-bold text-text-main">欲しい！／贈りたい！</span>：気になる投稿にリアクションして保存できます。</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex-shrink-0">🔍</span>
                      <p><span className="font-bold text-text-main">絞り込み</span>：シーン・関係・カテゴリのタブから探せます。キーワード検索も可能。</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex-shrink-0">👤</span>
                      <p><span className="font-bold text-text-main">マイページ</span>：投稿の公開・非公開の管理、アイコンや名前の変更ができます。</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setShowHint(false)}
                      className="flex items-center gap-2 mt-1 pt-3 border-t border-border-light text-xs font-bold text-text-sub hover:text-primary transition-colors">
                      <img src="/icons/cat.png" className="w-4 h-4 object-contain" alt="" />
                      管理画面へ
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Theme Picker */}
          <div className="relative">
            <button
              onClick={() => setThemePickerOpen(!themePickerOpen)}
              className={`transition-colors flex items-center justify-center w-9 h-9 rounded-full hover:bg-background-soft ${themePickerOpen ? 'text-[#fb8500] bg-background-soft' : 'text-text-sub hover:text-[#fb8500]'}`}
              title="テーマカラー変更"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
              </svg>
            </button>

            {themePickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setThemePickerOpen(false)}></div>
                <div className="absolute top-full right-0 mt-2 p-3 bg-white border border-border-light rounded-2xl shadow-xl flex gap-3 z-50">
                  {themes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => changeTheme(t.id)}
                      className={`w-7 h-7 rounded-full shadow-sm hover:scale-110 transition-transform ${currentTheme === t.id ? 'ring-2 ring-offset-2 ring-text-sub' : ''}`}
                      style={{ backgroundColor: t.color }}
                      title={t.id}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop only icons */}
          <Link href="/likes" className="hidden md:flex text-text-sub hover:text-primary transition-colors items-center justify-center w-9 h-9 rounded-full hover:bg-background-soft" title="保存したギフト">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
            </svg>
          </Link>
          <Link href="/notifications" className="hidden md:flex relative text-text-sub hover:text-primary transition-colors items-center justify-center w-9 h-9 rounded-full hover:bg-background-soft" title="通知">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/mypage" className="hidden md:flex text-text-sub hover:text-primary transition-colors items-center justify-center w-9 h-9 rounded-full hover:bg-background-soft" title="マイページ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
              <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
            </svg>
          </Link>

          <div className="hidden md:block w-px h-5 bg-border-light mx-1"></div>

          {/* Desktop login/logout */}
          {isLoggedIn ? (
            <>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="hidden md:block px-5 py-2 bg-white border border-border-light rounded-full text-text-main font-bold hover:border-red-300 hover:text-red-500 shadow-sm hover:shadow transition-all"
              >
                ログアウト
              </button>
              {showLogoutConfirm && (
                <>
                  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => setShowLogoutConfirm(false)} />
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] bg-white rounded-2xl shadow-2xl border border-border-light p-6 w-[90vw] max-w-sm">
                    <p className="text-base font-bold text-text-main mb-1">ログアウトしますか？</p>
                    <p className="text-sm text-text-sub mb-5">ログインページに移動します。</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 py-2.5 border border-border-light rounded-xl text-sm font-bold text-text-sub hover:bg-background-soft transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={async () => {
                          setShowLogoutConfirm(false);
                          await supabase.auth.signOut();
                          router.push('/');
                          router.refresh();
                        }}
                        className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
                      >
                        ログアウト
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <Link href="/login" className="hidden md:block px-5 py-2 bg-white border border-border-light rounded-full text-text-main font-bold hover:border-primary hover:text-primary shadow-sm hover:shadow transition-all">
              ログイン
            </Link>
          )}

          {/* Mobile: post button in header */}
          <Link
            href="/post"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-accent-strong text-white shadow-sm active:scale-95 transition-transform"
            title="口コミを書く"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Bottom Row - Nav (desktop only) */}
      <div className="hidden md:block border-t border-border-light/60">
        <div className="flex items-center px-6 max-w-7xl mx-auto">

          {/* ホーム */}
          <Link href="/"
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-bold text-text-main hover:text-primary border-b-2 border-transparent hover:border-primary transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354z"/>
            </svg>
            ホーム
          </Link>

          <div className="w-px h-5 bg-border-light mx-1 flex-shrink-0" />

          {/* Scene dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-text-sub hover:text-primary border-b-2 border-transparent hover:border-primary transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5z"/>
              </svg>
              シーンから探す
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16" className="opacity-40">
                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
              </svg>
            </button>
            <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="w-[480px] bg-white border border-border-light shadow-2xl rounded-2xl p-4 flex flex-wrap gap-2">
                {SCENE_OPTIONS.map((scene) => (
                  <button key={scene} onClick={() => addFilter(`シーン: ${scene}`)}
                    className="px-3 py-1.5 text-xs text-text-sub hover:text-primary hover:bg-primary/8 rounded-full border border-border-light hover:border-primary/30 transition-all">
                    {scene}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recipient dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-text-sub hover:text-primary border-b-2 border-transparent hover:border-primary transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/>
              </svg>
              贈る相手から探す
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16" className="opacity-40">
                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
              </svg>
            </button>
            <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="w-[480px] bg-white border border-border-light shadow-2xl rounded-2xl p-4 flex flex-wrap gap-2">
                {WHO_OPTIONS.map((person) => (
                  <button key={person} onClick={() => addFilter(`関係: ${person}`)}
                    className="px-3 py-1.5 text-xs text-text-sub hover:text-primary hover:bg-primary/8 rounded-full border border-border-light hover:border-primary/30 transition-all">
                    {person}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-text-sub hover:text-primary border-b-2 border-transparent hover:border-primary transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5z"/>
              </svg>
              カテゴリから探す
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16" className="opacity-40">
                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
              </svg>
            </button>
            <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="w-[480px] bg-white border border-border-light shadow-2xl rounded-2xl p-4 flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button key={cat} onClick={() => addFilter(`カテゴリ: ${cat}`)}
                    className="px-3 py-1.5 text-xs text-text-sub hover:text-primary hover:bg-primary/8 rounded-full border border-border-light hover:border-primary/30 transition-all">
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/lists"
              className="px-4 py-1.5 text-sm font-medium text-text-sub hover:text-primary border border-border-light hover:border-primary/40 rounded-full transition-all">
              まとめ投稿
            </Link>
            <Link href="/post"
              className="flex items-center gap-1.5 bg-accent-strong text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:opacity-90 hover:scale-105 transition-all">
              <img src="/icons/cat.png" width="18" height="18" alt="" className="object-contain" />
              口コミを書く
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}
