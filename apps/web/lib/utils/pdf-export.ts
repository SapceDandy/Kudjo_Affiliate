import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ChartExportOptions {
  title?: string;
  filename?: string;
  includeDate?: boolean;
  format?: 'pdf' | 'png' | 'jpeg';
  quality?: number;
}

export async function exportChartToPDF(
  chartElement: HTMLElement,
  options: ChartExportOptions = {}
): Promise<void> {
  const {
    title = 'Chart Export',
    filename = 'chart-export',
    includeDate = true,
    format = 'pdf',
    quality = 0.95
  } = options;

  try {
    // Create canvas from the chart element
    const canvas = await html2canvas(chartElement, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png', quality);
    
    if (format === 'png' || format === 'jpeg') {
      // Direct image download
      const link = document.createElement('a');
      link.download = `${filename}.${format}`;
      link.href = format === 'jpeg' 
        ? canvas.toDataURL('image/jpeg', quality)
        : imgData;
      link.click();
      return;
    }

    // PDF export
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Calculate dimensions to fit the page
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    const maxHeight = pageHeight - (margin * 3); // Extra space for title

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);

    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;

    // Center the image
    const x = (pageWidth - scaledWidth) / 2;
    const y = margin + 15; // Space for title

    // Add title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, pageWidth / 2, margin, { align: 'center' });

    // Add date if requested
    if (includeDate) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleDateString();
      pdf.text(`Generated on ${dateStr}`, pageWidth / 2, margin + 8, { align: 'center' });
    }

    // Add the chart image
    pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

    // Save the PDF
    pdf.save(`${filename}.pdf`);

  } catch (error) {
    console.error('Error exporting chart:', error);
    throw new Error('Failed to export chart. Please try again.');
  }
}

export async function exportMultipleChartsToPDF(
  charts: Array<{ element: HTMLElement; title: string }>,
  options: ChartExportOptions = {}
): Promise<void> {
  const {
    title = 'Charts Export',
    filename = 'charts-export',
    includeDate = true
  } = options;

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - (margin * 2);

    // Add main title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, pageWidth / 2, margin, { align: 'center' });

    if (includeDate) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleDateString();
      pdf.text(`Generated on ${dateStr}`, pageWidth / 2, margin + 8, { align: 'center' });
    }

    let currentY = margin + 20;

    for (let i = 0; i < charts.length; i++) {
      const { element, title: chartTitle } = charts[i];

      // Create canvas for this chart
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png', 0.9);
      
      // Calculate scaled dimensions
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = maxWidth / imgWidth;
      const scaledWidth = maxWidth;
      const scaledHeight = imgHeight * ratio;

      // Check if we need a new page
      if (currentY + scaledHeight + 30 > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }

      // Add chart title
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(chartTitle, margin, currentY);
      currentY += 10;

      // Add chart image
      const x = (pageWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, currentY, scaledWidth, scaledHeight);
      currentY += scaledHeight + 15;
    }

    pdf.save(`${filename}.pdf`);

  } catch (error) {
    console.error('Error exporting multiple charts:', error);
    throw new Error('Failed to export charts. Please try again.');
  }
}

// Utility function to find chart elements in a container
export function findChartElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    '[data-chart]',
    '.recharts-wrapper',
    '.chart-container',
    'canvas',
    'svg'
  ];
  
  const charts: HTMLElement[] = [];
  
  selectors.forEach(selector => {
    const elements = container.querySelectorAll(selector);
    elements.forEach(el => {
      if (el instanceof HTMLElement && !charts.includes(el)) {
        charts.push(el);
      }
    });
  });
  
  return charts;
}
