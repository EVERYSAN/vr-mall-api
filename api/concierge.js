// ✅ これに直す（または、この行ごと削除でもOK）
export const config = { runtime: 'nodejs' };

const ALLOW = new Set([
  'https://everysan.github.io',
  'http://localhost:5173',
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

    // 通信確認用のダミー応答
    return res.status(200).json({
      reply: `（テスト応答）「${q}」ですね。入口から本屋に進むとおすすめが並んでいます！`
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error', detail: String(e?.message || e) });
  }
}
