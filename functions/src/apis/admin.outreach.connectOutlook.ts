import { Request, Response } from 'express';

export async function handleOutlookConnect(_req: Request, res: Response) {
  // MVP: Return a placeholder URL the frontend can direct users to.
  res.json({ authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize' });
} 