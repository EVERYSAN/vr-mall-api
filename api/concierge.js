// api/concierge.js  — Vercel (Node.js runtime) 用
export const config = { runtime: 'nodejs' };

const ALLOWED = [
  'https://everysan.github.io',   // 本番（GitHub Pages）
  'http://localhost:5173',        // 開発（Vite）
];

function setCORS(res, originHeader) {
  const origin = originHeader && ALLOWED.includes(originHeader) ? originHeader : ALLOWED[0];
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  // CORS は最初に必ず付ける（以降の分岐/エラーでも残る）
  setCORS(res, req.headers.origin);

  // 事前フライト
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { message, context } = body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY; // ← Vercel でこの名前にしたのでこれを使う
    if (!apiKey) {
      // 環境変数未設定時でも CORS 付きで返す
      return res.status(500).json({ error: 'OPENAI_API_KEY is missing on server' });
    }

    // OpenAI Chat Completions (gpt-4o-mini)
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'あなたはVRショッピングモールの案内係。簡潔に親切に答え、必要なら「入口」「本屋」などの移動指示も提案する。' },
          { role: 'user', content: `${message}\n\ncontext: ${JSON.stringify(context || {})}` },
        ],
      }),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return res.status(502).json({ error: 'openai_error', detail: txt });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? '（案内を生成できませんでした）';
    return res.status(200).json({ reply });
  } catch (e) {
    // ここでも CORS は既に付いている
    return res.status(500).json({ error: 'server_error', detail: String(e?.message || e) });
  }
}
