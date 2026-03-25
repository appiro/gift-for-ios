import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { Review, CreateReviewInput } from './types';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'db.json');

interface DB {
  reviews: Review[];
}

const SEED_REVIEWS: Review[] = [
  {
    id: '1',
    title: '職場の先輩の退職祝いに、癒やしのボディケアセットを。',
    productName: 'Jo Malone ウッド セージ & シー ソルト ボディ クリーム',
    price: '〜5,000円',
    imageUrl: 'https://placehold.co/400x400/FFB6B9/FFF?text=Jo+Malone',
    images: [
      'https://placehold.co/800x800/FFB6B9/FFF?text=Jo+Malone+1',
      'https://placehold.co/800x800/FFDAC1/FFF?text=Jo+Malone+2',
    ],
    episode:
      'いつもお世話になっている職場の先輩が退職されることになり、部署のみんなで贈りました。普段から香りにこだわっている方だったので、Jo Maloneのボディクリームを選びました！リラックスできる香りで、パッケージも高級感があるのでギフトにぴったり。「お疲れ様でしたの気持ちが伝わって嬉しい」とすごく喜んでもらえました✨',
    likes: 38,
    wantCount: 24,
    giftCount: 14,
    gender: '女性',
    ageGroup: '30代',
    relationship: ['先輩'],
    scene: ['退職'],
    category: ['ボディケア'],
    authorName: '先輩Gifter_88',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-03-22T10:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥5,390',
  },
  {
    id: '2',
    title: '女友達の誕生日に、ずっと欲しがってたDiorのリップを。',
    productName: 'Dior アディクト リップ グロウ オイル',
    price: '〜5,000円',
    imageUrl: 'https://placehold.co/400x400/FFDAC1/FFF?text=Dior+Lip',
    images: [
      'https://placehold.co/800x800/FFDAC1/FFF?text=Dior+1',
      'https://placehold.co/800x800/FFB6B9/FFF?text=Dior+2',
    ],
    episode:
      '大学の親友が「ずっと欲しいと思ってる」とSNSでつぶやいていたのを発見。誕生日に合わせてプレゼントしました。限定色が手に入ったので、開けた瞬間に「うそ！！」と叫んでくれて、私も嬉しかったです。コスメはリサーチが大事！',
    likes: 62,
    wantCount: 45,
    giftCount: 17,
    gender: '女性',
    ageGroup: '20代後半',
    relationship: ['親友'],
    scene: ['誕生日'],
    category: ['コスメ'],
    authorName: 'コスメ好き同期',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-03-15T09:30:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥4,620',
  },
  {
    id: '3',
    title: '後輩の内定祝い。社会人スタートを応援する気持ちを込めて。',
    productName: 'PARKER ソネット ボールペン',
    price: '〜10,000円',
    imageUrl: 'https://placehold.co/400x400/E2F0CB/FFF?text=PARKER',
    images: ['https://placehold.co/800x800/E2F0CB/FFF?text=PARKER+Pen'],
    episode:
      'バイト先の後輩が第一志望に内定をもらったと報告してくれました。就活で何度も相談に乗っていたので、記念になるものを贈りたいと思い高級ボールペンに。「入社式で使う」と写真を送ってくれました。',
    likes: 29,
    wantCount: 18,
    giftCount: 11,
    gender: '男性',
    ageGroup: '20代前半',
    relationship: ['後輩'],
    scene: ['内定', '就職'],
    category: ['文房具'],
    authorName: '面倒見のいい先輩',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-03-10T14:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥8,800',
  },
  {
    id: '4',
    title: '母の日に、毎日使ってもらえる入浴剤セットを。',
    productName: 'バスクリン 至高のバスタイムギフト',
    price: '〜3,000円',
    imageUrl: 'https://placehold.co/400x400/B5E48C/FFF?text=Bath+Gift',
    images: ['https://placehold.co/800x800/B5E48C/FFF?text=Bath+Set'],
    episode:
      '毎日忙しくしている母へ、ゆっくりお風呂でリラックスしてほしいと思って選びました。色々な香りが試せるセットなので「飽きない」と喜んでくれました。毎年恒例にしようかと思っています！',
    likes: 44,
    wantCount: 30,
    giftCount: 14,
    gender: '女性',
    ageGroup: '50代〜',
    relationship: ['母'],
    scene: ['母の日'],
    category: ['入浴剤'],
    authorName: 'ゆっくりしてほしい子',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-03-08T11:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥2,800',
  },
  {
    id: '5',
    title: '同期の結婚祝い。実用的だけど特別感のあるものを探して。',
    productName: 'BALMUDA The Toaster トースター',
    price: '10,000円〜',
    imageUrl: 'https://placehold.co/400x400/CDB4DB/FFF?text=BALMUDA',
    images: ['https://placehold.co/800x800/CDB4DB/FFF?text=Toaster'],
    episode:
      '入社同期で仲良しだった友達の結婚祝いに、皆でお金を出し合ってBALMUDAのトースターを贈りました。「パンが美味しくて毎朝が楽しい」とメッセージをもらい、日常に溶け込んでいるのが嬉しかったです。',
    likes: 78,
    wantCount: 55,
    giftCount: 23,
    gender: '女性',
    ageGroup: '20代後半',
    relationship: ['同期'],
    scene: ['結婚'],
    category: ['ガジェット'],
    authorName: '同期一同より',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-03-01T09:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥33,000',
  },
  {
    id: '6',
    title: '推しへのプレゼント。好きなコーヒーブランドの詰め合わせ。',
    productName: 'BLUE BOTTLE COFFEE ギフトボックス',
    price: '〜5,000円',
    imageUrl: 'https://placehold.co/400x400/A2D2FF/FFF?text=Blue+Bottle',
    images: ['https://placehold.co/800x800/A2D2FF/FFF?text=Coffee+Box'],
    episode:
      '推しのYouTuberが配信でよくブルーボトルのコーヒーを飲んでいて、ファンミーティングで贈ることにしました。直接渡したときの反応が最高で、「ありがとう！好きなの知ってたの？」と言われました。',
    likes: 91,
    wantCount: 70,
    giftCount: 21,
    gender: '男性',
    ageGroup: '20代前半',
    relationship: ['趣味仲間'],
    scene: ['お礼', 'サプライズ'],
    category: ['コーヒー'],
    authorName: 'ファン歴3年',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-02-28T15:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥4,000',
  },
  {
    id: '7',
    title: '彼女のクリスマスに、ずっと欲しがっていたAesopを。',
    productName: 'Aesop レバレンス ハンドバーム',
    price: '〜5,000円',
    imageUrl: 'https://placehold.co/400x400/FFDAC1/FFF?text=Aesop',
    images: ['https://placehold.co/800x800/FFDAC1/FFF?text=Aesop+Hand'],
    episode:
      '彼女がずっと「試してみたい」と言っていたAesopのハンドバーム。おしゃれな瓶のデザインも気に入ってくれて、洗面台に飾ってくれています。香りも上品で、使うたびに思い出してもらえるのが嬉しいです。',
    likes: 53,
    wantCount: 35,
    giftCount: 18,
    gender: '女性',
    ageGroup: '20代後半',
    relationship: ['彼女'],
    scene: ['クリスマス', '記念日'],
    category: ['ハンドクリーム'],
    authorName: 'センス磨き中',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-02-20T13:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥4,070',
  },
  {
    id: '8',
    title: '祖父の喜寿に、家族でデジタルフォトフレームを贈った話。',
    productName: 'Meural デジタルフォトフレーム',
    price: '10,000円〜',
    imageUrl: 'https://placehold.co/400x400/FDE2E4/FFF?text=Photo+Frame',
    images: ['https://placehold.co/800x800/FDE2E4/FFF?text=Photo+Frame'],
    episode:
      '祖父の喜寿のお祝いに、孫一同でデジタルフォトフレームをプレゼントしました。スマホから写真を送れる機能があるので、毎週近況写真を送ると「見てるよ！」と電話が来るようになりました。距離が縮まった気がします。',
    likes: 34,
    wantCount: 20,
    giftCount: 14,
    gender: '男性',
    ageGroup: '50代〜',
    relationship: ['祖父'],
    scene: ['喜寿', '記念日'],
    category: ['ガジェット'],
    authorName: '孫代表',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-02-14T10:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥25,000',
  },
  {
    id: '9',
    title: '部下へのお疲れ様ギフト。プロジェクト完了後にそっと渡した。',
    productName: 'TWG ティーギフトセット',
    price: '〜5,000円',
    imageUrl: 'https://placehold.co/400x400/FBEA92/FFF?text=TWG+Tea',
    images: ['https://placehold.co/800x800/FBEA92/FFF?text=Tea+Gift'],
    episode:
      '半年かけた大きなプロジェクトが無事完了し、一番頑張ってくれた部下へ個人的に感謝を伝えたかったので渡しました。「紅茶が好きなんですよね」と話していたのを覚えていたのでTWGにしました。缶も可愛くて喜んでくれました。',
    likes: 47,
    wantCount: 32,
    giftCount: 15,
    gender: '女性',
    ageGroup: '20代後半',
    relationship: ['後輩', '部下'],
    scene: ['プロジェクト完了', 'お礼'],
    category: ['紅茶'],
    authorName: 'チームリーダー',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-02-10T16:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥4,500',
  },
  {
    id: '10',
    title: '父の日に初めてプレゼント。ずっと欲しいと言っていた革財布。',
    productName: 'GANZO スリムウォレット 二つ折り財布',
    price: '〜10,000円',
    imageUrl: 'https://placehold.co/400x400/B5E48C/FFF?text=Wallet',
    images: ['https://placehold.co/800x800/B5E48C/FFF?text=Leather+Wallet'],
    episode:
      '今まで父の日を特にお祝いしたことがなかったのですが、今年は思い切って財布をプレゼントしました。「ずっと欲しかったやつだ！」と子供みたいに喜んでいて、あの顔は忘れられません。来年も続けようと思います。',
    likes: 25,
    wantCount: 16,
    giftCount: 9,
    gender: '男性',
    ageGroup: '50代〜',
    relationship: ['父'],
    scene: ['父の日'],
    category: ['バッグ'],
    authorName: '不器用な娘',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-02-05T11:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥9,800',
  },
  {
    id: '11',
    title: '入学祝いのギフト。勉強用デスクライトを贈りました。',
    productName: 'BenQ ScreenBar モニターライト',
    price: '〜10,000円',
    imageUrl: 'https://placehold.co/400x400/BDE0FE/FFF?text=Desk+Light',
    images: ['https://placehold.co/800x800/BDE0FE/FFF?text=Monitor+Light'],
    episode:
      '従兄弟が大学に合格したので、受験勉強で使っていたデスクライトをグレードアップしてプレゼントしました。「目が疲れない！」と毎日使っているみたいです。実用的なギフトって長く使ってもらえるのが嬉しい。',
    likes: 33,
    wantCount: 22,
    giftCount: 11,
    gender: '男性',
    ageGroup: '10代',
    relationship: ['従兄弟'],
    scene: ['入学', '合格'],
    category: ['デスクライト', 'ガジェット'],
    authorName: '先輩いとこ',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-01-28T09:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥8,900',
  },
  {
    id: '12',
    title: '恩師の退職に、学年全員でまとめたメッセージ入りフォトブック。',
    productName: 'しまうまプリント フォトブック A4ハードカバー',
    price: '〜3,000円',
    imageUrl: 'https://placehold.co/400x400/FFB6B9/FFF?text=Photobook',
    images: ['https://placehold.co/800x800/FFB6B9/FFF?text=Photo+Book'],
    episode:
      'お世話になった高校の先生が退職されることになり、卒業生30人でメッセージと写真を集めてフォトブックを作りました。先生が受け取ったとき涙を流してくださって、みんな一緒に泣きました。値段より気持ちが大切だと実感しました。',
    likes: 105,
    wantCount: 80,
    giftCount: 25,
    gender: '指定なし',
    ageGroup: '50代〜',
    relationship: ['恩師', '先生'],
    scene: ['退職', '卒業'],
    category: ['ギフト券'],
    authorName: '卒業生代表',
    authorIcon: '/icons/cat.png',
    createdAt: '2026-01-20T12:00:00.000Z',
    amazonUrl: '#',
    rakutenUrl: '#',
    referencePrice: '¥2,200',
  },
];

