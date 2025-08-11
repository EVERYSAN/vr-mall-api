// api/concierge.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// まずは * にして通るか確認（認証もCookieも使ってないので検証用OK）
const setCORS = (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, method: 'GET' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = typeof req.body === 'string' ? (req.body ? JSON.parse(req.body) : {}) : (req.body || {});
  return res.status(200).json({ ok: true, echo: body?.message ?? null });
}
