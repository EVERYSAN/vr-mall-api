// ランタイムを明示（nodejs20.x か 18.x）
export const config = { runtime: 'nodejs20.x' };  // 18.xでもOK

const allow = new Set(['https://everysan.github.io', 'http://localhost:5173']);

function setCORS(res, origin) {
  if (origin && allow.has(origin)) {
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

    // ここはそのままでOK（ダミー応答 or OpenAI呼び出し）
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const q = body?.message || '（質問なし）';
    return res.status(200).json({ reply: `（テスト応答）「${q}」ですね。入口から本屋までご案内します！` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}


module.exports = async (req, res) => {
  try {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENAI_API_KEY;

    // キー未設定でもCORS動作確認できるように仮応答
    if (!apiKey) {
      return res.status(200).json({ reply: '（仮応答）OPENAI_API_KEY が未設定です。Vercel 環境変数を設定してください。' });
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
  } catch (e) {
    return res.status(500).json({ error: 'server_error', detail: String(e && e.message ? e.message : e) });
  }
};
