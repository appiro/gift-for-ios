const MAX_WIDTH = 1200;
const SKIP_THRESHOLD = 500 * 1024;   // 500KB 以下はそのまま通す
const TARGET_SIZE   = 800 * 1024;    // 800KB を上限に圧縮
const QUALITY       = 0.8;

/**
 * 画像ファイルを圧縮して Blob を返す。
 *  - 500KB 以下: 無加工
 *  - 横幅 > 1200px: アスペクト比を保ってリサイズ
 *  - リサイズ後も 800KB 超: quality=0.8 で再圧縮
 *  - HEIC など非 Web フォーマット: JPEG に変換
 */
export async function compressImage(file: File): Promise<File> {
  // 500KB 以下かつ Web 対応フォーマットならそのまま返す
  const isWebFormat = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
  if (file.size <= SKIP_THRESHOLD && isWebFormat) {
    return file;
  }

  // ① ImageBitmap でデコード（HEIC も OS レベルで対応している環境では動く）
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // デコード失敗の場合はそのまま返す（環境非対応）
    return file;
  }

  // ② リサイズ計算
  let { width, height } = bitmap;
  if (width > MAX_WIDTH) {
    height = Math.round((height * MAX_WIDTH) / width);
    width  = MAX_WIDTH;
  }

  // ③ Canvas に描画
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // ④ 出力フォーマットを決定（WebP 対応ブラウザなら WebP、それ以外は JPEG）
  const outputType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg';

  // ⑤ まず quality=1 で変換し、800KB 超なら quality=0.8 で再圧縮
  const blobHigh = await canvasToBlob(canvas, outputType, 1.0);
  const blob = blobHigh.size > TARGET_SIZE
    ? await canvasToBlob(canvas, outputType, QUALITY)
    : blobHigh;

  const ext  = outputType === 'image/webp' ? 'webp' : 'jpg';
  const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
  return new File([blob], name, { type: outputType });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')),
      type,
      quality
    );
  });
}
