import { Request, Response } from 'express';

export async function handleControlCenterLogout(_req: Request, res: Response): Promise<void> {
  res.cookie('__session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  res.status(200).json({ success: true });
}
