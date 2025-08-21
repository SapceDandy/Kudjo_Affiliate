'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, PieChart, LineChart, FileText, Download } from 'lucide-react';

export default function ReportsPage() {
  const [loading, setLoading] = useState<{[key: string]: boolean}>({
    revenue: false,
    demographics: false,
    growth: false,
    custom: false
  });
  
  const handleGenerateReport = async (type: string) => {
    setLoading(prev => ({ ...prev, [type.toLowerCase()]: true }));
    
    try {
      // Generate mock data based on report type
      let data: any = {};
      const currentDate = new Date().toISOString().split('T')[0];
      
      switch (type) {
        case 'Revenue':
          data = {
            reportType: 'Revenue Report',
            generatedDate: currentDate,
            totalRevenue: '$40,659.09',
            averageOrderValue: '$45.78',
            topBusinesses: [
              { name: 'Business A', revenue: '$5,432.10' },
              { name: 'Business B', revenue: '$4,321.09' },
              { name: 'Business C', revenue: '$3,210.87' }
            ],
            monthlySummary: [
              { month: 'January', revenue: '$3,210.45' },
              { month: 'February', revenue: '$3,542.67' },
              { month: 'March', revenue: '$4,123.89' },
              { month: 'April', revenue: '$3,987.65' },
              { month: 'May', revenue: '$4,567.32' },
              { month: 'June', revenue: '$5,234.56' }
            ]
          };
          break;
        case 'Demographics':
          data = {
            reportType: 'User Demographics Report',
            generatedDate: currentDate,
            totalUsers: 405,
            businessUsers: 200,
            influencerUsers: 200,
            adminUsers: 5,
            businessCategories: [
              { category: 'Food & Beverage', count: 87 },
              { category: 'Retail', count: 54 },
              { category: 'Services', count: 43 },
              { category: 'Other', count: 16 }
            ],
            influencerCategories: [
              { category: 'Lifestyle', count: 76 },
              { category: 'Food', count: 65 },
              { category: 'Travel', count: 34 },
              { category: 'Fashion', count: 25 }
            ]
          };
          break;
        case 'Growth':
          data = {
            reportType: 'Growth Trends Report',
            generatedDate: currentDate,
            totalUsers: 405,
            newUsersLastMonth: 45,
            growthRate: '12.5%',
            retentionRate: '87.3%',
            monthlyGrowth: [
              { month: 'January', newUsers: 32 },
              { month: 'February', newUsers: 28 },
              { month: 'March', newUsers: 35 },
              { month: 'April', newUsers: 42 },
              { month: 'May', newUsers: 38 },
              { month: 'June', newUsers: 45 }
            ]
          };
          break;
        case 'Custom':
          data = {
            reportType: 'Custom Report',
            generatedDate: currentDate,
            customData: 'This is a custom report with user-defined parameters.'
          };
          break;
      }
      
      // Convert data to CSV
      const csvContent = convertToCSV(data);
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${type.toLowerCase()}_report_${currentDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error(`Error generating ${type} report:`, error);
      alert(`Failed to generate ${type} report. Please try again.`);
    } finally {
      setLoading(prev => ({ ...prev, [type.toLowerCase()]: false }));
    }
  };
  
  // Helper function to convert JSON to CSV
  const convertToCSV = (data: any) => {
    // Handle nested objects and arrays
    const flattenData = (obj: any, prefix = '') => {
      let result: {[key: string]: string} = {};
      
      for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            // Handle arrays by creating numbered keys
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                Object.assign(result, flattenData(item, `${newKey}[${index}]`));
              } else {
                result[`${newKey}[${index}]`] = String(item);
              }
            });
          } else {
            // Handle nested objects
            Object.assign(result, flattenData(value, newKey));
          }
        } else {
          result[newKey] = String(value);
        }
      }
      
      return result;
    };
    
    const flatData = flattenData(data);
    const headers = Object.keys(flatData);
    const values = Object.values(flatData);
    
    return headers.join(',') + '\n' + values.join(',');
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5" />
              Revenue Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Generate a comprehensive revenue report with breakdowns by business and time period
            </p>
            <Button 
              className="w-full" 
              onClick={() => handleGenerateReport('Revenue')}
              disabled={loading.revenue}
            >
              {loading.revenue ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              User Demographics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Generate a report on user demographics, including business types and influencer categories
            </p>
            <Button 
              className="w-full" 
              onClick={() => handleGenerateReport('Demographics')}
              disabled={loading.demographics}
            >
              {loading.demographics ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Growth Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Generate a report on platform growth trends, including user acquisition and retention
            </p>
            <Button 
              className="w-full" 
              onClick={() => handleGenerateReport('Growth')}
              disabled={loading.growth}
            >
              {loading.growth ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Custom Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Generate a custom report with specific parameters and filters
            </p>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleGenerateReport('Custom')}
              disabled={loading.custom}
            >
              {loading.custom ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Create Custom Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 