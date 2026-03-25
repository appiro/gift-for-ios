// サーバーサイドの不適切ワードフィルター
const NG_WORDS = [
  // 侮辱系
  'バカ', 'ばか', '馬鹿', 'アホ', 'あほ', '阿呆',
  'ボケ', 'ぼけ', 'クズ', 'くず', 'ゴミ', 'ごみ',
  'キモい', 'きもい', 'キモ', 'うざい', 'ウザい', 'ウザ',
  'むかつく', 'ムカつく', 'だまれ', '黙れ',
  // 暴力・脅迫系
  '死ね', 'しね', '殺す', 'ころす', '殺すぞ', '消えろ',
  // 差別系（一部）
  'チョン', 'チャンコロ',
];

/** テキストにNGワードが含まれるか */
export function containsNgWord(text: string): boolean {
  return NG_WORDS.some((w) => text.includes(w));
}

/** NGワードを *** でマスク */
export function maskNgWords(text: string): string {
  let result = text;
  for (const w of NG_WORDS) {
    result = result.split(w).join('*'.repeat(w.length));
  }
  return result;
}
