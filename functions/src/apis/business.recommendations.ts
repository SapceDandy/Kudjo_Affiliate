import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { generateRecommendationCopy } from '../utils/claude';

interface DealSuggestion {
  title: string;
  splitPct: number;
  targetTiers: string[];
  estimatedRoas: number;
  confidence: number;
  reasoning?: string;
}

export async function handleBusinessRecommendations(req: Request, res: Response): Promise<void> {
  const bizId = req.query.bizId as string;
  if (!bizId) {
    res.status(400).json({ error: 'bizId required' });
    return;
  }

  const db = admin.firestore();

  // 1. Fetch business profile
  const bizDoc = await db.collection('businesses').doc(bizId).get();
  if (!bizDoc.exists) {
    res.status(404).json({ error: 'Business not found' });
    return;
  }
  const biz = bizDoc.data()!;
  const cuisine = biz.cuisine || biz.category || 'general';
  const avgTicket = biz.avgTicket || biz.avgTicketCents || 2500; // cents

  // 2. Fetch business's past offers + redemption counts
  const offersSnap = await db.collection('offers')
    .where('bizId', '==', bizId)
    .get();
  const pastOffers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  // 3. Query tier-mix: which tiers drove most revenue for this business
  const redemptionsSnap = await db.collection('redemptions')
    .where('businessId', '==', bizId)
    .limit(200)
    .get();

  const tierRevenue: Record<string, number> = {};
  for (const rDoc of redemptionsSnap.docs) {
    const r = rDoc.data();
    const tier = r.influencerTier || 'M';
    tierRevenue[tier] = (tierRevenue[tier] || 0) + (r.amountCents || 0);
  }

  // 4. Find similar businesses (same cuisine) and their best-performing offer configs
  const similarBizSnap = await db.collection('businesses')
    .where('cuisine', '==', cuisine)
    .limit(20)
    .get();
  const similarBizIds = similarBizSnap.docs.map(d => d.id).filter(id => id !== bizId);

  let bestSimilarOffers: any[] = [];
  if (similarBizIds.length > 0) {
    // Get top offers from similar businesses
    const similarOffersSnap = await db.collection('offers')
      .where('bizId', 'in', similarBizIds.slice(0, 10))
      .limit(50)
      .get();
    bestSimilarOffers = similarOffersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (b.totalRedemptions || 0) - (a.totalRedemptions || 0))
      .slice(0, 5) as any[];
  }

  // 5. Check current influencer availability by tier
  const influencersSnap = await db.collection('influencers')
    .where('approvalStatus', '==', 'approved')
    .limit(100)
    .get();

  const tierCounts: Record<string, number> = {};
  influencersSnap.docs.forEach(d => {
    const tier = d.data().tier || 'M';
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  });

  // 6. Score and rank 3-5 deal configurations
  const suggestions: DealSuggestion[] = [];

  // Strategy A: Replicate top-performing past offer with adjusted split
  if (pastOffers.length > 0) {
    const topOffer = pastOffers.sort((a, b) => (b.totalRedemptions || 0) - (a.totalRedemptions || 0))[0];
    suggestions.push({
      title: `Boost "${topOffer.title || 'Top Deal'}" — Increase Split`,
      splitPct: Math.min(100, (topOffer.splitPct || 15) + 5),
      targetTiers: ['M', 'L'],
      estimatedRoas: 2.5,
      confidence: 85,
    });
  }

  // Strategy B: Target tier with highest ROI
  const bestTier = Object.entries(tierRevenue).sort((a, b) => b[1] - a[1])[0];
  if (bestTier) {
    suggestions.push({
      title: `${bestTier[0]}-Tier Focused Campaign`,
      splitPct: bestTier[0] === 'L' || bestTier[0] === 'XL' ? 25 : 15,
      targetTiers: [bestTier[0]],
      estimatedRoas: 3.0,
      confidence: 75,
    });
  }

  // Strategy C: Copy similar business's best offer
  if (bestSimilarOffers.length > 0) {
    const top = bestSimilarOffers[0] as any;
    suggestions.push({
      title: `${cuisine} Best Practice: ${top.splitPct || 20}% Split Deal`,
      splitPct: top.splitPct || 20,
      targetTiers: top.eligibleTiers || ['S', 'M', 'L'],
      estimatedRoas: 2.0,
      confidence: 65,
    });
  }

  // Strategy D: Wide reach — low split, all tiers
  suggestions.push({
    title: 'Wide Reach Awareness Campaign',
    splitPct: 10,
    targetTiers: Object.keys(tierCounts).length > 0 ? Object.keys(tierCounts) : ['S', 'M', 'L'],
    estimatedRoas: 1.5,
    confidence: 60,
  });

  // Strategy E: Premium micro-influencer campaign
  if (tierCounts['S'] && tierCounts['S'] > 5) {
    suggestions.push({
      title: 'Micro-Influencer Blitz — High Engagement',
      splitPct: 30,
      targetTiers: ['S'],
      estimatedRoas: 4.0,
      confidence: 70,
    });
  }

  // Limit to 5 suggestions
  const finalSuggestions = suggestions.slice(0, 5);

  // 7. Call Claude API for natural-language reasoning
  const context = `Business: ${biz.name || bizId}, Category: ${cuisine}, Avg ticket: $${(avgTicket / 100).toFixed(2)}, Past offers: ${pastOffers.length}, Available influencers by tier: ${JSON.stringify(tierCounts)}`;
  const scoringResults = finalSuggestions.map(s => ({
    title: s.title,
    score: s.confidence,
    details: `${s.splitPct}% split, targeting tiers ${s.targetTiers.join('/')}, est. ROAS ${s.estimatedRoas}x`,
  }));

  try {
    const reasoning = await generateRecommendationCopy(context, scoringResults, 'business');
    finalSuggestions.forEach((s, i) => {
      s.reasoning = reasoning[i];
    });
  } catch (err) {
    console.error('Claude recommendation copy failed, using defaults:', err);
    finalSuggestions.forEach(s => {
      s.reasoning = `A ${s.splitPct}% split targeting ${s.targetTiers.join('/')} tiers could yield ~${s.estimatedRoas}x ROAS.`;
    });
  }

  res.json({
    bizId,
    suggestions: finalSuggestions,
    meta: {
      pastOfferCount: pastOffers.length,
      totalRedemptions: redemptionsSnap.size,
      influencerAvailability: tierCounts,
    },
  });
}
