import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '../../apps/web/lib/firebase-admin';
import { detId, detTimestamp } from '../lib/ids';
import { createReceiptCapture } from '../lib/receipts';
import { createBaseEntities } from '../base';

// Smoke-02: merchant lowers cap → chatbot adjusts → dashboards reflect immediately
export async function applySmoke02(): Promise<void> {
  const capture = createReceiptCapture();
  capture.log('info', 'Applying Smoke-02 overlay: Cap change propagation');

  try {
    await initializeFirebaseAdmin();
    const db = getFirestore();

    // Ensure base entities exist
    const entities = await createBaseEntities();
    const merchantId = entities.merchants[0].id; // Pasta Palace
    const userId = entities.users[0].id; // +15125550101

    // 1. Set initial caps suitable for lunch (20% max)
    const initialCaps = {
      maxPctOff: 20,
      minSpend: 15,
      validDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      maxDaily: 50
    };

    await db.collection('businesses').doc(merchantId).update({
      caps: initialCaps,
      updatedAt: detTimestamp("merchant:caps:initial")
    });

    capture.log('info', `Set initial caps: maxPctOff=${initialCaps.maxPctOff}%`);

    // 2. Create a published lunch campaign at the cap limit
    const campaignId = detId("campaign", merchantId, "lunch-cap-test", "v1");
    const campaignData = {
      merchantId,
      title: "Lunch Cap Test - 20% Off",
      description: "Testing cap enforcement",
      type: "time_window",
      value: 20, // At the cap limit
      minOrder: 15,
      window: "11:30-13:30",
      validDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      status: "published",
      createdAt: detTimestamp("campaign:cap-test"),
      publishedAt: detTimestamp("campaign:cap-test:published")
    };

    await db.collection('offers').doc(campaignId).set(campaignData);
    capture.log('info', `Created campaign at cap limit: ${campaignData.value}%`);

    // 3. Lower the cap to 12% (simulating merchant adjustment)
    const loweredCaps = {
      ...initialCaps,
      maxPctOff: 12,
      updatedAt: detTimestamp("merchant:caps:lowered")
    };

    await db.collection('businesses').doc(merchantId).update({
      caps: loweredCaps,
      updatedAt: detTimestamp("merchant:caps:lowered")
    });

    capture.log('info', `Lowered caps: maxPctOff=${loweredCaps.maxPctOff}%`);

    // 4. Create a conversation record showing the cap change impact
    const conversationId = detId("conversation", userId, merchantId, "cap-test");
    const conversationData = {
      userId,
      merchantId,
      status: "active",
      lastMessage: "Testing cap enforcement after merchant update",
      messageCount: 3,
      createdAt: detTimestamp("conversation:cap-test"),
      updatedAt: detTimestamp("conversation:cap-test:updated")
    };

    await db.collection('conversations').doc(conversationId).set(conversationData);

    // 5. Create messages showing the negotiation respecting new caps
    const messages = [
      {
        id: detId("message", conversationId, "1"),
        conversationId,
        userId,
        text: "Can I get a lunch deal for spaghetti?",
        timestamp: detTimestamp("message:1"),
        sender: "user"
      },
      {
        id: detId("message", conversationId, "2"),
        conversationId,
        userId,
        text: "How about 15% off lunch 11:30-13:30? Accept or counter?",
        timestamp: detTimestamp("message:2"),
        sender: "bot",
        offer: {
          merchantId,
          type: "time_window",
          value: 15, // Above new cap, should be clamped
          minOrder: 15,
          window: "11:30-13:30"
        }
      },
      {
        id: detId("message", conversationId, "3"),
        conversationId,
        userId,
        text: "I can do 12% off lunch 11:30-13:30? Accept or counter?",
        timestamp: detTimestamp("message:3"),
        sender: "bot",
        offer: {
          merchantId,
          type: "time_window",
          value: 12, // Properly clamped to new cap
          minOrder: 15,
          window: "11:30-13:30"
        }
      }
    ];

    for (const message of messages) {
      await db.collection('messages').doc(message.id).set(message);
    }

    capture.log('info', `Created ${messages.length} messages showing cap enforcement`);

    // 6. Create audit log entry for the cap change
    const auditId = detId("audit", merchantId, "cap-change", "smoke02");
    const auditData = {
      merchantId,
      action: "caps_updated",
      actor: "merchant_owner",
      changes: {
        maxPctOff: { from: 20, to: 12 }
      },
      timestamp: detTimestamp("audit:cap-change"),
      reason: "Smoke test: cap enforcement validation"
    };

    await db.collection('auditLogs').doc(auditId).set(auditData);

    // Capture receipt
    const capSnapshot = await db.collection('businesses').doc(merchantId).get();
    const currentCaps = capSnapshot.data()?.caps;

    await capture.writeReceipts('seed', 'smoke02', {
      ok: true,
      inputs: { 
        profile: 'smoke02',
        initialCap: initialCaps.maxPctOff,
        finalCap: loweredCaps.maxPctOff
      },
      outputs: {
        campaigns: 1,
        conversations: 1,
        messages: messages.length,
        auditLogs: 1,
        currentMaxPctOff: currentCaps?.maxPctOff,
        capChangeVerified: currentCaps?.maxPctOff === 12
      }
    });

  } catch (error) {
    await capture.writeReceipts('seed', 'smoke02', {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
