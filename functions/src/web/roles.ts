import { Request, Response, NextFunction } from 'express';

export function requireRole(role: 'influencer' | 'business' | 'admin') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { uid: string; role: string } | undefined;
    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    if (user.role !== role && user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden', message: `Requires role ${role}` });
    }
    next();
  };
} 