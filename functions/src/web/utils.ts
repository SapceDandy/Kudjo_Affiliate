import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void> | void,
  bodySchema?: z.ZodTypeAny
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (bodySchema && req.method !== 'GET') {
        req.body = bodySchema.parse(req.body);
      }
      await Promise.resolve(handler(req, res));
    } catch (err) {
      next(err);
    }
  };
} 