// api/concierge.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOW = ['https://everysan.github.io', 'http://localhost:5173'];

function setCORS(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  if (ALLOW.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // 必要に応じて
  // res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  // GET も許可して、ブラウザ/ターミナルからの動作確認を容易にする
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, method: 'GET' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // ここではダミー応答（CORSだけ確認する目的）
  const body = typeof req.body === 'string' ? (req.body ? JSON.parse(req.body) : {}) : (req.body || {});
  return res.status(200).json({ ok: true, echo: body?.message ?? null });
}
