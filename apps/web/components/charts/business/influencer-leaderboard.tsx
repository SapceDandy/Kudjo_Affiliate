'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  DollarSign,
  Star,
  Medal,
  Crown,
  Target,
  MessageCircle
} from 'lucide-react';
import { ChartContainer, CHART_COLORS, exportToCSV } from '../chart-container';

interface InfluencerPerformance {
  id: string;
  handle: string;
  name: string;
  avatar?: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  revenue_cents: number;
  coupon_uses: number;
  conversion_rate: number;
  avg_order_value_cents: number;
  total_orders: number;
  growth_rate: number;
  last_active: string;
  badge_count: number;
  rank: number;
  previous_rank?: number;
}

interface InfluencerLeaderboardProps {
  bizId: string;
  className?: string;
}

type SortMetric = 'revenue' | 'uses' | 'conversion' | 'growth';

export function InfluencerLeaderboard({ bizId, className }: InfluencerLeaderboardProps) {
  const [influencers, setInfluencers] = useState<InfluencerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortMetric>('revenue');

  // Generate mock influencer data
  const generateMockData = (): InfluencerPerformance[] => {
    const names = [
      'Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Kim', 'Jessica Brown',
      'Alex Thompson', 'Maria Garcia', 'Ryan Martinez', 'Lisa Wang', 'James Wilson',
      'Ashley Davis', 'Kevin Lee', 'Rachel Green', 'Tom Anderson', 'Nicole Taylor'
    ];

    const handles = [
      'foodielove', 'mikeeats', 'emilyfoods', 'davidfood', 'jessbites',
      'alexeats', 'mariamunchies', 'ryantastes', 'lisaloves', 'jamesjams',
      'ashleats', 'kevkitchen', 'rachrecipes', 'tomtastes', 'nicolenoms'
    ];

    const tiers: ('Bronze' | 'Silver' | 'Gold' | 'Platinum')[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

    const influencerData: InfluencerPerformance[] = names.map((name, index) => {
      const basePerformance = Math.random() * 0.8 + 0.2; // 0.2-1.0 performance multiplier
      const tier = tiers[Math.floor(basePerformance * tiers.length)];
      
      const revenue_cents = Math.floor((5000 + Math.random() * 45000) * basePerformance); // $50-500
      const coupon_uses = Math.floor((10 + Math.random() * 90) * basePerformance); // 10-100 uses
      const total_orders = Math.floor(coupon_uses * (1.2 + Math.random() * 0.8)); // 1.2-2.0x uses
      const conversion_rate = 0.15 + Math.random() * 0.25; // 15-40%
      const avg_order_value_cents = revenue_cents > 0 ? Math.floor(revenue_cents / coupon_uses) : 0;
      const growth_rate = (Math.random() - 0.5) * 100; // -50% to +50%
      const badge_count = Math.floor(basePerformance * 5); // 0-5 badges

      return {
        id: `inf_${index}`,
        handle: handles[index],
        name,
        avatar: `/api/placeholder/32/32?text=${name.split(' ').map(n => n[0]).join('')}`,
        tier,
        revenue_cents,
        coupon_uses,
        conversion_rate,
        avg_order_value_cents,
        total_orders,
        growth_rate,
        last_active: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        badge_count,
        rank: index + 1,
        previous_rank: Math.random() > 0.3 ? index + Math.floor((Math.random() - 0.5) * 6) + 1 : undefined,
      };
    });

    // Sort by selected metric
    influencerData.sort((a, b) => {
      switch (sortBy) {
        case 'revenue': return b.revenue_cents - a.revenue_cents;
        case 'uses': return b.coupon_uses - a.coupon_uses;
        case 'conversion': return b.conversion_rate - a.conversion_rate;
        case 'growth': return b.growth_rate - a.growth_rate;
        default: return 0;
      }
    });

    // Update ranks
    influencerData.forEach((inf, index) => {
      inf.rank = index + 1;
    });

    return influencerData.slice(0, 10); // Top 10
  };

  useEffect(() => {
    setLoading(true);
    
    // In a real app: /api/business/influencer-leaderboard?bizId=${bizId}&sortBy=${sortBy}
    setTimeout(() => {
      setInfluencers(generateMockData());
      setLoading(false);
    }, 600);
  }, [bizId, sortBy]);

  // Format functions
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  // Get tier colors
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Medal className="w-4 h-4 text-orange-500" />;
      default: return <span className="text-sm font-medium text-gray-600">#{rank}</span>;
    }
  };

  // Get rank change indicator
  const getRankChange = (current: number, previous?: number) => {
    if (!previous) return null;
    
    const change = previous - current;
    if (change === 0) return <span className="text-gray-400">-</span>;
    
    return (
      <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
        {change > 0 ? '↑' : '↓'}{Math.abs(change)}
      </span>
    );
  };

  // Export functionality
  const handleExport = () => {
    const exportData = influencers.map(inf => ({
      Rank: inf.rank,
      'Influencer': `@${inf.handle}`,
      'Name': inf.name,
      'Tier': inf.tier,
      'Revenue': inf.revenue_cents / 100,
      'Coupon Uses': inf.coupon_uses,
      'Conversion Rate': (inf.conversion_rate * 100).toFixed(1) + '%',
      'Avg Order Value': inf.avg_order_value_cents / 100,
      'Growth Rate': formatGrowth(inf.growth_rate),
    }));
    exportToCSV(exportData, `influencer-leaderboard-${bizId}-${sortBy}`);
  };

  // Calculate totals
  const totalRevenue = influencers.reduce((sum, inf) => sum + inf.revenue_cents, 0);
  const totalUses = influencers.reduce((sum, inf) => sum + inf.coupon_uses, 0);
  const avgConversion = influencers.length > 0 ? influencers.reduce((sum, inf) => sum + inf.conversion_rate, 0) / influencers.length : 0;

  return (
    <ChartContainer
      title="Influencer Leaderboard"
      subtitle="Top performing influencers driving your business growth"
      onExport={handleExport}
      metrics={[
        { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: CHART_COLORS.success },
        { label: 'Total Uses', value: totalUses.toString(), color: CHART_COLORS.primary },
        { label: 'Avg Conversion', value: formatPercentage(avgConversion), color: CHART_COLORS.info },
      ]}
      actions={
        <div className="flex gap-1">
          <Button
            variant={sortBy === 'revenue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('revenue')}
            className={sortBy === 'revenue' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <DollarSign className="w-3 h-3 mr-1" />
            Revenue
          </Button>
          <Button
            variant={sortBy === 'uses' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('uses')}
            className={sortBy === 'uses' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <Target className="w-3 h-3 mr-1" />
            Uses
          </Button>
          <Button
            variant={sortBy === 'conversion' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('conversion')}
            className={sortBy === 'conversion' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Conversion
          </Button>
          <Button
            variant={sortBy === 'growth' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('growth')}
            className={sortBy === 'growth' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <Star className="w-3 h-3 mr-1" />
            Growth
          </Button>
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading influencer data...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {influencers.slice(0, 3).map((influencer, index) => (
              <Card key={influencer.id} className={`${index === 0 ? 'border-yellow-200 bg-yellow-50' : index === 1 ? 'border-gray-200 bg-gray-50' : 'border-orange-200 bg-orange-50'}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2">
                    {getRankIcon(influencer.rank)}
                  </div>
                  <Avatar className="w-12 h-12 mx-auto mb-2">
                    <AvatarImage src={influencer.avatar} alt={influencer.name} />
                    <AvatarFallback>{influencer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-sm">{influencer.name}</h3>
                  <p className="text-xs text-gray-600">@{influencer.handle}</p>
                  <Badge className={`${getTierColor(influencer.tier)} text-xs mt-1`}>
                    {influencer.tier}
                  </Badge>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm font-medium">{formatCurrency(influencer.revenue_cents)}</div>
                    <div className="text-xs text-gray-600">{influencer.coupon_uses} uses</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Full Leaderboard Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Influencer</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Uses</TableHead>
                <TableHead className="text-right">Conv Rate</TableHead>
                <TableHead className="text-right">AOV</TableHead>
                <TableHead className="text-right">Growth</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {influencers.map((influencer, index) => (
                <TableRow key={influencer.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(influencer.rank)}
                      {getRankChange(influencer.rank, influencer.previous_rank)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={influencer.avatar} alt={influencer.name} />
                        <AvatarFallback className="text-xs">
                          {influencer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{influencer.name}</div>
                        <div className="text-xs text-gray-600">@{influencer.handle}</div>
                      </div>
                      {influencer.badge_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-yellow-600">{influencer.badge_count}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={getTierColor(influencer.tier)}>
                      {influencer.tier}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right font-medium">
                    {formatCurrency(influencer.revenue_cents)}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    {influencer.coupon_uses}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <span className={influencer.conversion_rate >= 0.25 ? 'text-green-600' : influencer.conversion_rate >= 0.20 ? 'text-blue-600' : 'text-gray-600'}>
                      {formatPercentage(influencer.conversion_rate)}
                    </span>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    {formatCurrency(influencer.avg_order_value_cents)}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <span className={influencer.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatGrowth(influencer.growth_rate)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Contact
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Insights */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Performance Insights</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Top performer: {influencers[0]?.name} with {formatCurrency(influencers[0]?.revenue_cents || 0)}</p>
                <p>• {influencers.filter(inf => inf.tier === 'Gold' || inf.tier === 'Platinum').length} premium tier influencers</p>
                <p>• Average growth rate: {formatGrowth(influencers.reduce((sum, inf) => sum + inf.growth_rate, 0) / influencers.length)}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Focus partnerships with top 5 performers</p>
                <p>• Reward high-growth influencers with bonuses</p>
                <p>• Consider tier upgrades for consistent performers</p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Click influencers to view detailed performance history
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Users className="w-3 h-3 mr-1" />
                Recruit New Influencers
              </Button>
              <Button size="sm" className="bg-brand hover:bg-brand/90">
                <Trophy className="w-3 h-3 mr-1" />
                Create Competition
              </Button>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
} 