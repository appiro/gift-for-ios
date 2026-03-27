"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "./SearchProvider";

const TABS = ["シーン", "カテゴリ", "関係", "予算", "詳細"] as const;
type Tab = typeof TABS[number];

const SCENE_GROUPS = [
  { label: "節目・お祝い", items: ["誕生日", "結婚", "出産", "入学", "卒業", "就職", "内定", "転職", "昇進", "開業", "新築", "引っ越し", "退職"] },
  { label: "感謝・気持ち", items: ["お礼", "お詫び", "応援", "激励", "慰め", "おつかれさま", "快気祝い", "お見舞い", "仲直り"] },
  { label: "季節・イベント", items: ["クリスマス", "バレンタイン", "ホワイトデー", "母の日", "父の日", "敬老の日", "ハロウィン", "お中元", "お歳暮", "お年賀"] },
  { label: "特別な日", items: ["送別会", "歓迎会", "記念日", "サプライズ", "プロポーズ", "結婚記念日"] },
  { label: "長寿祝い", items: ["還暦", "古希", "喜寿", "米寿"] },
  { label: "達成", items: ["合格", "目標達成", "資格取得", "発表成功", "プロジェクト完了"] },
  { label: "日常", items: ["ちょっとしたお礼", "手土産", "ご褒美", "プチギフト", "気分転換", "その他"] },
];

const CATEGORY_GROUPS = [
  { label: "大カテゴリ", items: ["ファッション", "小物・雑貨", "グルメ・食品", "ビューティ", "インテリア", "テクノロジー", "アウトドア・スポーツ", "本・音楽・エンタメ", "体験・サービス"] },
  { label: "グルメ", items: ["スイーツ", "お菓子", "おつまみ", "お酒", "コーヒー", "紅茶", "ドリンク", "高級調味料", "お取り寄せ", "フルーツ", "グルメセット"] },
  { label: "ビューティ・ヘルス", items: ["ハンドクリーム", "入浴剤", "ボディケア", "スキンケア", "コスメ", "香水", "サプリメント", "フレグランス", "ネイル"] },
  { label: "インテリア・ホーム", items: ["キャンドル", "ディフューザー", "アロマ", "デスクライト", "観葉植物", "クッション", "タオル", "キッチン用品", "食器"] },
  { label: "ファッション・小物", items: ["ウェア", "スニーカー", "帽子", "マフラー", "手袋", "タンブラー", "マグカップ", "靴下", "ハンカチ", "ネクタイ", "アクセサリー", "ジュエリー", "ポーチ", "バッグ", "財布", "キーケース"] },
  { label: "テック・ガジェット", items: ["ガジェット", "スマートウォッチ", "イヤホン", "充電器", "スマホアクセサリー"] },
  { label: "その他", items: ["文房具", "手帳", "本", "マンガ", "ギフト券", "食事券", "スパ券", "体験チケット", "旅行", "その他"] },
];

const WHO_GROUPS = [
  { label: "友人・知人", items: ["友人", "親友", "幼なじみ", "先輩", "後輩", "同期", "知人"] },
  { label: "家族", items: ["親", "父", "母", "兄弟", "姉妹", "祖父", "祖母", "親戚", "叔父", "叔母", "従兄弟"] },
  { label: "パートナー", items: ["彼氏", "彼女", "夫", "妻", "婚約者", "片思いの相手"] },
  { label: "職場・学校", items: ["上司", "部下", "同僚", "恩師", "先生", "教授", "チームメンバー"] },
  { label: "その他", items: ["サークル仲間", "バイト仲間", "趣味仲間", "ご近所さん", "チームメイト", "自分へのご褒美", "その他"] },
];

const BUDGET_OPTIONS = [
  { label: "〜3,000円", value: "〜3,000円" },
  { label: "3,000円〜5,000円", value: "3,000円〜5,000円" },
  { label: "5,000円〜10,000円", value: "5,000円〜10,000円" },
  { label: "10,000円〜", value: "10,000円〜" },
];
const GENDER_OPTIONS = ["女性", "男性", "指定なし"];
const AGE_OPTIONS = ["10代", "20代前半", "20代後半", "30代", "40代", "50代〜"];

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

