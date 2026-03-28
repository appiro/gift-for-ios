type Likelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
const FLAGGED: Likelihood[] = ['LIKELY', 'VERY_LIKELY'];

export async function moderateImage(imageUrl: string): Promise<{ safe: boolean; reason?: string }> {
  const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  if (!apiKey) return { safe: true };

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [{ type: 'SAFE_SEARCH_DETECTION' }],
        }],
      }),
    }
  );

  if (!res.ok) return { safe: true };

  const data = await res.json();
  const s = data.responses?.[0]?.safeSearchAnnotation;
  if (!s) return { safe: true };

  if (FLAGGED.includes(s.adult))    return { safe: false, reason: '不適切な画像が含まれています' };
  if (FLAGGED.includes(s.violence)) return { safe: false, reason: '暴力的な画像が含まれています' };
  if (FLAGGED.includes(s.racy))     return { safe: false, reason: '不適切な画像が含まれています' };

  return { safe: true };
}