function readDB(): DB {
  if (!existsSync(DB_PATH)) {
    const db: DB = { reviews: SEED_REVIEWS };
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    return db;
  }
  return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as DB;
}

function writeDB(db: DB): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export function getReviews(filters?: {
  scene?: string;
  relationship?: string;
  category?: string;
  gender?: string;
  ageGroup?: string;
  priceMin?: number;
  priceMax?: number;
  q?: string;
}): Review[] {
  let reviews = readDB().reviews;

  if (!filters) return reviews;

  if (filters.scene) {
    reviews = reviews.filter((r) => r.scene.includes(filters.scene!));
  }
  if (filters.relationship) {
    reviews = reviews.filter((r) =>
      r.relationship.includes(filters.relationship!)
    );
  }
  if (filters.category) {
    reviews = reviews.filter((r) => r.category.includes(filters.category!));
  }
  if (filters.gender && filters.gender !== '指定なし') {
    reviews = reviews.filter((r) => r.gender === filters.gender);
  }
  if (filters.ageGroup) {
    reviews = reviews.filter((r) => r.ageGroup === filters.ageGroup);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    reviews = reviews.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.episode.toLowerCase().includes(q)
    );
  }

  return reviews;
}

export function getReviewById(id: string): Review | undefined {
  return readDB().reviews.find((r) => r.id === id);
}

export function createReview(input: CreateReviewInput): Review {
  const db = readDB();
  const review: Review = {
    ...input,
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    likes: 0,
    wantCount: 0,
    giftCount: 0,
  };
  db.reviews.unshift(review);
  writeDB(db);
  return review;
}

export function incrementLike(
  id: string,
  type: 'want' | 'gift'
): Review | null {
  const db = readDB();
  const idx = db.reviews.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  if (type === 'want') db.reviews[idx].wantCount++;
  else db.reviews[idx].giftCount++;
  db.reviews[idx].likes =
    db.reviews[idx].wantCount + db.reviews[idx].giftCount;
  writeDB(db);
  return db.reviews[idx];
}