export default function MobileFilterSheet({ open, onClose, initialTab = "シーン" }: Props) {
  const { activeFilters, addFilter, removeFilter, clearFilters } = useSearch();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const isActive = (key: string, value: string) => activeFilters.includes(`${key}: ${value}`);

  const toggle = (key: string, value: string) => {
    const filter = `${key}: ${value}`;
    if (activeFilters.includes(filter)) {
      removeFilter(filter);
    } else {
      if (key === "性別") GENDER_OPTIONS.forEach((g) => removeFilter(`性別: ${g}`));
      addFilter(filter);
    }
  };

  function GroupedChips({ groups, filterKey }: { groups: { label: string; items: string[] }[]; filterKey: string }) {
    return (
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-text-sub uppercase tracking-wide mb-2">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => {
                const active = isActive(filterKey, item);
                return (
                  <button
                    key={item}
                    onClick={() => toggle(filterKey, item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-border-light bg-white text-text-sub"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background-card rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "82vh", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border-light" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-light flex-shrink-0">
              <h2 className="font-bold text-text-main text-sm">絞り込み</h2>
              <div className="flex items-center gap-3">
                {activeFilters.length > 0 && (
                  <button onClick={clearFilters} className="text-xs text-text-sub underline">
                    リセット（{activeFilters.length}）
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-background-soft text-text-sub"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 16 16">
                    <line x1="2" y1="14" x2="14" y2="2" /><line x1="2" y1="2" x2="14" y2="14" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border-light overflow-x-auto hide-scrollbar flex-shrink-0">
              {TABS.map((tab) => {
                const count = activeFilters.filter((f) => {
                  if (tab === "シーン") return f.startsWith("シーン: ");
                  if (tab === "カテゴリ") return f.startsWith("カテゴリ: ");
                  if (tab === "関係") return f.startsWith("関係: ");
                  if (tab === "予算") return f.startsWith("予算: ");
                  if (tab === "詳細") return f.startsWith("性別: ") || f.startsWith("年齢: ");
                  return false;
                }).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-text-sub"
                    }`}
                  >
                    {tab}
                    {count > 0 && (
                      <span className="ml-1 bg-primary text-white rounded-full px-1.5 py-0.5 text-[9px]">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-4 py-4 pb-6">
              {activeTab === "シーン" && <GroupedChips groups={SCENE_GROUPS} filterKey="シーン" />}
              {activeTab === "カテゴリ" && <GroupedChips groups={CATEGORY_GROUPS} filterKey="カテゴリ" />}
              {activeTab === "関係" && <GroupedChips groups={WHO_GROUPS} filterKey="関係" />}

              {activeTab === "予算" && (
                <div className="flex flex-wrap gap-2">
                  {BUDGET_OPTIONS.map(({ label, value }) => {
                    const active = isActive("予算", value);
                    return (
                      <button
                        key={value}
                        onClick={() => toggle("予算", value)}
                        className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all active:scale-95 ${
                          active ? "border-primary bg-primary text-white" : "border-border-light bg-white text-text-sub"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "詳細" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-text-sub uppercase tracking-wide mb-3">性別</h3>
                    <div className="flex bg-background-soft rounded-xl p-1 gap-1">
                      {GENDER_OPTIONS.map((g) => {
                        const active = isActive("性別", g);
                        return (
                          <button
                            key={g}
                            onClick={() => toggle("性別", g)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                              active ? "bg-white text-primary shadow-sm" : "text-text-sub"
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text-sub uppercase tracking-wide mb-3">年齢</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {AGE_OPTIONS.map((age) => {
                        const active = isActive("年齢", age);
                        return (
                          <button
                            key={age}
                            onClick={() => toggle("年齢", age)}
                            className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
                              active ? "border-primary bg-primary text-white" : "border-border-light bg-white text-text-sub"
                            }`}
                          >
                            {age}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Apply */}
            <div className="px-4 pt-3 pb-4 border-t border-border-light flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full py-3 bg-primary text-white rounded-full font-bold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                この条件で絞り込む
                {activeFilters.length > 0 && ` (${activeFilters.length}件)`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
