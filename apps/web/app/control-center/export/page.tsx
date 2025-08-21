'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Calendar, Database } from 'lucide-react';

export default function ExportPage() {
  const [exporting, setExporting] = useState<{[key: string]: boolean}>({
    user: false,
    coupon: false,
    transaction: false,
    database: false
  });
  
  const handleExport = async (type: string) => {
    setExporting(prev => ({ ...prev, [type.toLowerCase()]: true }));
    
    try {
      // Fetch data based on export type
      let data: any[] = [];
      const currentDate = new Date().toISOString().split('T')[0];
      
      switch (type) {
        case 'User':
          // Fetch user data
          const userResponse = await fetch('/api/control-center/users');
          if (!userResponse.ok) {
            throw new Error(`Failed to fetch user data: ${userResponse.status}`);
          }
          const userData = await userResponse.json();
          data = userData.users || [];
          break;
          
        case 'Coupon':
          // Fetch coupon data
          const couponResponse = await fetch('/api/control-center/coupons/list');
          if (!couponResponse.ok) {
            throw new Error(`Failed to fetch coupon data: ${couponResponse.status}`);
          }
          const couponData = await couponResponse.json();
          data = couponData.coupons || [];
          break;
          
        case 'Transaction':
          // Mock transaction data
          data = Array.from({ length: 50 }, (_, i) => ({
            id: `txn-${i + 1000}`,
            amount: Math.floor(Math.random() * 10000) / 100,
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            businessId: `biz-${Math.floor(Math.random() * 20) + 1}`,
            influencerId: `inf-${Math.floor(Math.random() * 50) + 1}`,
            couponId: `cpn-${Math.floor(Math.random() * 100) + 1}`,
            status: Math.random() > 0.1 ? 'completed' : 'pending'
          }));
          break;
          
        case 'Database':
          // Mock database export with combined data
          // Fetch users
          const usersResp = await fetch('/api/control-center/users');
          const users = usersResp.ok ? (await usersResp.json()).users || [] : [];
          
          // Fetch coupons
          const couponsResp = await fetch('/api/control-center/coupons/list');
          const coupons = couponsResp.ok ? (await couponsResp.json()).coupons || [] : [];
          
          // Create mock transactions
          const transactions = Array.from({ length: 20 }, (_, i) => ({
            id: `txn-${i + 1000}`,
            amount: Math.floor(Math.random() * 10000) / 100,
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: Math.random() > 0.1 ? 'completed' : 'pending'
          }));
          
          data = [
            { type: 'metadata', exportDate: new Date().toISOString(), version: '1.0.0' },
            { type: 'users', data: users },
            { type: 'coupons', data: coupons },
            { type: 'transactions', data: transactions }
          ];
          break;
      }
      
      // Convert data to JSON
      const jsonString = JSON.stringify(data, null, 2);
      
      // Create a blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${type.toLowerCase()}_data_${currentDate}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error(`Error exporting ${type} data:`, error);
      alert(`Failed to export ${type} data. Please try again.`);
    } finally {
      setExporting(prev => ({ ...prev, [type.toLowerCase()]: false }));
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Export Data</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              User Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Export all user data including businesses and influencers
            </p>
            <Button 
              className="w-full" 
              onClick={() => handleExport('User')}
              disabled={exporting.user}
            >
              {exporting.user ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Users
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Coupon Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Export all coupon data including redemptions and statistics
            </p>
            <Button 
              className="w-full" 
              onClick={() => handleExport('Coupon')}
              disabled={exporting.coupon}
            >
              {exporting.coupon ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Coupons
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Export all transaction data including payments and commissions
            </p>
            <Button 
              className="w-full" 
              onClick={() => handleExport('Transaction')}
              disabled={exporting.transaction}
            >
              {exporting.transaction ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Transactions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Complete Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Export the entire database (admin only)
            </p>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleExport('Database')}
              disabled={exporting.database}
            >
              {exporting.database ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Database
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 