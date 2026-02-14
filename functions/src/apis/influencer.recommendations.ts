import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { generateRecommendationCopy } from '../utils/claude';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface ScoredOffer {
  offerId: string;
  title: string;
  businessName: string;
  businessId: string;
  splitPct: number;
  score: number;
  matchPct: number;
  reasoning?: string;
  endAt?: string;
  breakdown: {
    tierMatch: number;
    categoryMatch: number;
    geoMatch: number;
    earningsPotential: number;
    freshness: number;
  };
}

export async function handleInfluencerRecommendations(req: Request, res: Response): Promise<void> {
  const infId = req.query.infId as string;
  if (!infId) {
    res.status(400).json({ error: 'infId required' });
    return;
  }

  const db = admin.firestore();

  // Fetch influencer profile
  const infDoc = await db.collection('influencers').doc(infId).get();
  if (!infDoc.exists) {
    res.status(404).json({ error: 'Influencer not found' });
    return;
  }
  const inf = infDoc.data()!;
  const infTier = inf.tier || 'M';
  const infGeo = inf.geo || inf.location || null; // { lat, lng }
  const infCategories: string[] = inf.categories || inf.interests || [];

  // Fetch influencer's past campaign categories
  const pastLinksSnap = await db.collection('affiliateLinks')
    .where('influencerId', '==', infId)
    .limit(50)
    .get();
  const pastOfferIds = new Set(pastLinksSnap.docs.map(d => d.data().offerId));

  // Fetch all active offers
  const offersSnap = await db.collection('offers').get();
  const now = new Date();

  // Pre-fetch businesses
  const businessMap = new Map<string, any>();
  const bizSnap = await db.collection('businesses').get();
  bizSnap.docs.forEach(d => {
    businessMap.set(d.id, { id: d.id, ...d.data() });
  });

  const scored: ScoredOffer[] = [];

  for (const offerDoc of offersSnap.docs) {
    const offer = offerDoc.data();

    // Skip inactive / expired / already joined
    if (offer.status === 'inactive' || offer.active === false) continue;
    if (pastOfferIds.has(offerDoc.id)) continue;

    if (offer.endAt) {
      const endDate = offer.endAt.toDate ? offer.endAt.toDate() : new Date(offer.endAt);
      if (endDate < now) continue;
    }

    const biz = businessMap.get(offer.bizId);
    if (!biz) continue;

    const bizCuisine = (biz.cuisine || biz.category || '').toLowerCase();

    // --- Scoring (0-100) ---

    // Tier match (0-25): Offer targets this tier? Generous tier-specific split?
    let tierMatch = 0;
    const eligibleTiers: string[] = offer.eligibleTiers || offer.eligibility?.tiers || [];
    if (eligibleTiers.length === 0 || eligibleTiers.includes(infTier)) {
      tierMatch = 15;
      if (offer.tierSplits && offer.tierSplits[infTier]) {
        tierMatch += Math.min(10, offer.tierSplits[infTier] / 5); // higher split = higher score
      } else {
        tierMatch += 5;
      }
    }

    // Category/vibe (0-25): Match influencer's past categories to business cuisine
    let categoryMatch = 0;
    if (infCategories.length > 0 && bizCuisine) {
      if (infCategories.some(c => c.toLowerCase().includes(bizCuisine) || bizCuisine.includes(c.toLowerCase()))) {
        categoryMatch = 25;
      } else {
        categoryMatch = 5; // some base score for any offer
      }
    } else {
      categoryMatch = 10; // neutral
    }

    // Geography (0-20): Haversine distance
    let geoMatch = 10; // default neutral
    if (infGeo && biz.geo) {
      const dist = haversineKm(infGeo.lat, infGeo.lng, biz.geo.lat, biz.geo.lng);
      if (dist < 5) geoMatch = 20;
      else if (dist < 15) geoMatch = 15;
      else if (dist < 50) geoMatch = 10;
      else geoMatch = 3;
    }

    // Earnings potential (0-15): splitPct * avgTicket
    const splitPct = offer.splitPct || 0;
    const avgTicket = biz.avgTicket || biz.avgTicketCents || 2000;
    const earningsPotential = Math.min(15, Math.round((splitPct * avgTicket) / 10000));

    // Freshness/urgency (0-15)
    let freshness = 0;
    const createdAt = offer.createdAt?.toDate ? offer.createdAt.toDate() : new Date(offer.createdAt || 0);
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 3) freshness += 10;
    else if (daysSinceCreation < 7) freshness += 5;

    if (offer.endAt) {
      const endDate = offer.endAt.toDate ? offer.endAt.toDate() : new Date(offer.endAt);
      const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilEnd < 7) freshness += 5; // urgency bonus
    }
    freshness = Math.min(15, freshness);

    const totalScore = tierMatch + categoryMatch + geoMatch + earningsPotential + freshness;

    scored.push({
      offerId: offerDoc.id,
      title: offer.title || 'Untitled Offer',
      businessName: biz.name || biz.businessName || 'Unknown Business',
      businessId: offer.bizId,
      splitPct,
      score: totalScore,
      matchPct: totalScore,
      endAt: offer.endAt
        ? (offer.endAt.toDate ? offer.endAt.toDate().toISOString() : offer.endAt)
        : undefined,
      breakdown: {
        tierMatch,
        categoryMatch,
        geoMatch,
        earningsPotential,
        freshness,
      },
    });
  }

  // Sort by score descending, take top 5
  scored.sort((a, b) => b.score - a.score);
  const topOffers = scored.slice(0, 5);

  // Call Claude API for personalized copy
  if (topOffers.length > 0) {
    const context = `Influencer tier: ${infTier}, categories: ${infCategories.join(', ') || 'general'}, past campaigns: ${pastOfferIds.size}`;
    const scoringResults = topOffers.map(o => ({
      title: `${o.title} by ${o.businessName}`,
      score: o.score,
      details: `${o.splitPct}% split, match: tier=${o.breakdown.tierMatch}/25, category=${o.breakdown.categoryMatch}/25, geo=${o.breakdown.geoMatch}/20`,
    }));

    try {
      const reasoning = await generateRecommendationCopy(context, scoringResults, 'influencer');
      topOffers.forEach((o, i) => {
        o.reasoning = reasoning[i];
      });
    } catch (err) {
      console.error('Claude recommendation copy failed:', err);
      topOffers.forEach(o => {
        o.reasoning = `This ${o.splitPct}% split deal from ${o.businessName} is a ${o.matchPct}% match for your profile.`;
      });
    }
  }

  res.json({
    infId,
    tier: infTier,
    recommendations: topOffers,
    totalEvaluated: scored.length,
  });
}
