import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-static';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  const iconBuffer = await readFile(join(process.cwd(), 'public', 'icons', 'title-cat.png'));
  const base64 = iconBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <img
          src={dataUrl}
          width={32}
          height={32}
          style={{
            filter: 'brightness(0)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
