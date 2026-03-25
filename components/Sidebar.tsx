"use client";

import { useSearch } from './SearchProvider';

const BUDGET_OPTIONS = [
  { label: '〜3,000円', value: '〜3,000円' },
  { label: '3,000円〜5,000円', value: '3,000円〜5,000円' },
  { label: '5,000円〜10,000円', value: '5,000円〜10,000円' },
  { label: '10,000円〜50,000円', value: '10,000円〜50,000円' },
  { label: '50,000円〜100,000円', value: '50,000円〜100,000円' },
  { label: '100,000円〜', value: '100,000円〜' },
];

const GENDER_OPTIONS = ['女性', '男性', '指定なし'];

const AGE_OPTIONS = [
  '10代', '20代前半', '20代後半', '30代', '40代', '50代〜',
];

export default function Sidebar() {
  const { activeFilters, addFilter, removeFilter } = useSearch();

  const isActive = (key: string, value: string) =>
    activeFilters.includes(`${key}: ${value}`);

  const toggle = (key: string, value: string) => {
    const filter = `${key}: ${value}`;
    if (activeFilters.includes(filter)) {
      removeFilter(filter);
    } else {
      if (key === '性別') {
        GENDER_OPTIONS.forEach((g) => removeFilter(`性別: ${g}`));
      }
      addFilter(filter);
    }
  };

  return (
    <aside className="hidden lg:block w-56 flex-shrink-0 pr-6 border-r border-border-light min-h-[calc(100vh-140px)]">
      <div className="sticky top-32 space-y-8">

        {/* Budget */}
        <div>
          <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>
              <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2z"/>
            </svg>
            予算から絞り込む
          </h3>
          <div className="space-y-2">
            {BUDGET_OPTIONS.map(({ label, value }) => {
              const active = isActive('予算', value);
              return (
                <label
                  key={value}
                  className={`flex items-center gap-2 text-sm cursor-pointer transition-colors ${
                    active ? 'text-primary font-semibold' : 'text-text-sub hover:text-primary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle('予算', value)}
                    className="rounded border-border-light text-primary focus:ring-primary accent-primary"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>

        {/* Gender */}
        <div>
          <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 1a4 4 0 1 0 0 8 4 4 0 0 0 0-8M3 5a5 5 0 1 1 5.5 4.975V12h2a.5.5 0 0 1 0 1h-2v2.5a.5.5 0 0 1-1 0V13h-2a.5.5 0 0 1 0-1h2V9.975A5 5 0 0 1 3 5"/>
            </svg>
            性別
          </h3>
          <div className="flex bg-background-soft rounded-lg p-1">
            {GENDER_OPTIONS.map((g) => {
              const active = isActive('性別', g);
              return (
                <button
                  key={g}
                  onClick={() => toggle('性別', g)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    active
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-text-sub hover:bg-white hover:shadow-sm'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Age */}
        <div>
          <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664z"/>
            </svg>
            年齢
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {AGE_OPTIONS.map((age) => {
              const active = isActive('年齢', age);
              return (
                <label
                  key={age}
                  className={`flex items-center gap-2 text-xs cursor-pointer transition-colors ${
                    active ? 'text-primary font-semibold' : 'text-text-sub hover:text-primary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle('年齢', age)}
                    className="rounded border-border-light text-primary focus:ring-primary accent-primary"
                  />
                  {age}
                </label>
              );
            })}
          </div>
        </div>

      </div>
    </aside>
  );
}
