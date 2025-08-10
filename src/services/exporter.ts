import type { Recommendation } from '../types';
import jsPDF from 'jspdf';

export function exportAsTxt(recs: Recommendation[]): void {
  const content = generateTxtContent(recs);
  downloadFile(content, 'social-media-analytics-recommendations.txt', 'text/plain');
}

export function exportAsPdf(recs: Recommendation[]): void {
  const doc = new jsPDF();
  
  // Title page
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Social Media Analytics Tools', 105, 40, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Saved Recommendations', 105, 55, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Exported on ${new Date().toLocaleDateString()}`, 105, 70, { align: 'center' });
  
  // Add recommendations
  let yPosition = 100;
  
  recs.forEach((rec, index) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${rec.title}`, 20, yPosition);
    yPosition += 8;
    
    // URL if available
    if (rec.url) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 255);
      doc.text(`Website: ${rec.url}`, 20, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 6;
    }
    
    // Snippet if available
    if (rec.snippet) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(rec.snippet, 170);
      doc.text(lines, 20, yPosition);
      yPosition += lines.length * 5;
    }
    
    // Date
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Saved: ${new Date(rec.createdAt).toLocaleDateString()}`, 20, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 12;
  });
  
  // Save the PDF
  doc.save('social-media-analytics-recommendations.pdf');
}

function generateTxtContent(recs: Recommendation[]): string {
  const header = `Social Media Analytics Tools - Saved Recommendations
Exported on ${new Date().toLocaleDateString()}
Total items: ${recs.length}

${'='.repeat(60)}

`;

  const items = recs.map((rec, index) => {
    let item = `${index + 1}. ${rec.title}\n`;
    
    if (rec.url) {
      item += `   Website: ${rec.url}\n`;
    }
    
    if (rec.snippet) {
      item += `   ${rec.snippet}\n`;
    }
    
    item += `   Saved: ${new Date(rec.createdAt).toLocaleDateString()}\n`;
    item += '\n';
    
    return item;
  }).join('');
  
  return header + items;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
