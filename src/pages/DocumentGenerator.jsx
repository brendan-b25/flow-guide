import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Download, Loader2, Sparkles, File, Table, Save } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table as DocxTable, TableRow, TableCell, WidthType } from 'docx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function DocumentGenerator() {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional, fully-formatted document template based on this description: "${description}"

CRITICAL FORMATTING INSTRUCTIONS - READ CAREFULLY:

1. TABLE FORMATTING:
   - ALWAYS use type: "table" with tableData array for ANY tabular data
   - NEVER put table-like content as plain text or markdown in "content" or "listItems"
   - Examples requiring tables: forms with fields, data collection sheets, comparison charts, schedules, checklists with columns
   - Table structure: tableData: [["Header 1", "Header 2", ...], ["Data 1", "Data 2", ...], ...]
   - First row should be headers, subsequent rows are data

2. WHEN TO USE EACH TYPE:
   - type: "table" - For any structured data with rows/columns (forms, data sheets, schedules, comparison tables)
   - type: "list" - For bullet points, sequential steps, or simple lists (use listItems array)
   - type: "text" - For paragraphs, explanations, or narrative content (use content field)

3. SECTION STRUCTURE:
   Create a structured document with:
   - title: Professional, descriptive document title
   - description: Brief overview of the document's purpose
   - sections: Array of sections, each with:
     - heading: Clear section heading
     - content: Detailed text content (for type: "text")
     - type: "text", "table", or "list" - CHOOSE APPROPRIATELY
     - tableData: Array of arrays (for type: "table") - [[headers...], [row1...], [row2...]]
     - listItems: Array of strings (for type: "list")

4. CONTENT QUALITY:
   - Make it complete and professional
   - Include all relevant sections for this document type
   - Be specific and actionable
   - Use clear, concise language
   - Organize logically with appropriate headings
   - Ensure it's ready to use without further editing

