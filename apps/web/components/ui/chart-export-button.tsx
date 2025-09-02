'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Image } from 'lucide-react';
import { exportChartToPDF, ChartExportOptions } from '@/lib/utils/pdf-export';
import { toast } from 'react-hot-toast';

interface ChartExportButtonProps {
  chartRef: React.RefObject<HTMLElement>;
  title?: string;
  filename?: string;
  className?: string;
}

export function ChartExportButton({ 
  chartRef, 
  title = 'Chart', 
  filename = 'chart-export',
  className 
}: ChartExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'png' | 'jpeg') => {
    if (!chartRef.current) {
      toast.error('Chart not found. Please try again.');
      return;
    }

    setIsExporting(true);
    
    try {
      const options: ChartExportOptions = {
        title,
        filename,
        format,
        includeDate: true,
        quality: 0.95
      };

      await exportChartToPDF(chartRef.current, options);
      toast.success(`Chart exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export chart. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={className}
          disabled={isExporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('png')}>
          <Image className="h-4 w-4 mr-2" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('jpeg')}>
          <Image className="h-4 w-4 mr-2" />
          Export as JPEG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
