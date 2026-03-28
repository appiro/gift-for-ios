"use client";

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch, feedbackUrl } from '@/lib/api';

const SNS = [
  {
    href: 'https://x.com/Giftfor_Ofc',
    label: 'X',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
      </svg>
    ),
  },
  {
    href: 'https://www.instagram.com/cat.giftfor/',
    label: 'Instagram',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>
      </svg>
    ),
  },
  {
    href: 'https://www.youtube.com/@Giftfor-official',
    label: 'YouTube',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z"/>
      </svg>
    ),
  },
];

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus('sending');
    const res = await apiFetch(feedbackUrl(), {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    setStatus(res.ok ? 'done' : 'error');
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-text-main">ご意見・ご要望</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-text-sub hover:text-text-main rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 16 16">
              <line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/>
            </svg>
          </button>
        </div>

        {status === 'done' ? (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0"/>
              </svg>
            </div>
            <p className="font-bold text-text-main">ありがとうございます！</p>
            <p className="text-sm text-text-sub">ご意見を受け付けました</p>
            <button onClick={onClose} className="mt-2 px-6 py-2 bg-primary text-white text-sm font-bold rounded-full">閉じる</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-sub">サービスへのご意見・ご要望をお聞かせください。いただいた内容は開発の参考にさせていただきます。</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="ご意見・ご要望を入力してください"
              rows={5}
              className="w-full border border-border-light rounded-xl px-3 py-2.5 text-sm text-text-main placeholder:text-text-sub resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
            {status === 'error' && (
              <p className="text-xs text-red-500">エラーが発生しました。もう一度お試しください。</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || status === 'sending'}
              className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {status === 'sending' ? '送信中...' : '送信する'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Footer() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <footer className="hidden md:block border-t border-border-light bg-white mt-8">
        <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-sub">
          <div className="flex items-center gap-2">
            <img src="/icons/cat.png" className="w-5 h-5 object-contain" alt="Gift for" />
            <span className="font-bold text-text-main">Gift for</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {SNS.map(({ href, label, icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="text-text-sub hover:text-text-main transition-colors">
                  {icon}
                </a>
              ))}
            </div>
            <nav className="flex items-center gap-5">
              <Link href="/about" className="hover:text-text-main transition-colors">Gift forについて</Link>
              <Link href="/guide" className="hover:text-text-main transition-colors">使い方</Link>
              <Link href="/terms" className="hover:text-text-main transition-colors">利用規約</Link>
              <Link href="/privacy" className="hover:text-text-main transition-colors">プライバシーポリシー</Link>
              <a href="mailto:cat.giftfor@gmail.com" className="hover:text-text-main transition-colors">お問い合わせ</a>
              <button onClick={() => setFeedbackOpen(true)} className="hover:text-text-main transition-colors">ご意見</button>
            </nav>
          </div>
        </div>
      </footer>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}
