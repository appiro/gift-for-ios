import fs from 'fs';
import path from 'path';

const destDir = './public/icons/';

const files = fs.readdirSync(destDir).filter(f => f.startsWith('processed_icon-') && f.endsWith('.png'));

// Sort files by the numeric index they currently have
files.sort((a, b) => {
  const numA = parseInt(a.match(/processed_icon-(\d+)\.png/)[1]);
  const numB = parseInt(b.match(/processed_icon-(\d+)\.png/)[1]);
  return numA - numB;
});

// Rename them sequentially starting from 1 to avoid broken links
let index = 1;
for (const file of files) {
  const expectedName = `processed_icon-${index}.png`;
  if (file !== expectedName) {
    // To prevent conflicts during renaming (e.g. renaming 10 to 9 when 9 exists, though we know gaps exist), 
    // we can use a temp name if needed, but since we are sequentially packing downwards to fill gaps, 
    // the target name `index` is always <= current natural index, so it will never overwrite an unprocessed future file.
    fs.renameSync(path.join(destDir, file), path.join(destDir, expectedName));
  }
  index++;
}
console.log(`Normalized ${index - 1} images.`);
