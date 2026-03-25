import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="hidden md:block border-t border-border-light bg-white mt-8">
      <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-sub">
        <div className="flex items-center gap-2">
          <img src="/icons/cat.png" className="w-5 h-5 object-contain" alt="Gift for" />
          <span className="font-bold text-text-main">Gift for</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link href="/terms" className="hover:text-text-main transition-colors">利用規約</Link>
          <Link href="/privacy" className="hover:text-text-main transition-colors">プライバシーポリシー</Link>
          <a href="mailto:cat.giftfor@gmail.com" className="hover:text-text-main transition-colors">お問い合わせ</a>
        </nav>
      </div>
    </footer>
  );
}
