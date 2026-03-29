import { corsHeaders } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabase.ts';

// APNs JWT 認証用
async function getApnsJwt(): Promise<string> {
  const keyId = Deno.env.get('APNS_KEY_ID')!;
  const teamId = Deno.env.get('APNS_TEAM_ID')!;
  const privateKeyPem = Deno.env.get('APNS_PRIVATE_KEY')!;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: now };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // PEM から秘密鍵をインポート
  const pemBody = privateKeyPem.replace(/-----.*-----/g, '').replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signingInput}.${sig}`;
}

async function sendApns(token: string, title: string, body: string, data?: Record<string, string>) {
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.giftfor.app';
  const apnsHost = Deno.env.get('APNS_PRODUCTION') === 'true'
    ? 'api.push.apple.com'
    : 'api.sandbox.push.apple.com';

  const jwt = await getApnsJwt();

  const payload = {
    aps: { alert: { title, body }, sound: 'default', badge: 1 },
    ...data,
  };

  const res = await fetch(`https://${apnsHost}/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return res;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = adminClient();
    const { user_id, title, body, data } = await req.json() as {
      user_id: string;
      title: string;
      body: string;
      data?: Record<string, string>;
    };

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'user_id, title, body are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ユーザーのデバイストークンを取得
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', user_id);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 各トークンに送信
    const results = await Promise.allSettled(
      tokens.map((t: { token: string; platform: string }) =>
        t.platform === 'ios' ? sendApns(t.token, title, body, data) : Promise.resolve()
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
