import fs from 'fs';
import path from 'path';

const srcDir = './';
const destDir = './public/icons/';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Find maximum existing target index
let maxCount = 0;
const existFiles = fs.readdirSync(destDir);
for (const f of existFiles) {
  const match = f.match(/processed_icon-(\d+)\.png/);
  if (match) {
    const num = parseInt(match[1]);
    if (num > maxCount) maxCount = num;
  }
}

let count = maxCount + 1;
const files = fs.readdirSync(srcDir);
for (const file of files) {
  if (file.startsWith('processed_スクリーンショット') && file.endsWith('.png')) {
    const targetName = `processed_icon-${count}.png`;
    fs.renameSync(path.join(srcDir, file), path.join(destDir, targetName));
    count++;
  }
}
console.log(`Moved ${count - maxCount - 1} images.`);
