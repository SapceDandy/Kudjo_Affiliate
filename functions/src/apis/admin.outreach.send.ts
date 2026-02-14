import { Request, Response } from 'express';
import admin from 'firebase-admin';

// Simple in-memory rate limiter for Microsoft Graph API (30/min)
const sendTimestamps: number[] = [];
const MS_SEND_RATE_LIMIT = 30;
const MS_RATE_WINDOW_MS = 60 * 1000;

function checkMicrosoftRateLimit(): boolean {
  const now = Date.now();
  // Remove timestamps outside the window
  while (sendTimestamps.length > 0 && sendTimestamps[0] < now - MS_RATE_WINDOW_MS) {
    sendTimestamps.shift();
  }
  if (sendTimestamps.length >= MS_SEND_RATE_LIMIT) {
    return false;
  }
  sendTimestamps.push(now);
  return true;
}

async function sendEmailViaGraph(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: body,
        },
        toRecipients: [
          {
            emailAddress: { address: to },
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Graph API error ${response.status}: ${errorBody}`);
  }
}

export async function handleOutreachSend(req: Request, res: Response): Promise<void> {
  const { campaignId } = req.body as any;
  const db = admin.firestore();
  const campRef = db.doc(`admin/outreachCampaigns/${campaignId}`);
  const camp = await campRef.get();
  if (!camp.exists) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const campData = camp.data()!;

  // Get stored OAuth tokens
  const tokenDoc = await db.doc('admin/outreachTokens').get();
  const accessToken = tokenDoc.exists ? tokenDoc.data()?.accessToken : null;

  if (!accessToken) {
    // Fallback to old behavior: mark as sent without actually sending
    const recipients = await campRef.collection('recipients').where('state', '==', 'queued').get();
    const batch = db.batch();
    recipients.docs.slice(0, 50).forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.update(d.ref, { state: 'sent', lastEventAt: new Date().toISOString() });
    });
    await batch.commit();
    res.json({ queued: recipients.size, warning: 'No OAuth token configured — emails marked as sent but not delivered' });
    return;
  }

  // Send actual emails via Microsoft Graph API
  const recipients = await campRef.collection('recipients').where('state', '==', 'queued').get();
  const toSend = recipients.docs.slice(0, 50);
  let sent = 0;
  let failed = 0;

  for (const recipientDoc of toSend) {
    if (!checkMicrosoftRateLimit()) {
      // Rate limited — leave remaining as queued
      break;
    }

    const recipient = recipientDoc.data();
    try {
      await sendEmailViaGraph(
        accessToken,
        recipient.email,
        campData.subject || 'Partnership Opportunity',
        campData.body || '<p>We would love to partner with you.</p>'
      );
      await recipientDoc.ref.update({
        state: 'sent',
        sentAt: new Date().toISOString(),
        lastEventAt: new Date().toISOString(),
      });
      sent++;
    } catch (error) {
      console.error(`Failed to send to ${recipient.email}:`, error);
      await recipientDoc.ref.update({
        state: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastEventAt: new Date().toISOString(),
      });
      failed++;
    }
  }

  res.json({ sent, failed, remaining: recipients.size - sent - failed });
}
