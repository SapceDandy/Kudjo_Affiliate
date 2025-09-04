'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Info, ExternalLink, CheckCircle } from 'lucide-react';

interface FTCDisclosureBannerProps {
  type: 'campaign' | 'content' | 'general';
  campaignType?: 'sponsored' | 'partnership' | 'gifted';
  className?: string;
}

const DISCLOSURE_EXAMPLES = {
  sponsored: [
    '#ad #sponsored',
    '#paidpartnership',
    'Sponsored by [Brand Name]',
    'This is a paid partnership with [Brand Name]'
  ],
  partnership: [
    '#partnership #collab',
    '#brandpartner',
    'In partnership with [Brand Name]',
    'Proud partner of [Brand Name]'
  ],
  gifted: [
    '#gifted #pr',
    '#complimentary',
    'Gifted by [Brand Name]',
    'Thank you [Brand Name] for the gift'
  ]
};

const FTC_GUIDELINES = `
**FTC DISCLOSURE REQUIREMENTS**

The Federal Trade Commission (FTC) requires clear disclosure of material connections between influencers and brands.

**When Disclosure is Required:**
• Paid sponsorships or partnerships
• Free products or services received
• Affiliate commissions or referral fees
• Any material connection that could affect credibility

**How to Disclose:**
• Use clear, prominent language (#ad, #sponsored, #partnership)
• Place disclosure at the beginning of posts/captions
• Make disclosure easily noticeable and understandable
• Include verbal disclosure in video content

**Platform-Specific Guidelines:**
• Instagram: Use built-in "Paid partnership" tool + hashtags
• TikTok: Use "Paid partnership" label + clear hashtags
• YouTube: Check "Includes paid promotion" + verbal disclosure
• Twitter: Include disclosure in tweet text, not just hashtags

**Legal Consequences:**
• FTC can impose fines up to $43,792 per violation
• Brands and influencers are both liable
• Repeated violations can result in larger penalties
• Disclosure violations can damage credibility and career

**Best Practices:**
• When in doubt, disclose
• Be specific about the relationship
• Use multiple disclosure methods
• Keep records of all sponsored content
`;

export function FTCDisclosureBanner({ type, campaignType = 'sponsored', className = '' }: FTCDisclosureBannerProps) {
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const examples = DISCLOSURE_EXAMPLES[campaignType] || DISCLOSURE_EXAMPLES.sponsored;

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-red-900">FTC Disclosure Required</h4>
                <Badge variant="destructive" className="text-xs">
                  LEGALLY REQUIRED
                </Badge>
              </div>
              <p className="text-sm text-red-800 mb-3">
                Federal law requires clear disclosure of sponsored content, partnerships, and gifted products. 
                Failure to comply can result in FTC fines up to $43,792 per violation.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExamples(true)}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  View Examples
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowGuidelines(true)}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <Info className="w-4 h-4 mr-2" />
                  Full Guidelines
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <a href="https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    FTC.gov
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Examples */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-900 mb-2">Quick Disclosure Examples</h4>
              <div className="flex flex-wrap gap-2">
                {examples.slice(0, 2).map((example, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                    {example}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-green-700 mt-2">
                Choose one that fits your content style and place it prominently in your post.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Examples Dialog */}
      <Dialog open={showExamples} onOpenChange={setShowExamples}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>FTC Disclosure Examples</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Hashtag Disclosures:</h4>
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm font-mono">
                    {example}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Written Disclosures:</h4>
              <div className="space-y-2 text-sm">
                <p className="p-2 bg-gray-50 rounded">
                  "This post is sponsored by [Brand Name]"
                </p>
                <p className="p-2 bg-gray-50 rounded">
                  "I received this product for free in exchange for my honest review"
                </p>
                <p className="p-2 bg-gray-50 rounded">
                  "Paid partnership with [Brand Name]"
                </p>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Place disclosures at the beginning of your caption or prominently visible. 
                Don't bury them in hashtags or at the end of long captions.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Guidelines Dialog */}
      <Dialog open={showGuidelines} onOpenChange={setShowGuidelines}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Complete FTC Disclosure Guidelines</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              {FTC_GUIDELINES.split('\n').map((line, index) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return (
                    <h3 key={index} className="font-semibold text-gray-900 mt-4 mb-2">
                      {line.replace(/\*\*/g, '')}
                    </h3>
                  );
                }
                if (line.startsWith('•')) {
                  return (
                    <li key={index} className="ml-4 text-gray-700">
                      {line.substring(2)}
                    </li>
                  );
                }
                if (line.trim()) {
                  return (
                    <p key={index} className="text-gray-700">
                      {line}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowGuidelines(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