Use Australian English throughout. Create a document that looks professional when exported to Word, Excel, or PDF.`,
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
      const { ShadingType, BorderStyle, convertInchesToTwip } = await import('docx');
      
      const children = [
        new Paragraph({
          text: generatedContent.title,
          heading: HeadingLevel.TITLE,
          spacing: { after: 400, before: 200 },
          shading: {
            type: ShadingType.CLEAR,
            fill: "2563EB",
          },
          run: {
            color: "FFFFFF",
            bold: true,
            size: 36
          },
          alignment: AlignmentType.CENTER
        })
      ];

      if (generatedContent.description) {
        children.push(new Paragraph({
          text: generatedContent.description,
          spacing: { after: 600 },
          run: {
            size: 24,
            color: "475569",
            italics: true
          },
          alignment: AlignmentType.CENTER
        }));
      }

      generatedContent.sections.forEach(section => {
        children.push(new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          shading: {
            type: ShadingType.CLEAR,
            fill: "10B981",
          },
          run: {
            color: "FFFFFF",
            bold: true,
            size: 30
          }
        }));

        if (section.type === 'table' && section.tableData) {
          const tableRows = section.tableData.map((row, rowIdx) => 
            new TableRow({
              children: row.map(cell => 
                new TableCell({
                  children: [new Paragraph({ text: cell, bold: rowIdx === 0 })],
                  width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                  shading: { fill: rowIdx === 0 ? "F1F5F9" : (rowIdx % 2 === 0 ? "FFFFFF" : "F9FAFB") },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                  }
                })
              ),
              tableHeader: rowIdx === 0
            })
          );

          children.push(new DocxTable({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: {
              top: convertInchesToTwip(0.1),
              bottom: convertInchesToTwip(0.1),
              left: convertInchesToTwip(0.1),
              right: convertInchesToTwip(0.1),
            }
          }));
          children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        } else if (section.type === 'list' && section.listItems) {
          section.listItems.forEach(item => {
            children.push(new Paragraph({
              text: item,
              bullet: { level: 0 },
              spacing: { after: 120 },
              run: {
                size: 22,
                color: "1E293B"
              }
            }));
          });
        } else {
          children.push(new Paragraph({
            text: section.content || '',
            spacing: { after: 300 },
            run: {
              size: 22,
              color: "1E293B"
            }
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
          section.listItems.forEach(item => data.push(['•', item]));
        } else {
          data.push([section.content || '']);
        }
        
        data.push([]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Styling
      ws['A1'].s = {
        font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2563EB" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
      
      if (ws['A2']) {
        ws['A2'].s = {
          font: { italic: true, sz: 12, color: { rgb: "475569" } },
          alignment: { horizontal: "center", wrapText: true }
        };
      }

      // Section headings
      let currentRow = 3;
      generatedContent.sections.forEach(section => {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "10B981" } },
            alignment: { horizontal: "left", vertical: "center" }
          };
        }
        currentRow++;

        if (section.type === 'table' && section.tableData) {
          section.tableData.forEach((row, rowIdx) => {
            for (let col = 0; col < row.length; col++) {
              const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: col });
              if (ws[cellRef]) {
                ws[cellRef].s = {
                  font: { bold: rowIdx === 0 },
                  fill: { fgColor: { rgb: rowIdx === 0 ? "F1F5F9" : (rowIdx % 2 === 0 ? "FFFFFF" : "F9FAFB") } },
                  border: {
                    top: { style: "thin", color: { rgb: "CBD5E1" } },
                    bottom: { style: "thin", color: { rgb: "CBD5E1" } },
                    left: { style: "thin", color: { rgb: "CBD5E1" } },
                    right: { style: "thin", color: { rgb: "CBD5E1" } }
                  }
                };
              }
            }
            currentRow++;
          });
        } else if (section.type === 'list' && section.listItems) {
          section.listItems.forEach(() => {
            currentRow++;
          });
        } else {
          currentRow++;
        }
        currentRow++;
      });

      ws['!cols'] = [{ wch: 5 }, { wch: 80 }];
      ws['!rows'] = [];
      ws['!rows'][0] = { hpt: 30 };
      ws['!rows'][1] = { hpt: 25 };

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

      const colors = {
        primary: [37, 99, 235],
        secondary: [59, 130, 246],
        text: [15, 23, 42],
        lightText: [100, 116, 139],
        accent: [16, 185, 129]
      };

      const addText = (text, fontSize, bold = false, color = colors.text, indent = 0) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, maxWidth - indent);
        lines.forEach(line => {
          if (yPosition > pageHeight - 25) {
            pdf.addPage();
            yPosition = margin;
            // Page number
            pdf.setFontSize(9);
            pdf.setTextColor(...colors.lightText);
            pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 10);
            pdf.setTextColor(...colors.text);
          }
          pdf.text(line, margin + indent, yPosition);
          yPosition += fontSize * 0.45;
        });
      };

      // Cover with gradient
      pdf.setFillColor(...colors.primary);
      pdf.rect(0, 0, pageWidth, 70, 'F');
      pdf.setFillColor(...colors.secondary);
      pdf.rect(0, 60, pageWidth, 10, 'F');

      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(generatedContent.title, maxWidth);
      let titleY = 30;
      titleLines.forEach(line => {
        pdf.text(line, margin, titleY);
        titleY += 13;
      });

      // Description
      if (generatedContent.description) {
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(generatedContent.description, maxWidth);
        descLines.forEach(line => {
          pdf.text(line, margin, titleY);
          titleY += 7;
        });
      }

      yPosition = 85;

      // Sections
      generatedContent.sections.forEach(section => {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = margin;
        }

        // Section header with background
        pdf.setFillColor(...colors.accent);
        pdf.roundedRect(margin - 5, yPosition - 4, maxWidth + 10, 12, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');
        pdf.text(section.heading, margin, yPosition + 4);
        yPosition += 18;

        pdf.setTextColor(...colors.text);

        if (section.type === 'list' && section.listItems) {
          pdf.setFontSize(10);
          section.listItems.forEach(item => {
            pdf.setFillColor(...colors.accent);
            pdf.circle(margin + 2, yPosition - 1, 1, 'F');
            const itemLines = pdf.splitTextToSize(item, maxWidth - 8);
            itemLines.forEach(line => {
              pdf.text(line, margin + 6, yPosition);
              yPosition += 5;
            });
            yPosition += 1;
          });
        } else if (section.type === 'table' && section.tableData) {
          const cellHeight = 8;
          const colWidth = maxWidth / section.tableData[0].length;
          
          section.tableData.forEach((row, rowIdx) => {
            if (rowIdx === 0) {
              pdf.setFillColor(241, 245, 249);
              pdf.rect(margin, yPosition, maxWidth, cellHeight, 'F');
              pdf.setFont('helvetica', 'bold');
            } else {
              if (rowIdx % 2 === 0) {
                pdf.setFillColor(249, 250, 251);
                pdf.rect(margin, yPosition, maxWidth, cellHeight, 'F');
              }
              pdf.setFont('helvetica', 'normal');
            }
            
            pdf.setFontSize(9);
            row.forEach((cell, colIdx) => {
              pdf.text(cell, margin + (colIdx * colWidth) + 2, yPosition + 5);
            });
            yPosition += cellHeight;
          });
          yPosition += 3;
        } else {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          addText(section.content || '', 10, false, colors.text, 0);
        }
        
        yPosition += 10;
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.lightText);
      pdf.text(`Generated on ${new Date().toLocaleDateString('en-AU')}`, margin, pageHeight - 10);

      pdf.save(`${generatedContent.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const saveAsTemplate = async () => {
    if (!generatedContent) return;
    setIsSaving(true);

    try {
      await base44.entities.DocumentTemplate.create({
        title: generatedContent.title,
        description: generatedContent.description || '',
        category: 'other',
        content: generatedContent,
        tags: []
      });

      alert('✅ Template saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save template.');
    } finally {
      setIsSaving(false);
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
              <CardContent className="space-y-4">
                <Button
                  onClick={saveAsTemplate}
                  disabled={isSaving}
                  className="w-full h-12 bg-slate-700 hover:bg-slate-800"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save as Template
                    </>
                  )}
                </Button>
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