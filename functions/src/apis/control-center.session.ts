import { Request, Response } from 'express';

export async function handleControlCenterSession(req: Request, res: Response): Promise<void> {
  const user = (req as any).user as { uid: string; role: string } | undefined;

  if (!user) {
    res.status(401).json({ isAdmin: false });
    return;
  }

  if (user.role !== 'admin') {
    res.status(403).json({ isAdmin: false });
    return;
  }

  res.status(200).json({ isAdmin: true, uid: user.uid });
}
