import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '使い方ガイド | Gift for',
  description: 'Gift forの使い方を詳しく説明します。投稿・検索・保存・まとめなど各機能の使い方を確認できます。',
};

const SECTIONS = [
  {
    id: 'home',
    emoji: '🏠',
    title: 'ホーム・検索',
    steps: [
      {
        title: 'キーワード検索',
        desc: 'ヘッダーの検索バーに商品名・ブランド名・キーワードを入力すると、関連する口コミを絞り込めます。',
      },
      {
        title: 'シーンから探す',
        desc: '「誕生日」「結婚」「お礼」など、贈るシーンを選んで絞り込めます。何のためのギフトかが決まっているときに便利です。',
      },
      {
        title: '贈る相手から探す',
        desc: '「友人」「母」「上司」など、贈る相手との関係性から探せます。相手に合ったギフトが見つかります。',
      },
      {
        title: 'カテゴリから探す',
        desc: '「スイーツ」「ファッション」「ガジェット」など、商品カテゴリで絞り込めます。ジャンルが決まっているときに使いましょう。',
      },
      {
        title: '複数フィルターの組み合わせ',
        desc: '「誕生日 × 母 × スイーツ」のように複数の条件を重ねられます。フィルタータグをタップするとその条件が追加されます。',
      },
    ],
  },
  {
    id: 'post',
    emoji: '🎁',
    title: '口コミを書く',
    steps: [
      {
        title: '投稿ボタンを押す',
        desc: 'デスクトップはヘッダー右上の「口コミを書く」ボタン、モバイルは下部ナビバー中央の＋ボタンから投稿画面に進めます。ログインが必要です。',
      },
      {
        title: '写真をアップロード（任意）',
        desc: '実際の贈り物の写真を最大2枚まで投稿できます。写真があると信頼性が上がり、見た人の参考になります。',
      },
      {
        title: '基本情報を入力',
        desc: '商品名・タイトル・予算（価格帯）・贈ったシーン・相手との関係・カテゴリを選択します。これらは検索時の絞り込みに使われます。',
      },
      {
        title: 'エピソードを書く',
        desc: '「なぜこれを選んだか」「どんな反応だったか」など、体験談を書きましょう。具体的なエピソードがあると、読んだ人の参考になります。',
      },
      {
        title: '公開・非公開を選ぶ',
        desc: '「公開」にするとホームに表示され、みんなに見てもらえます。「非公開」は自分だけが見られる記録として使えます。後からいつでも変更できます。',
      },
    ],
  },
  {
    id: 'lists',
    emoji: '📚',
    title: 'まとめ投稿',
    steps: [
      {
        title: 'まとめとは',
        desc: '複数の口コミをひとつのリストにまとめた投稿です。「誕生日プレゼント3選」「3,000円以内で買えるギフト」など、テーマ別にキュレーションできます。',
      },
      {
        title: 'まとめを作成する',
        desc: 'ヘッダーの「まとめ投稿」またはまとめページから作成できます。タイトル・説明を入力し、まとめたい口コミを選んで追加します。',
      },
      {
        title: '口コミをまとめに追加',
        desc: '口コミの詳細ページや一覧から「まとめに追加」ボタンで、自分が作成済みのまとめに追加できます。',
      },
    ],
  },
  {
    id: 'likes',
    emoji: '🔖',
    title: '保存（欲しい！/ 贈りたい！）',
    steps: [
      {
        title: '2種類のリアクション',
        desc: '口コミカードの「欲しい！」は自分がもらいたいもの、「贈りたい！」は誰かに贈りたいものとして保存できます。用途別に使い分けましょう。',
      },
      {
        title: '保存リストを見る',
        desc: 'ヘッダー（デスクトップ）またはモバイルナビの「保存」タブから、リアクションした口コミ一覧を確認できます。',
      },
    ],
  },
  {
    id: 'mypage',
    emoji: '👤',
    title: 'マイページ',
    steps: [
      {
        title: 'プロフィール設定',
        desc: 'アイコン画像・表示名を設定できます。設定した名前は投稿者名として口コミに表示されます。',
      },
      {
        title: '投稿の管理',
        desc: '自分の口コミを「公開」「非公開」「下書き」に切り替えられます。一覧から投稿ごとに状態を確認・変更できます。',
      },
      {
        title: 'まとめの管理',
        desc: 'マイページの「まとめ」タブから、自分が作成したまとめ投稿を管理できます。',
      },
    ],
  },
  {
    id: 'notifications',
    emoji: '🔔',
    title: '通知',
    steps: [
      {
        title: '通知が届くとき',
        desc: '自分の投稿に「欲しい！」「贈りたい！」のリアクションがついたとき、通知が届きます。',
      },
      {
        title: '通知を確認する',
        desc: 'ヘッダーのベルアイコンから通知一覧を確認できます。未読の通知がある場合は赤いバッジが表示されます。',
      },
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-16">

      {/* Header */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5"/>
          </svg>
          使い方ガイド
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-text-main">Gift forの使い方</h1>
        <p className="text-sm text-text-sub">各機能の使い方を詳しく説明します。</p>

        {/* Jump links */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {SECTIONS.map(({ id, emoji, title }) => (
            <a key={id} href={`#${id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-light text-xs font-bold text-text-sub hover:border-primary hover:text-primary transition-colors">
              <span>{emoji}</span>{title}
            </a>
          ))}
        </div>
      </section>

      {/* Sections */}
      {SECTIONS.map(({ id, emoji, title, steps }) => (
        <section key={id} id={id} className="space-y-5 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{emoji}</span>
            <h2 className="text-lg font-black text-text-main">{title}</h2>
          </div>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="bg-white border border-border-light rounded-2xl p-5 flex gap-4">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-text-main">{step.title}</p>
                  <p className="text-xs text-text-sub leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Bottom CTA */}
      <section className="text-center space-y-4 border-t border-border-light pt-10">
        <p className="text-sm text-text-sub">わからないことがあればお気軽にお問い合わせください。</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/post"
            className="inline-flex items-center gap-2 bg-accent-strong text-white px-7 py-3 rounded-full font-bold text-sm shadow-md hover:opacity-90 transition-opacity">
            <img src="/icons/cat.png" width="18" height="18" className="object-contain" alt="" />
            口コミを書いてみる
          </Link>
          <a href="mailto:cat.giftfor@gmail.com"
            className="inline-flex items-center gap-2 border border-border-light text-text-sub px-7 py-3 rounded-full font-bold text-sm hover:border-primary hover:text-primary transition-colors">
            お問い合わせ
          </a>
        </div>
      </section>

    </div>
  );
}
