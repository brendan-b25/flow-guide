import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, File, Table, Loader2 } from 'lucide-react';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function ExportDialog({ manual, sections, branding }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);

  const exportToPDF = async () => {
    setIsExporting(true);
    setExportFormat('pdf');
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      // Helper to convert hex color to RGB
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 30, g: 64, b: 175 };
      };
      
      // Add cover page
      const coverColor = hexToRgb(manual.cover_color || '#1e40af');
      pdf.setFillColor(coverColor.r, coverColor.g, coverColor.b);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(manual.title, maxWidth);
      pdf.text(titleLines, pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });
      
      if (manual.description) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(manual.description, maxWidth);
        pdf.text(descLines, pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });
      }

      // Add new page for content
      pdf.addPage();
      let yPosition = margin;
      
      sections.forEach((section, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        // Section title
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        const titleText = `${index + 1}. ${section.title}`;
        const titleLines = pdf.splitTextToSize(titleText, maxWidth);
        
        titleLines.forEach(line => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += 8;
        });
        
        yPosition += 3;

        // Section content
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        // Clean markdown and format content
        const cleanContent = section.content
          .replace(/[*_~`]/g, '')
          .replace(/#{1,6}\s/g, '')
          .replace(/\n{3,}/g, '\n\n');
        
        const contentLines = pdf.splitTextToSize(cleanContent, maxWidth);
        
        contentLines.forEach(line => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        });
        
        yPosition += 8;
      });

      // Save PDF
      const filename = `${manual.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      pdf.save(filename);
      
    } catch (error) {
      console.error('PDF export error:', error);
      alert(`Failed to export PDF: ${error.message}`);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const exportToWord = async () => {
    setIsExporting(true);
    setExportFormat('docx');
    
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title page
            new Paragraph({
              text: manual.title,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            new Paragraph({
              text: manual.description || '',
              alignment: AlignmentType.CENTER,
              spacing: { after: 800 }
            }),
            
            // Sections
            ...sections.flatMap((section, index) => [
              new Paragraph({
                text: `${index + 1}. ${section.title}`,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
              }),
              new Paragraph({
                text: section.content,
                spacing: { after: 400 }
              })
            ])
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${manual.title}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Word export error:', error);
      alert('Failed to export Word document. Please try again.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    setExportFormat('xlsx');
    
    try {
      const data = [
        ['Manual Title', manual.title],
        ['Description', manual.description || ''],
        ['Status', manual.status],
        ['Created', new Date(manual.created_date).toLocaleDateString()],
        [],
        ['#', 'Section Title', 'Type', 'Content']
      ];

      sections.forEach((section, index) => {
        data.push([
          index + 1,
          section.title,
          section.section_type,
          section.content
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 15 },
        { wch: 60 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Manual');
      
      XLSX.writeFile(wb, `${manual.title}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const exportOptions = [
    {
      format: 'pdf',
      label: 'PDF Document',
      description: 'Best for printing and sharing',
      icon: FileText,
      color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      action: exportToPDF
    },
    {
      format: 'docx',
      label: 'Word Document',
      description: 'Editable format',
      icon: File,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      action: exportToWord
    },
    {
      format: 'xlsx',
      label: 'Excel Spreadsheet',
      description: 'Data and analysis',
      icon: Table,
      color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      action: exportToExcel
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Download className="w-6 h-6 text-blue-600" />
            Export Manual
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          <p className="text-sm text-slate-600">
            Choose your preferred format to download the manual
          </p>
          
          <div className="space-y-3">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              const isCurrentlyExporting = isExporting && exportFormat === option.format;
              
              return (
                <button
                  key={option.format}
                  onClick={option.action}
                  disabled={isExporting}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    isExporting && !isCurrentlyExporting 
                      ? 'opacity-50 cursor-not-allowed' 
                      : option.color
                  }`}
                >
                  {isCurrentlyExporting ? (
                    <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" />
                  ) : (
                    <Icon className="w-6 h-6 flex-shrink-0" />
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-xs opacity-75">
                      {isCurrentlyExporting ? 'Generating...' : option.description}
                    </div>
                  </div>
                  <Download className="w-4 h-4 opacity-50" />
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
            <strong>Note:</strong> PDF format includes all images and formatting. 
            Word and Excel formats contain text content only.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}