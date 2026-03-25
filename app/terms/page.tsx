export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8 text-sm text-text-main leading-relaxed">
      <h1 className="text-2xl font-bold">利用規約</h1>
      <p className="text-text-sub">最終更新日：2026年3月25日</p>

      <section className="space-y-3">
        <h2 className="font-bold text-base">第1条（適用）</h2>
        <p>本規約は、Gift for（以下「本サービス」）の利用条件を定めるものです。登録ユーザーの皆さまには、本規約に従って本サービスをご利用いただきます。</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">第2条（禁止事項）</h2>
        <p>ユーザーは以下の行為をしてはなりません。</p>
        <ul className="list-disc list-inside space-y-1 text-text-sub">
          <li>法令または公序良俗に違反する行為</li>
          <li>他のユーザーへの嫌がらせ・誹謗中傷</li>
          <li>虚偽の情報を投稿する行為</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>他人のアカウントを不正に使用する行為</li>
          <li>商業目的の無断広告・宣伝行為</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">第3条（投稿コンテンツ）</h2>
        <p>ユーザーが投稿した口コミ・コメント等のコンテンツに関する著作権はユーザーに帰属します。ただし本サービスは、サービスの運営・改善を目的として当該コンテンツを無償で利用できるものとします。</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">第4条（免責事項）</h2>
        <p>本サービスは、ユーザーが投稿した情報の正確性・完全性を保証しません。本サービスの利用によって生じた損害について、運営者は一切の責任を負いません。</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">第5条（サービスの変更・終了）</h2>
        <p>運営者は、ユーザーへの事前通知なしに本サービスの内容を変更または終了することがあります。</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-base">第6条（お問い合わせ）</h2>
        <p>本規約に関するお問い合わせは <a href="mailto:cat.giftfor@gmail.com" className="text-primary underline">cat.giftfor@gmail.com</a> までお願いします。</p>
      </section>
    </div>
  );
}
