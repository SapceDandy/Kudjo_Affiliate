'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Mail } from 'lucide-react';
import Link from 'next/link';

export default function BusinessPendingPage() {
  return (
    <div className="container max-w-2xl py-12">
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Clock className="w-16 h-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Registration Under Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Badge variant="secondary" className="text-orange-700 bg-orange-100">
              Pending Admin Approval
            </Badge>
            
            <p className="text-gray-600 leading-relaxed">
              Thank you for registering your business with Kudjo! Your application is currently being reviewed by our admin team.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Admin reviews your business information
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Location verification via Google Maps
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Business legitimacy verification
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email notification with approval status
                </li>
              </ul>
            </div>
            
            <p className="text-sm text-gray-500">
              Review typically takes 1-2 business days. You'll receive an email notification once your application is processed.
            </p>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/auth/signin">Back to Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="mailto:support@kudjo.com">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
