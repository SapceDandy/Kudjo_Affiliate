'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, FileText, Shield, Eye } from 'lucide-react';

interface LegalDisclaimerProps {
  type: 'campaign_join' | 'content_creation' | 'payout_request' | 'business_signup';
  onAccept?: (accepted: boolean) => void;
  required?: boolean;
  className?: string;
}

const LEGAL_TEXTS = {
  campaign_join: {
    title: 'Campaign Participation Agreement',
    content: `
**IMPORTANT LEGAL REQUIREMENTS**

By joining this campaign, you acknowledge and agree to:

**FTC Disclosure Requirements:**
• You must clearly disclose your relationship with the brand using #ad, #sponsored, or #partnership
• Disclosure must be prominent, clear, and easily understood by your audience
• Disclosure is required on ALL content related to this campaign (posts, stories, videos, etc.)

**Content Guidelines:**
• All content must be truthful, accurate, and not misleading
• You must actually use/experience the product or service before posting
• Content must comply with platform-specific guidelines (Instagram, TikTok, etc.)
• No false claims about product benefits or results

**User-Generated Content (UGC) Rights:**
• By participating, you grant the business a non-exclusive license to use your content
• Business may repost, share, or use your content for marketing purposes
• You retain ownership of your original content
• Business must credit you when using your content

**Compliance & Legal:**
• You are responsible for following all applicable laws and regulations
• Failure to comply may result in campaign termination and forfeiture of compensation
• You must be 18+ years old to participate
• Campaign terms may be modified with 24-hour notice

**Payment Terms:**
• Payments are processed after content verification and compliance check
• Compensation is subject to tax reporting requirements
• Disputes must be resolved through the platform's dispute resolution process
    `
  },
  content_creation: {
    title: 'Content Creation & UGC Guidelines',
    content: `
**CONTENT CREATION REQUIREMENTS**

**FTC Compliance:**
• Include #ad, #sponsored, or #partnership in ALL campaign content
• Disclosure must be in the first line or prominently visible
• Verbal disclosure required for video content ("This is a paid partnership with...")

**Content Standards:**
• Content must be original and created by you
• No misleading claims or false testimonials
• Must actually use the product/service featured
• Maintain authenticity while following brand guidelines

**User-Generated Content Rights:**
• You grant Kudjo and participating businesses rights to:
  - Repost your content with proper attribution
  - Use content in marketing materials
  - Display content on websites and social media
• You retain original copyright ownership
• Businesses must provide attribution when using your content

**Platform Guidelines:**
• Follow all social media platform terms of service
• Respect community guidelines of each platform
• Use appropriate hashtags and mentions as specified
• Tag the business and use campaign-specific hashtags

**Quality Requirements:**
• High-quality images/videos (minimum 1080p for photos)
• Clear audio for video content
• Professional presentation while maintaining authenticity
• Content must align with your personal brand
    `
  },
  payout_request: {
    title: 'Payout & Tax Information',
    content: `
**PAYOUT TERMS & CONDITIONS**

**Payment Processing:**
• Payments processed within 30 days of campaign completion
• Minimum payout threshold: $25.00
• Payments made via direct deposit or digital wallet

**Tax Responsibilities:**
• You are responsible for reporting all income from campaigns
• 1099 forms issued for earnings over $600 per calendar year
• Keep records of all campaign participation for tax purposes
• Consult tax professional for specific tax advice

**Compliance Verification:**
• All content must be verified compliant before payout
• FTC disclosure requirements must be met
• Content quality standards must be satisfied
• Campaign deliverables must be completed as agreed

**Dispute Resolution:**
• Payment disputes must be filed within 60 days
• Disputes resolved through platform mediation process
• Final decisions made by Kudjo platform administrators
• Legal action limited to binding arbitration
    `
  },
  business_signup: {
    title: 'Business Terms of Service',
    content: `
**BUSINESS PLATFORM AGREEMENT**

**Account Responsibilities:**
• Provide accurate business information and credentials
• Maintain current contact and payment information
• Comply with all applicable business laws and regulations
• Ensure all campaign content meets advertising standards

**Campaign Management:**
• Campaigns must comply with FTC advertising guidelines
• Clear disclosure requirements must be communicated to influencers
• Payment terms must be honored as agreed
• Campaign modifications require 24-hour notice to participants

**Content Usage Rights:**
• Businesses receive non-exclusive license to user-generated content
• Must provide attribution when reposting influencer content
• Cannot modify content without influencer consent
• Usage rights limited to marketing and promotional purposes

**Payment & Billing:**
• Platform fees apply to all successful campaigns
• Payments to influencers must be processed within agreed timeframes
• Businesses responsible for tax reporting on influencer payments
• Refunds subject to platform refund policy

**Compliance & Legal:**
• Must follow all applicable advertising laws and regulations
• Responsible for ensuring campaign compliance with FTC guidelines
• Cannot request misleading or false testimonials
• Subject to platform review and potential account suspension for violations
    `
  }
};

export function LegalDisclaimer({ type, onAccept, required = false, className = '' }: LegalDisclaimerProps) {
  const [accepted, setAccepted] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  
  const legalText = LEGAL_TEXTS[type];

  const handleAcceptChange = (checked: boolean) => {
    setAccepted(checked);
    onAccept?.(checked);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-2">Legal Compliance Required</h4>
              <p className="text-sm text-orange-800 mb-3">
                This campaign requires compliance with FTC disclosure guidelines and platform terms. 
                Please review the full legal requirements before proceeding.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFullText(true)}
                  className="text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Terms
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {required && (
        <div className="flex items-start space-x-3 p-4 border rounded-lg">
          <Checkbox
            id="legal-acceptance"
            checked={accepted}
            onCheckedChange={handleAcceptChange}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor="legal-acceptance" className="text-sm font-medium cursor-pointer">
              I have read and agree to the {legalText.title.toLowerCase()}
            </label>
            <p className="text-xs text-gray-600 mt-1">
              By checking this box, you confirm that you understand and will comply with all legal requirements, 
              including FTC disclosure guidelines and content usage terms.
            </p>
          </div>
        </div>
      )}

      {/* Full Legal Text Dialog */}
      <Dialog open={showFullText} onOpenChange={setShowFullText}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              {legalText.title}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-4 text-sm">
              {legalText.content.split('\n').map((line, index) => {
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
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowFullText(false)}>
              Close
            </Button>
            {required && (
              <Button 
                onClick={() => {
                  setAccepted(true);
                  onAccept?.(true);
                  setShowFullText(false);
                }}
              >
                Accept Terms
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// UGC Requirements Component
export function UGCRequirements({ className = '' }: { className?: string }) {
  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Content Requirements</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Include #ad, #sponsored, or #partnership disclosure</li>
              <li>• Use high-quality images/videos (1080p minimum)</li>
              <li>• Tag the business and use campaign hashtags</li>
              <li>• Create authentic, truthful content about your experience</li>
              <li>• Follow platform community guidelines</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
