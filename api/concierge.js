// Node ランタイムを明示（18 or 20）
export const config = { runtime: 'nodejs20.x' };

const ALLOW = new Set([
  'https://everysan.github.io',
  'http://localhost:5173'
]);

function setCORS(res, origin) {
  if (origin && ALLOW.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  try {
    const origin = req.headers.origin;
    setCORS(res, origin);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const q = body?.message || '（質問なし）';

    // まずはダミー応答（通信確認用）
    return res.status(200).json({
      reply: `（テスト応答）「${q}」ですね。入口から本屋に進むとおすすめが並んでいます！`
    });

    // ※ OpenAI を使う版に切り替えるときは、ここに fetch を追加
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error', detail: String(e?.message || e) });
  }
}
