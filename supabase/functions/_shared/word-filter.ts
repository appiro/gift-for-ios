const NG_WORDS = [
  'バカ', 'ばか', '馬鹿', 'アホ', 'あほ', '阿呆',
  'ボケ', 'ぼけ', 'クズ', 'くず', 'ゴミ', 'ごみ',
  'キモい', 'きもい', 'キモ', 'うざい', 'ウザい', 'ウザ',
  'むかつく', 'ムカつく', 'だまれ', '黙れ',
  '死ね', 'しね', '殺す', 'ころす', '殺すぞ', '消えろ',
  'チョン', 'チャンコロ',
];

export function containsNgWord(text: string): boolean {
  return NG_WORDS.some((w) => text.includes(w));
}
