import fs from 'fs';
import path from 'path';

const destDir = './public/icons/';

const allFiles = fs.readdirSync(destDir).filter(f => f.endsWith('.png'));

// Temporarily rename all to avoid collisions
let index = 1;
for (const file of allFiles) {
  const tempName = `temp_rename_icon_${index}.png`;
  fs.renameSync(path.join(destDir, file), path.join(destDir, tempName));
  index++;
}

// Rename back into canonical processed_icon-X.png format
const tempFiles = fs.readdirSync(destDir).filter(f => f.startsWith('temp_rename_icon_'));
index = 1;

for (const file of tempFiles) {
  const canonicalName = `processed_icon-${index}.png`;
  fs.renameSync(path.join(destDir, file), path.join(destDir, canonicalName));
  index++;
}

console.log(`Successfully normalized ${index - 1} total images into consecutive identifiers.`);
