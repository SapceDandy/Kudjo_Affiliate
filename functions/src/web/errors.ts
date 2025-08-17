import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'validation_error', details: err.flatten() });
  }
  const status = err?.status || 500;
  const code = err?.code || 'internal_error';
  const message = err?.message || 'Internal Server Error';
  res.status(status).json({ error: code, message });
} 