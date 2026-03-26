import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gift forについて | Gift for',
  description: '贈り物を真剣に考える人たちの実体験が集まる、ギフト口コミプラットフォームです。',
};

const VALUES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4z"/>
      </svg>
    ),
    title: '実体験だけが集まる',
    body: '実際に贈って喜ばれた、もらって嬉しかった——そんな本物の体験だけが投稿できます。広告や宣伝ではなく、リアルな声だけを届けます。',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
        <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
      </svg>
    ),
    title: '贈る人の思いやりを大切に',
    body: '誰かのためにギフトを真剣に選ぶ——その行為には、相手への深い思いやりがあります。Gift forは、そんな優しさを可視化するサービスです。',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
        <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm6 2.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6M10.5 9a3 3 0 0 1-5 0z"/>
      </svg>
    ),
    title: 'みんなの知恵をシェア',
    body: '一人が持つ「贈り物の成功体験」は、次の誰かの迷いを消してくれます。コミュニティで知恵を共有し、贈り物選びをもっと楽しく。',
  },
];

const FEATURES = [
  { emoji: '🎁', title: '口コミを投稿', desc: '実際に贈った・もらったギフトの体験を記録。写真・商品名・予算・エピソードをまとめて残せます。' },
  { emoji: '🔍', title: 'シーン・相手・カテゴリで検索', desc: '誕生日・結婚・お礼など贈るシーン、友人・両親・上司など相手の関係性、スイーツ・ファッションなどカテゴリから、ぴったりのギフトを探せます。' },
  { emoji: '📚', title: 'まとめ投稿', desc: '複数の口コミをリストにまとめて投稿できます。「母の日おすすめ3選」「3,000円以内で買えるギフト」など、テーマ別にキュレーションを。' },
  { emoji: '🔖', title: '保存・リアクション', desc: '気になる投稿に「欲しい！」「贈りたい！」でリアクション。あとで見返せるようにコレクションできます。' },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-20">

      {/* Hero */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
          <img src="/icons/cat.png" className="w-4 h-4 object-contain" alt="" />
          Gift forについて
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-text-main leading-tight">
          贈り物を真剣に考える人の、<br />
          <span className="text-primary">やさしさが集まる場所。</span>
        </h1>
        <p className="text-text-sub leading-relaxed max-w-xl mx-auto">
          Gift forは、実際に贈って喜ばれた体験・もらって嬉しかった体験を共有するギフト口コミプラットフォームです。
          広告や宣伝ではなく、リアルな声だけが集まります。
        </p>
      </section>

      {/* Story */}
      <section className="bg-background-soft rounded-3xl p-8 sm:p-10 space-y-5">
        <h2 className="text-xl font-black text-text-main">なぜ作ったか</h2>
        <div className="space-y-4 text-text-sub leading-relaxed">
          <p>
            ギフトを選ぶとき、いつも同じ悩みを繰り返していませんか？
            「何を買えばいいかわからない」「検索しても広告ばかりで参考にならない」「外れたらどうしよう」——。
          </p>
          <p>
            実は、あなたの周りには必ず「贈り物が上手な人」がいます。センスのいい友人、毎回喜ばれる先輩、
            外れのない同僚。彼らが持っている「成功体験」を、もっと広く共有できればと思ったのが出発点です。
          </p>
          <p>
            Gift forは、そういった実体験に基づく知恵を集めて、次の誰かの迷いを解消するためのサービスです。
            贈り物を真剣に考えることは、相手への思いやりの表れ。そんな優しさが積み重なる場所を作りたいと考えています。
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="space-y-8">
        <h2 className="text-xl font-black text-text-main text-center">Gift forが大切にしていること</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {VALUES.map(({ icon, title, body }) => (
            <div key={title} className="bg-white border border-border-light rounded-2xl p-6 space-y-3 hover:shadow-md transition-shadow">
              <div className="text-primary">{icon}</div>
              <h3 className="font-black text-text-main text-sm">{title}</h3>
              <p className="text-xs text-text-sub leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="space-y-8">
        <h2 className="text-xl font-black text-text-main text-center">できること</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(({ emoji, title, desc }) => (
            <div key={title} className="flex gap-4 bg-white border border-border-light rounded-2xl p-5">
              <span className="text-2xl flex-shrink-0">{emoji}</span>
              <div className="space-y-1">
                <h3 className="font-black text-sm text-text-main">{title}</h3>
                <p className="text-xs text-text-sub leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-5 py-4">
        <h2 className="text-xl font-black text-text-main">あなたの体験をシェアしてください</h2>
        <p className="text-sm text-text-sub">
          あなたが選んだ贈り物の話が、誰かの「ありがとう」につながります。
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/post"
            className="inline-flex items-center gap-2 bg-accent-strong text-white px-7 py-3 rounded-full font-bold text-sm shadow-md hover:opacity-90 transition-opacity">
            <img src="/icons/cat.png" width="18" height="18" className="object-contain" alt="" />
            口コミを書く
          </Link>
          <Link href="/guide"
            className="inline-flex items-center gap-2 border border-border-light text-text-sub px-7 py-3 rounded-full font-bold text-sm hover:border-primary hover:text-primary transition-colors">
            使い方を見る
          </Link>
        </div>
      </section>

    </div>
  );
}
