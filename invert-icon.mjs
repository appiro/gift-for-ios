import Jimp from 'jimp';

async function main() {
  try {
    const image = await Jimp.read('public/icons/title-cat.png');
    image.invert();
    await image.writeAsync('public/icons/title-cat.png');
    console.log('Inverted successfully');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
