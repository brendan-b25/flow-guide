import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Download, Loader2, Sparkles, File, Table } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table as DocxTable, TableRow, TableCell, WidthType } from 'docx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function DocumentGenerator() {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional document template based on this description: "${description}"

Create a structured document with:
- title: Document title
- description: Brief description
- sections: Array of sections, each with:
  - heading: Section heading
  - content: Detailed content (plain text or bullet points)
  - type: "text", "table", or "list"
  - tableData: (if type is "table") Array of rows, each row is an array of cell values
  - listItems: (if type is "list") Array of list items

Make it professional, complete, and ready to use. Use Australian English. Include all necessary sections for this type of document.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  content: { type: "string" },
                  type: { type: "string", enum: ["text", "table", "list"] },
                  tableData: {
                    type: "array",
                    items: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  listItems: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            }
          },
          required: ["title", "sections"]
        }
      });

      setGeneratedContent(result);
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToWord = async () => {
    if (!generatedContent) return;
    setIsExporting(true);
    setExportFormat('docx');

    try {
      const children = [
        new Paragraph({
          text: generatedContent.title,
          heading: HeadingLevel.TITLE,
          spacing: { after: 400 }
        })
      ];

      if (generatedContent.description) {
        children.push(new Paragraph({
          text: generatedContent.description,
          spacing: { after: 600 }
        }));
      }

      generatedContent.sections.forEach(section => {
        children.push(new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }));

        if (section.type === 'table' && section.tableData) {
          const tableRows = section.tableData.map(row => 
            new TableRow({
              children: row.map(cell => 
                new TableCell({
                  children: [new Paragraph(cell)],
                  width: { size: 100 / row.length, type: WidthType.PERCENTAGE }
                })
              )
            })
          );

          children.push(new DocxTable({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          }));
        } else if (section.type === 'list' && section.listItems) {
          section.listItems.forEach(item => {
            children.push(new Paragraph({
              text: `• ${item}`,
              spacing: { after: 100 }
            }));
          });
        } else {
          children.push(new Paragraph({
            text: section.content || '',
            spacing: { after: 300 }
          }));
        }
      });

      const doc = new Document({
        sections: [{ properties: {}, children }]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedContent.title.replace(/[^a-z0-9]/gi, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Word export error:', error);
      alert('Failed to export Word document.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const exportToExcel = async () => {
    if (!generatedContent) return;
    setIsExporting(true);
    setExportFormat('xlsx');

    try {
      const data = [
        [generatedContent.title],
        [generatedContent.description || ''],
        []
      ];

      generatedContent.sections.forEach(section => {
        data.push([section.heading]);
        
        if (section.type === 'table' && section.tableData) {
          section.tableData.forEach(row => data.push(row));
        } else if (section.type === 'list' && section.listItems) {
          section.listItems.forEach(item => data.push([item]));
        } else {
          data.push([section.content || '']);
        }
        
        data.push([]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 80 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Document');
      
      XLSX.writeFile(wb, `${generatedContent.title.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export Excel file.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const exportToPDF = async () => {
    if (!generatedContent) return;
    setIsExporting(true);
    setExportFormat('pdf');

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      const addText = (text, fontSize, bold = false) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach(line => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += fontSize * 0.4;
        });
      };

      // Title
      addText(generatedContent.title, 20, true);
      yPosition += 5;

      // Description
      if (generatedContent.description) {
        addText(generatedContent.description, 11);
        yPosition += 8;
      }

      // Sections
      generatedContent.sections.forEach(section => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        addText(section.heading, 14, true);
        yPosition += 3;

        if (section.type === 'list' && section.listItems) {
          section.listItems.forEach(item => {
            addText(`• ${item}`, 10);
            yPosition += 2;
          });
        } else if (section.type === 'table' && section.tableData) {
          section.tableData.forEach(row => {
            const rowText = row.join(' | ');
            addText(rowText, 9);
            yPosition += 2;
          });
        } else {
          addText(section.content || '', 10);
        }
        
        yPosition += 8;
      });

      pdf.save(`${generatedContent.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const exportOptions = [
    { format: 'docx', label: 'Word', icon: File, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', action: exportToWord },
    { format: 'xlsx', label: 'Excel', icon: Table, color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100', action: exportToExcel },
    { format: 'pdf', label: 'PDF', icon: FileText, color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100', action: exportToPDF }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
            Document Template Generator
          </h1>
          <p className="text-base sm:text-lg text-slate-600">
            Describe your document and AI will generate a professional template
          </p>
        </div>

        {/* Generator Section */}
        <Card className="mb-8 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Describe Your Document
            </CardTitle>
            <CardDescription>
              Tell us what kind of document, form, or report you need
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: Create a safety incident report form with fields for date, location, incident description, injuries, witnesses, and corrective actions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[150px] resize-none text-base"
            />
            <Button
              onClick={handleGenerate}
              disabled={!description.trim() || isGenerating}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Template...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Template
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview and Export */}
        {generatedContent && (
          <>
            <Card className="mb-6 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-2xl">{generatedContent.title}</CardTitle>
                {generatedContent.description && (
                  <CardDescription className="text-base">{generatedContent.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {generatedContent.sections.map((section, idx) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900">{section.heading}</h3>
                    
                    {section.type === 'table' && section.tableData ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border border-slate-200 rounded-lg">
                          <tbody>
                            {section.tableData.map((row, rowIdx) => (
                              <tr key={rowIdx} className={rowIdx === 0 ? 'bg-slate-100 font-medium' : 'bg-white'}>
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="border border-slate-200 px-4 py-2 text-sm">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : section.type === 'list' && section.listItems ? (
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {section.listItems.map((item, itemIdx) => (
                          <li key={itemIdx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-700 whitespace-pre-line">{section.content}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  Download Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {exportOptions.map((option) => {
                    const Icon = option.icon;
                    const isCurrentlyExporting = isExporting && exportFormat === option.format;
                    
                    return (
                      <button
                        key={option.format}
                        onClick={option.action}
                        disabled={isExporting}
                        className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                          isExporting && !isCurrentlyExporting 
                            ? 'opacity-50 cursor-not-allowed' 
                            : option.color
                        }`}
                      >
                        {isCurrentlyExporting ? (
                          <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                          <Icon className="w-8 h-8" />
                        )}
                        <span className="font-semibold">
                          {isCurrentlyExporting ? 'Exporting...' : option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Examples */}
        {!generatedContent && (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-slate-50">
            <CardHeader>
              <CardTitle className="text-lg">Example Prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                'Create an employee onboarding checklist with sections for IT setup, training, and documentation',
                'Generate a safety inspection form for warehouse operations',
                'Design a client feedback survey with rating scales and comment fields',
                'Create a monthly expense report template with categories and totals',
                'Generate a meeting minutes template with attendees, agenda items, and action items'
              ].map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setDescription(example)}
                  className="w-full text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-slate-700"
                >
                  {example}
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}