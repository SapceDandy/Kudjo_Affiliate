import { Request, Response } from 'express';

export async function handleOutreachWebhook(_req: Request, res: Response) {
  res.status(200).send('ok');
} 