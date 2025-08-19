'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FloatingMascot } from '@/components/ui/floating-mascot';

export default function Home() {
  return (
    <div className="h-[calc(100vh-7rem)] overflow-hidden bg-white relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="container px-6 max-w-4xl">
          <div className="flex flex-col items-center justify-center gap-10">            
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tighter md:text-5xl lg:text-6xl">
                Connect & Earn with Kudjo
              </h1>
              <p className="mt-4 text-xl text-gray-600">
                Generate and track content coupons effortlessly
              </p>
            </div>

            <div className="flex gap-4">
              <Button 
                asChild 
                size="lg"
                className="bg-brand hover:bg-brand-light"
              >
                <Link href="/influencer/signup">Join as Influencer</Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="outline"
                className="border-brand text-brand hover:bg-brand-dark"
              >
                <Link href="/business/signup">Register Business</Link>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 text-center max-w-4xl">
              <div className="px-4">
                <h3 className="text-lg font-semibold">For Influencers</h3>
                <p className="text-sm text-gray-600">Discover businesses & generate custom codes</p>
              </div>
              <div className="px-4">
                <h3 className="text-lg font-semibold">For Businesses</h3>
                <p className="text-sm text-gray-600">Connect with creators & track ROI</p>
              </div>
              <div className="px-4">
                <h3 className="text-lg font-semibold">Easy Setup</h3>
                <p className="text-sm text-gray-600">Simple integration & real-time analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloatingMascot />
    </div>
  );
}
