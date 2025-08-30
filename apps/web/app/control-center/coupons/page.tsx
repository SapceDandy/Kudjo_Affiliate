'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, Search, Download, Filter, X, CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [pageSize] = useState(20);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const loadPage = async (direction: 'next' | 'prev' | 'init' = 'init') => {
    try {
      setLoading(true);
      setError(null);
      const cursor = direction === 'next' ? nextCursor : direction === 'prev' ? cursorStack[cursorStack.length - 2] : null;
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/control-center/coupons/list?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch coupons: ${response.status}`);
      const data = await response.json();
      setCoupons(data.items || data.coupons || []);
      setNextCursor(data.nextCursor || null);
      if (direction === 'next') {
        if (nextCursor) setCursorStack(prev => [...prev, nextCursor]);
        else if (data.items?.length) setCursorStack(prev => [...prev, data.items[data.items.length - 1].id]);
      } else if (direction === 'init') {
        setCursorStack(data.items?.length ? [data.items[data.items.length - 1].id] : []);
      } else if (direction === 'prev') {
        setCursorStack(prev => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev));
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError('Failed to load coupons data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage('init');
  }, []);

  const canPrev = cursorStack.length > 1;
  const canNext = Boolean(nextCursor);

  // Filter and search coupons
  const filteredCoupons = coupons.filter(coupon => {
    // Apply type filter
    if (filter !== 'all' && coupon.type !== filter) {
      return false;
    }
    
    // Apply search
    if (searchTerm && !coupon.code?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const handleExportCoupons = async () => {
    setExporting(true);
    
    try {
      // Use the filtered coupons for export
      const dataToExport = filteredCoupons;
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Convert data to JSON
      const jsonString = JSON.stringify(dataToExport, null, 2);
      
      // Create a blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `coupons_export_${currentDate}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Error exporting coupons:', error);
      alert('Failed to export coupons. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleViewDetails = (coupon: any) => {
    setSelectedCoupon(coupon);
    setShowCouponDialog(true);
  };

  const handleMarkUsed = async () => {
    if (!selectedCoupon) return;
    try {
      const res = await fetch('/api/control-center/coupons/mark-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedCoupon.id })
      });
      if (!res.ok) throw new Error('Failed');
      setShowCouponDialog(false);
      loadPage('init');
    } catch (e) {
      alert('Failed to mark used');
    }
  };

  const handleEditCoupon = async (updates: any) => {
    if (!selectedCoupon) return;
    try {
      const res = await fetch('/api/control-center/coupons/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedCoupon.id, updates })
      });
      if (!res.ok) throw new Error('Failed');
      setShowCouponDialog(false);
      loadPage('init');
    } catch (e) {
      alert('Update failed');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coupons Management</h1>
        <Button onClick={handleExportCoupons} disabled={exporting}>
          {exporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Coupons
            </>
          )}
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by coupon code..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button 
                variant={filter === 'AFFILIATE' ? 'default' : 'outline'} 
                onClick={() => setFilter('AFFILIATE')}
              >
                Affiliate
              </Button>
              <Button 
                variant={filter === 'CONTENT_MEAL' ? 'default' : 'outline'} 
                onClick={() => setFilter('CONTENT_MEAL')}
              >
                Content Meal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Tag className="w-12 h-12 mx-auto text-gray-400" />
          <h2 className="text-xl font-semibold mt-4">No coupons found</h2>
          <p className="text-gray-500 mt-2">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'No coupons have been created yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 border-b">Code</th>
                <th className="text-left p-3 border-b">Type</th>
                <th className="text-left p-3 border-b">Business</th>
                <th className="text-left p-3 border-b">Influencer</th>
                <th className="text-left p-3 border-b">Created</th>
                <th className="text-left p-3 border-b">Status</th>
                <th className="text-left p-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono">{coupon.code}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      coupon.type === 'AFFILIATE' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {coupon.type}
                    </span>
                  </td>
                  <td className="p-3">{coupon.businessName || coupon.bizId}</td>
                  <td className="p-3">{coupon.influencerName || coupon.infId}</td>
                  <td className="p-3">{new Date(coupon.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      coupon.used 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {coupon.used ? 'Used' : 'Active'}
                    </span>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(coupon)}>
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" disabled={!canPrev || loading} onClick={() => loadPage('prev')}>Previous</Button>
            <div className="text-sm text-gray-500">Page size: {pageSize}</div>
            <Button variant="outline" disabled={!canNext || loading} onClick={() => loadPage('next')}>Next</Button>
          </div>
        </div>
      )}

      {/* Coupon Details Dialog */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Coupon Details</DialogTitle>
          </DialogHeader>
          
          {selectedCoupon && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">Coupon Code</p>
                <input
                  className="w-full text-center font-mono text-2xl font-bold bg-transparent border-b focus:outline-none"
                  value={selectedCoupon.code}
                  onChange={(e) => setSelectedCoupon({ ...selectedCoupon, code: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedCoupon.type === 'AFFILIATE' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedCoupon.type}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium flex items-center">
                    {selectedCoupon.used ? (
                      <>
                        <XCircle className="h-4 w-4 text-gray-500 mr-1" />
                        Used
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        Active
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Business</p>
                  <p className="font-medium">{selectedCoupon.businessName || selectedCoupon.bizId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Influencer</p>
                  <p className="font-medium">{selectedCoupon.influencerName || selectedCoupon.infId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{new Date(selectedCoupon.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Offer ID</p>
                  <p className="font-medium text-xs font-mono">{selectedCoupon.offerId}</p>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEditCoupon({ code: selectedCoupon.code })}>Save</Button>
                {!selectedCoupon.used && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleMarkUsed}
                  >
                    Mark as Used
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 