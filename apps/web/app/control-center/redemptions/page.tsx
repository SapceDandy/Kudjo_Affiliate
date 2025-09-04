'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Search, DollarSign, Calendar, User, Building } from 'lucide-react';
import toast from 'react-hot-toast';

interface Redemption {
  id: string;
  couponCode: string;
  businessName: string;
  influencerName: string;
  amount: number;
  type: 'AFFILIATE' | 'CONTENT_MEAL';
  status: 'pending' | 'processed' | 'failed';
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

interface ManualRedemptionForm {
  couponCode: string;
  businessId: string;
  influencerId: string;
  amount: number;
  type: 'AFFILIATE' | 'CONTENT_MEAL';
  notes: string;
}

export default function RedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [processingAdd, setProcessingAdd] = useState(false);
  const [processingImport, setProcessingImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<ManualRedemptionForm>({
    couponCode: '',
    businessId: '',
    influencerId: '',
    amount: 0,
    type: 'AFFILIATE',
    notes: ''
  });

  const loadRedemptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/redemptions');
      if (!response.ok) throw new Error('Failed to fetch redemptions');
      const data = await response.json();
      setRedemptions(data.redemptions || []);
    } catch (error) {
      console.error('Error loading redemptions:', error);
      toast.error('Failed to load redemptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRedemptions();
  }, []);

  const filteredRedemptions = redemptions.filter(redemption =>
    redemption.couponCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redemption.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redemption.influencerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddRedemption = async () => {
    if (!formData.couponCode || !formData.businessId || !formData.influencerId || formData.amount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setProcessingAdd(true);
      const response = await fetch('/api/admin/redemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add redemption');
      }

      toast.success('Redemption added successfully');
      setShowAddDialog(false);
      setFormData({
        couponCode: '',
        businessId: '',
        influencerId: '',
        amount: 0,
        type: 'AFFILIATE',
        notes: ''
      });
      await loadRedemptions();
    } catch (error: any) {
      console.error('Error adding redemption:', error);
      toast.error(error.message || 'Failed to add redemption');
    } finally {
      setProcessingAdd(false);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setProcessingImport(true);
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/admin/redemptions/import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import CSV');
      }

      const result = await response.json();
      toast.success(`Successfully imported ${result.imported} redemptions`);
      setShowImportDialog(false);
      setCsvFile(null);
      await loadRedemptions();
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      toast.error(error.message || 'Failed to import CSV');
    } finally {
      setProcessingImport(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'AFFILIATE': return 'bg-blue-100 text-blue-800';
      case 'CONTENT_MEAL': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manual Redemptions</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowImportDialog(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Redemption
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by coupon code, business, or influencer..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Redemptions ({filteredRedemptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRedemptions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No redemptions found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try adjusting your search term' : 'No redemptions have been added yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Coupon Code</th>
                      <th className="text-left p-3">Business</th>
                      <th className="text-left p-3">Influencer</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-left p-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRedemptions.map((redemption) => (
                      <tr key={redemption.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <span className="font-mono text-sm">{redemption.couponCode}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2 text-gray-400" />
                            {redemption.businessName}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            {redemption.influencerName}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold">${redemption.amount.toFixed(2)}</span>
                        </td>
                        <td className="p-3">
                          <Badge className={getTypeColor(redemption.type)}>
                            {redemption.type === 'AFFILIATE' ? 'Affiliate' : 'Content Meal'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={getStatusColor(redemption.status)}>
                            {redemption.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(redemption.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-600">
                            {redemption.notes || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Redemption Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Redemption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="couponCode">Coupon Code *</Label>
              <Input
                id="couponCode"
                value={formData.couponCode}
                onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value }))}
                placeholder="Enter coupon code"
              />
            </div>
            <div>
              <Label htmlFor="businessId">Business ID *</Label>
              <Input
                id="businessId"
                value={formData.businessId}
                onChange={(e) => setFormData(prev => ({ ...prev, businessId: e.target.value }))}
                placeholder="Enter business ID"
              />
            </div>
            <div>
              <Label htmlFor="influencerId">Influencer ID *</Label>
              <Input
                id="influencerId"
                value={formData.influencerId}
                onChange={(e) => setFormData(prev => ({ ...prev, influencerId: e.target.value }))}
                placeholder="Enter influencer ID"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value: 'AFFILIATE' | 'CONTENT_MEAL') => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFFILIATE">Affiliate</SelectItem>
                  <SelectItem value="CONTENT_MEAL">Content Meal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRedemption} disabled={processingAdd}>
                {processingAdd ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  'Add Redemption'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Redemptions from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csvFile">CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-gray-500 mt-2">
                CSV should have columns: couponCode, businessId, influencerId, amount, type, notes
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleImportCSV} disabled={processingImport || !csvFile}>
                {processingImport ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  'Import CSV'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
