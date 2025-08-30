import { Request, Response } from 'express';

export async function handleInfluencerOAuthStart(req: Request, res: Response) {
  const { provider } = req.query as any; // 'tiktok' | 'instagram'
  if (!provider || !['tiktok', 'instagram'].includes(provider)) {
    res.status(400).json({ error: 'invalid_provider' });
    return;
  }
  // Stub: redirect to provider OAuth authorize URL (to be implemented)
  res.json({ url: `/oauth/${provider}/authorize` });
}



