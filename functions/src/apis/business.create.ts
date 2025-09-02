import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';

const BusinessCreateSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(100, 'Business name too long'),
  address: z.string().min(5, 'Address must be at least 5 characters').max(200, 'Address too long'),
  posProvider: z.enum(['square', 'manual', 'clover'], { required_error: 'POS provider is required' }),
  defaultSplitPct: z.number().min(0, 'Split percentage cannot be negative').max(100, 'Split percentage cannot exceed 100%'),
  geo: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  description: z.string().max(500, 'Description too long').optional(),
  website: z.string().url('Invalid website URL').optional(),
});

export async function handleBusinessCreate(req: Request, res: Response) {
  try {
    const validatedData = BusinessCreateSchema.parse(req.body);
    const { name, address, posProvider, defaultSplitPct, geo, description, website } = validatedData;
    const uid = (req as any).user.uid as string;
    const doc = await admin.firestore().collection('businesses').add({
      ownerUid: uid,
      name,
      address,
      description: description || null,
      website: website || null,
      geo: geo || null,
      posProvider,
      posStatus: 'disconnected',
      defaultSplitPct,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    res.json({ bizId: doc.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'validation_error', 
        details: error.flatten() 
      });
    }
    
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
} 