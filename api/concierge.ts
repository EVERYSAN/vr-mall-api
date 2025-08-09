import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- CORS ---
  const allowed = ['https://everysan.github.io', 'http://localhost:5173'];
  const origin = req.headers.origin as string | undefined;
  if (origin && allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'missing_api_key', detail: 'OPENAI_API_KEY is not set' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { message, context } = body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  // --- Abort（タイムアウト） ---
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 25_000); // 25sで中断

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'あなたはショッピングモールの案内係。簡潔に提案し、入口/本屋などの移動指示も返す。' },
          { role: 'user', content: `${message}\n\ncontext: ${JSON.stringify(context ?? {})}` }
        ],
        temperature: 0.7
      }),
      signal: ac.signal
    });

    clearTimeout(timeout);

    if (!r.ok) return res.status(500).json({ error: 'openai_error', detail: await r.text() });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? '（案内を生成できませんでした）';
    return res.status(200).json({ reply });
  } catch (e: any) {
    clearTimeout(timeout);
    const detail = e?.name === 'AbortError' ? 'timeout' : String(e?.message || e);
    return res.status(500).json({ error: 'server_error', detail });
  }
}
