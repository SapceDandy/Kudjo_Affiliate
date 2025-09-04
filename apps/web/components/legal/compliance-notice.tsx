'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Shield } from 'lucide-react';

interface ComplianceNoticeProps {
  type: 'ftc' | 'ugc' | 'legal';
  className?: string;
}

export function ComplianceNotice({ type, className = '' }: ComplianceNoticeProps) {
  if (type === 'ftc') {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-red-900">FTC Disclosure Required</h4>
                <Badge variant="destructive" className="text-xs">LEGALLY REQUIRED</Badge>
              </div>
              <p className="text-sm text-red-800 mb-3">
                You must include #ad, #sponsored, or #partnership in ALL campaign content. 
                Failure to comply can result in FTC fines up to $43,792 per violation.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className="bg-red-100 text-red-800">#ad</Badge>
                <Badge variant="secondary" className="bg-red-100 text-red-800">#sponsored</Badge>
                <Badge variant="secondary" className="bg-red-100 text-red-800">#partnership</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === 'ugc') {
    return (
      <Card className={`border-blue-200 bg-blue-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Content Requirements</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• High-quality images/videos (1080p minimum)</li>
                <li>• Tag the business and use campaign hashtags</li>
                <li>• Create authentic, truthful content</li>
                <li>• Follow platform community guidelines</li>
                <li>• Business may repost your content with attribution</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-orange-900 mb-2">Legal Agreement</h4>
            <p className="text-sm text-orange-800">
              By participating, you agree to comply with all FTC guidelines, platform terms, 
              and grant businesses non-exclusive rights to use your content for marketing purposes.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
