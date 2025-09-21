import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '../../apps/web/lib/firebase-admin';
import { detId, detTimestamp } from '../lib/ids';
import { createReceiptCapture } from '../lib/receipts';

export interface BaseEntities {
  merchants: Array<{ id: string; data: any }>;
  affiliates: Array<{ id: string; data: any }>;
  users: Array<{ id: string; data: any }>;
}

export async function createBaseEntities(): Promise<BaseEntities> {
  const capture = createReceiptCapture();
  capture.log('info', 'Creating base seed entities');

  // Initialize Firebase Admin
  await initializeFirebaseAdmin();
  const db = getFirestore();

  // Create 3 merchants with different categories and margins
  const merchants = [
    {
      id: detId("merchant", "Pasta Palace", "Austin", "v1"),
      data: {
        name: "Pasta Palace",
        category: "Italian",
        address: "123 Main St, Austin, TX 78701",
        phone: "+15125551001",
        email: "owner@pastapalace.com",
        avgMargin: 0.65,
        caps: {
          maxPctOff: 20,
          minSpend: 15,
          validDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          maxDaily: 50
        },
        status: "approved",
        createdAt: detTimestamp("merchant:pasta-palace"),
        updatedAt: detTimestamp("merchant:pasta-palace:updated")
      }
    },
    {
      id: detId("merchant", "Taco Libre", "Austin", "v1"),
      data: {
        name: "Taco Libre",
        category: "Mexican",
        address: "456 South St, Austin, TX 78704",
        phone: "+15125551002",
        email: "owner@tacolibre.com",
        avgMargin: 0.72,
        caps: {
          maxPctOff: 25,
          minSpend: 10,
          validDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          maxDaily: 75
        },
        status: "approved",
        createdAt: detTimestamp("merchant:taco-libre"),
        updatedAt: detTimestamp("merchant:taco-libre:updated")
      }
    },
    {
      id: detId("merchant", "Coffee Corner", "Austin", "v1"),
      data: {
        name: "Coffee Corner",
        category: "Coffee",
        address: "789 North Ave, Austin, TX 78702",
        phone: "+15125551003",
        email: "owner@coffeecorner.com",
        avgMargin: 0.85,
        caps: {
          maxPctOff: 15,
          minSpend: 5,
          validDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          maxDaily: 100
        },
        status: "approved",
        createdAt: detTimestamp("merchant:coffee-corner"),
        updatedAt: detTimestamp("merchant:coffee-corner:updated")
      }
    }
  ];

  // Create 4 affiliates with different payout tiers
  const affiliates = [
    {
      id: detId("affiliate", "foodie_sarah", "tier_a"),
      data: {
        handle: "foodie_sarah",
        displayName: "Sarah - Foodie Explorer",
        email: "sarah@example.com",
        followerCount: 15000,
        tier: "Medium",
        payoutTier: "A",
        payoutRate: 0.15,
        approved: true,
        socialAccounts: [
          {
            platform: "instagram",
            handle: "foodie_sarah",
            followerCount: 15000,
            verified: true,
            verifiedAt: detTimestamp("affiliate:sarah:verified")
          }
        ],
        createdAt: detTimestamp("affiliate:sarah"),
        updatedAt: detTimestamp("affiliate:sarah:updated")
      }
    },
    {
      id: detId("affiliate", "austin_eats", "tier_b"),
      data: {
        handle: "austin_eats",
        displayName: "Austin Eats",
        email: "austin@example.com",
        followerCount: 8500,
        tier: "Small",
        payoutTier: "B",
        payoutRate: 0.12,
        approved: true,
        socialAccounts: [
          {
            platform: "tiktok",
            handle: "austin_eats",
            followerCount: 8500,
            verified: true,
            verifiedAt: detTimestamp("affiliate:austin:verified")
          }
        ],
        createdAt: detTimestamp("affiliate:austin"),
        updatedAt: detTimestamp("affiliate:austin:updated")
      }
    },
    {
      id: detId("affiliate", "local_deals", "tier_b"),
      data: {
        handle: "local_deals",
        displayName: "Local Deals ATX",
        email: "deals@example.com",
        followerCount: 5200,
        tier: "Small",
        payoutTier: "B",
        payoutRate: 0.12,
        approved: true,
        socialAccounts: [],
        createdAt: detTimestamp("affiliate:deals"),
        updatedAt: detTimestamp("affiliate:deals:updated")
      }
    },
    {
      id: detId("affiliate", "pending_user", "tier_b"),
      data: {
        handle: "pending_user",
        displayName: "Pending User",
        email: "pending@example.com",
        followerCount: 1200,
        tier: "Nano",
        payoutTier: "B",
        payoutRate: 0.10,
        approved: false,
        socialAccounts: [],
        createdAt: detTimestamp("affiliate:pending"),
        updatedAt: detTimestamp("affiliate:pending:updated")
      }
    }
  ];

  // Create 10 sample users with Austin & near-boundary locations
  const users = [
    {
      id: detId("user", "+15125550101"),
      data: {
        phone: "+15125550101",
        location: { lat: 30.2672, lng: -97.7431 }, // Austin downtown
        preferences: ["Italian", "Mexican"],
        totalRedemptions: 5,
        createdAt: detTimestamp("user:101"),
        lastActiveAt: detTimestamp("user:101:active")
      }
    },
    {
      id: detId("user", "+15125550102"),
      data: {
        phone: "+15125550102",
        location: { lat: 30.2849, lng: -97.7341 }, // Austin north
        preferences: ["Coffee", "Breakfast"],
        totalRedemptions: 2,
        createdAt: detTimestamp("user:102"),
        lastActiveAt: detTimestamp("user:102:active")
      }
    },
    {
      id: detId("user", "+15125550103"),
      data: {
        phone: "+15125550103",
        location: { lat: 30.2500, lng: -97.7500 }, // Austin south
        preferences: ["Mexican", "Coffee"],
        totalRedemptions: 8,
        createdAt: detTimestamp("user:103"),
        lastActiveAt: detTimestamp("user:103:active")
      }
    },
    // Add 7 more users with varying locations and preferences
    ...Array.from({ length: 7 }, (_, i) => ({
      id: detId("user", `+151255501${String(i + 4).padStart(2, '0')}`),
      data: {
        phone: `+151255501${String(i + 4).padStart(2, '0')}`,
        location: {
          lat: 30.2672 + (Math.random() - 0.5) * 0.1, // Within ~5 miles of Austin
          lng: -97.7431 + (Math.random() - 0.5) * 0.1
        },
        preferences: ["Italian", "Mexican", "Coffee"][Math.floor(Math.random() * 3)],
        totalRedemptions: Math.floor(Math.random() * 10),
        createdAt: detTimestamp(`user:${i + 4}`),
        lastActiveAt: detTimestamp(`user:${i + 4}:active`)
      }
    }))
  ];

  capture.log('info', `Created ${merchants.length} merchants, ${affiliates.length} affiliates, ${users.length} users`);

  return { merchants, affiliates, users };
}

export async function seedBaseEntities(): Promise<void> {
  const capture = createReceiptCapture();
  
  try {
    const entities = await createBaseEntities();
    const db = getFirestore();

    // Write merchants to businesses collection (matching existing schema)
    for (const merchant of entities.merchants) {
      await db.collection('businesses').doc(merchant.id).set(merchant.data);
    }

    // Write affiliates to influencers collection (matching existing schema)
    for (const affiliate of entities.affiliates) {
      await db.collection('influencers').doc(affiliate.id).set(affiliate.data);
    }

    // Write users to users collection
    for (const user of entities.users) {
      await db.collection('users').doc(user.id).set(user.data);
    }

    await capture.writeReceipts('seed', 'base', {
      ok: true,
      inputs: { profile: 'base' },
      outputs: {
        merchants: entities.merchants.length,
        affiliates: entities.affiliates.length,
        users: entities.users.length
      }
    });

  } catch (error) {
    await capture.writeReceipts('seed', 'base', {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
