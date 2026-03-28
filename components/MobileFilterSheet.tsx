"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "./SearchProvider";
import { SCENE_GROUPS, CATEGORY_GROUPS, WHO_GROUPS } from "@/lib/constants";

const TABS = ["シーン", "カテゴリ", "関係", "予算", "詳細"] as const;
type Tab = typeof TABS[number];

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
