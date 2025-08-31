'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

export default function TestDataPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const createDemoOffers = async () => {
    setLoading(true);
    setStatus('Creating demo offers...');

    try {
      const demoOffers = [
        {
          id: 'demo_offer_bogo',
          title: 'Buy One Get One Free Fitness',
          description: 'Order any entree and get a second one free',
          userDiscountPct: 50,
          splitPct: 25
        },
        {
          id: 'demo_offer_student', 
          title: 'Student Discount - 15% Off Sports Bar',
          description: '15% off for students with valid ID',
          userDiscountPct: 15,
          splitPct: 20
        },
        {
          id: 'demo_offer_dollar',
          title: '$15 Off Your Order',
          description: 'Get $15 off when you spend $50 or more',
          userDiscountCents: 1500,
          minSpend: 5000,
          splitPct: 22
        },
        {
          id: 'demo_offer_happy',
          title: 'Happy Hour - 30% Off Drinks & Apps',
          description: '30% off drinks and appetizers during happy hour',
          userDiscountPct: 30,
          splitPct: 28
        },
        {
          id: 'demo_offer_appetizer',
          title: 'Free Appetizer with Entree Purchase',
          description: 'Get a free appetizer when you order any entree',
          userDiscountCents: 800,
          minSpend: 1500,
          splitPct: 24
        }
      ];

      for (const offer of demoOffers) {
        const data: any = {
          id: offer.id,
          bizId: 'demo_biz_1',
          title: offer.title,
          description: offer.description,
          splitPct: offer.splitPct,
          payoutPerRedemptionCents: 400,
          publicCode: offer.id.toUpperCase().replace('DEMO_OFFER_', ''),
          startAt: new Date().toISOString(),
          status: 'active',
          active: true,
          createdAt: new Date().toISOString()
        };
        
        if (offer.userDiscountPct) data.userDiscountPct = offer.userDiscountPct;
        if (offer.userDiscountCents) data.userDiscountCents = offer.userDiscountCents;
        if (offer.minSpend) data.minSpend = offer.minSpend;
        
        await setDoc(doc(db, 'offers', offer.id), data);
        setStatus(`Created: ${offer.title}`);
      }
      
      setStatus('✅ All demo offers created successfully!');
    } catch (error) {
      console.error('Error creating offers:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Demo Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will create demo offers with realistic discount types to test the new display.
          </p>
          
          <Button 
            onClick={createDemoOffers} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Demo Offers'}
          </Button>
          
          {status && (
            <div className="p-3 bg-gray-50 rounded text-sm">
              {status}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            <p>This will create offers with:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Buy One Get One Free (50% effective discount)</li>
              <li>Student Discount (15% off)</li>
              <li>Dollar off ($15 off $50+)</li>
              <li>Happy Hour (30% off)</li>
              <li>Free Appetizer ($8 off $15+)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
