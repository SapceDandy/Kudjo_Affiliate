import { z } from "zod";
import { getFirestore } from 'firebase-admin/firestore';

// Define OfferSchema to match the coupon structure
export const OfferSchema = z.object({
  merchantId: z.string(),
  type: z.enum(["percent", "fixed", "bogo", "free_item", "time_window"]),
  value: z.number().min(0).max(100), // percentage or fixed amount
  minOrder: z.number().min(0).default(0),
  window: z.string().nullable().default(null), // e.g., "11:30-13:30"
  description: z.string().optional(),
  validDays: z.array(z.string()).optional(),
});

export type NegotiationPreview = {
  reply_text: string;                 // SMS-friendly, <= ~50 tokens
  offer: z.infer<typeof OfferSchema>; // normalized, values already clamped
  reason?: string;                    // optional debug note for receipts
};

export async function getMerchantCaps(merchantId: string) {
  const db = getFirestore();
  const doc = await db.collection('businesses').doc(merchantId).get();
  
  if (!doc.exists) {
    throw new Error(`Merchant ${merchantId} not found`);
  }
  
  const data = doc.data();
  return data?.caps || {
    maxPctOff: 20,
    minSpend: 0,
    validDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    maxDaily: 50
  };
}

export function clampOfferToCaps(offer: z.infer<typeof OfferSchema>, caps: any): z.infer<typeof OfferSchema> {
  const clamped = { ...offer };
  
  // Clamp percentage offers to maxPctOff
  if (clamped.type === "percent" || clamped.type === "time_window") {
    clamped.value = Math.min(clamped.value, caps.maxPctOff || 20);
  }
  
  // Ensure minOrder meets minSpend requirement
  clamped.minOrder = Math.max(clamped.minOrder, caps.minSpend || 0);
  
  // Inherit valid days if not specified
  if (!clamped.validDays && caps.validDays) {
    clamped.validDays = caps.validDays;
  }
  
  return clamped;
}

export async function proposeOfferOnce(params: {
  userId: string;
  merchantId: string;
  query: string;          // e.g., "spaghetti" / "lunch deal"
  daypart?: "breakfast"|"lunch"|"dinner";
}): Promise<NegotiationPreview> {
  const caps = await getMerchantCaps(params.merchantId);
  
  // Choose a template based on daypart & query; start with anchor tactic
  const draft = OfferSchema.parse({
    merchantId: params.merchantId,
    type: params.daypart === "lunch" ? "time_window" : "percent",
    value: params.daypart === "lunch" ? 15 : 10, // anchor
    minOrder: params.daypart === "lunch" ? 15 : 0,
    window: params.daypart === "lunch" ? "11:30-13:30" : null,
    description: params.daypart === "lunch" ? "Lunch special" : "General discount",
  });

  const clamped = clampOfferToCaps(draft, caps); // never exceed maxPctOff/minSpend/etc.

  return {
    reply_text: params.daypart === "lunch"
      ? `How about ${clamped.value}% off lunch ${clamped.window}? Accept or counter?` 
      : `I can do ${clamped.value}% off today. Accept or counter?`,
    offer: clamped,
    reason: "anchor→clamp(caps)",
  };
}
