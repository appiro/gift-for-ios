export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8 text-sm text-text-main leading-relaxed">
      <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
      <p className="text-text-sub">最終更新日：2026年3月25日</p>

      <section className="space-y-3">
        <h2 className="font-bold text-base">1. 収集する情報</h2>
        <p>本サービスでは以下の情報を収集します。</p>
        <ul className="list-disc list-inside space-y-1 text-text-sub">
          <li>Googleアカウント経由で提供されるメールアドレス・表示名・プロフィール画像</li>
          <li>ユーザーが投稿した口コミ・コメント・まとめ投稿</li>
          <li>アクセスログ（IPアドレス、ブラウザ情報等）</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">2. 情報の利用目的</h2>
        <ul className="list-disc list-inside space-y-1 text-text-sub">
          <li>本サービスの提供・運営・改善</li>
          <li>ユーザーへの通知・お問い合わせ対応</li>
          <li>不正利用の防止</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">3. 第三者提供</h2>
        <p>法令に基づく場合を除き、収集した個人情報を第三者に提供することはありません。</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">4. 外部サービス</h2>
        <p>本サービスは以下の外部サービスを利用しています。各サービスのプライバシーポリシーもご確認ください。</p>
        <ul className="list-disc list-inside space-y-1 text-text-sub">
          <li>Supabase（データベース・認証）</li>
          <li>Google OAuth（ログイン）</li>
          <li>楽天アフィリエイト（商品情報・購入リンク）</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">5. Cookie</h2>
        <p>本サービスはログイン状態の維持のためにCookieを使用します。</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">6. お問い合わせ</h2>
        <p>個人情報の取扱いに関するお問い合わせは <a href="mailto:cat.giftfor@gmail.com" className="text-primary underline">cat.giftfor@gmail.com</a> までお願いします。</p>
      </section>
    </div>
  );
}
