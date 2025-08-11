// /api/concierge.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://everysan.github.io',   // GitHub Pages
  'http://localhost:5173'         // ローカル開発（vite）
];

// CORS ヘッダーを必ず返す（preflight/本リクエスト両方）
function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string | undefined) || '';
  const allow =
    ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o))
      ? origin
      : ALLOWED_ORIGINS[0]; // 必要なら '*' にしてもOK

  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

  // Preflight（ブラウザが先に投げる確認リクエスト）
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 文字列/未定義の両対応で body を取り出す
  let body: any = req.body ?? {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {/* 無視 */}
  }

  const { message, context } = body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    // --- OpenAI へプロキシ ---
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'あなたはVRショッピングモールの案内係。簡潔に提案し、入口/本屋などの移動ヒントも返す。'
          },
          {
            role: 'user',
            content: `${message}\n\ncontext: ${JSON.stringify(context ?? {})}`
          }
        ],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(500).json({ error: 'openai_error', detail });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? '（案内を生成できませんでした）';
    return res.status(200).json({ reply });
  } catch (e: any) {
    return res.status(500).json({ error: 'server_error', detail: String(e?.message || e) });
  }
}
