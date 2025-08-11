// api/concierge.ts
const ALLOW = ['https://everysan.github.io', 'http://localhost:5173'];

function setCors(req: any, res: any) {
  const origin = (req.headers.origin as string) || '';
  if (ALLOW.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: any, res: any) {
  try {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // まずは落とさず返す（CORS動作確認用の仮応答）
      return res.status(200).json({ reply: '（仮応答）OPENAI_API_KEY が未設定です。Vercel の環境変数を設定してください。' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { message, context } = body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'あなたはショッピングモールの案内係。簡潔に提案し、入口/本屋などの移動指示も返す。' },
          { role: 'user', content: `${message}\n\ncontext: ${JSON.stringify(context ?? {})}` },
        ],
        temperature: 0.7,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(502).json({ error: 'openai_error', detail });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? '（案内を生成できませんでした）';
    return res.status(200).json({ reply });
  } catch (e: any) {
    return res.status(500).json({ error: 'server_error', detail: String(e?.message || e) });
  }
}
