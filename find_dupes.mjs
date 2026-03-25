import fs from 'fs';
import path from 'path';

const dir = './public/icons/';
const files = fs.readdirSync(dir).filter(f => f.startsWith('processed_icon-') && f.endsWith('.png'));

const sizes = {};
const duplicates = [];

for (const file of files) {
  const stat = fs.statSync(path.join(dir, file));
  if (sizes[stat.size]) {
    sizes[stat.size].push(file);
    duplicates.push(sizes[stat.size]);
  } else {
    sizes[stat.size] = [file];
  }
}

console.log('Duplicates by size:');
let hasDupes = false;
for (const [size, fList] of Object.entries(sizes)) {
  if (fList.length > 1) {
    console.log(`Size ${size} bytes:`, fList);
    hasDupes = true;
  }
}
if (!hasDupes) console.log('No exact size duplicates found.');
