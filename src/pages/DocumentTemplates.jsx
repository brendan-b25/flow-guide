import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, FileText, Trash2, Edit, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Document, Packer, Paragraph, HeadingLevel, Table as DocxTable, TableRow, TableCell, WidthType } from 'docx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function DocumentTemplates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['document-templates'],
    queryFn: () => base44.entities.DocumentTemplate.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['document-templates'])
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DocumentTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['document-templates']);
      setEditingTemplate(null);
      setAiPrompt('');
    }
  });

  const handleAiEdit = async () => {
    if (!aiPrompt.trim() || !editingTemplate) return;

    setIsAiEditing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Modify this document template based on the request: "${aiPrompt}"

Current template:
${JSON.stringify(editingTemplate.content, null, 2)}

Generate an improved version with the same structure:
- title: Document title
- description: Brief description
- sections: Array with heading, content, type (text/table/list), tableData, listItems

Keep it professional and complete.`,
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

      updateMutation.mutate({
        id: editingTemplate.id,
        data: {
          title: result.title,
          description: result.description || '',
          content: result
        }
      });
    } catch (error) {
      console.error('AI edit error:', error);
      alert('Failed to edit template with AI.');
    } finally {
      setIsAiEditing(false);
    }
  };

  const exportTemplate = async (template, format) => {
    setExportingId(`${template.id}-${format}`);
    const content = template.content;

    try {
      if (format === 'docx') {
        const children = [
          new Paragraph({
            text: content.title,
            heading: HeadingLevel.TITLE,
            spacing: { after: 400 }
          })
        ];

        if (content.description) {
          children.push(new Paragraph({
            text: content.description,
            spacing: { after: 600 }
          }));
        }

        content.sections.forEach(section => {
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
        a.download = `${content.title.replace(/[^a-z0-9]/gi, '_')}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === 'xlsx') {
        const data = [
          [content.title],
          [content.description || ''],
          []
        ];

        content.sections.forEach(section => {
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
        
        XLSX.writeFile(wb, `${content.title.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
      } else if (format === 'pdf') {
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

        addText(content.title, 20, true);
        yPosition += 5;

        if (content.description) {
          addText(content.description, 11);
          yPosition += 8;
        }

        content.sections.forEach(section => {
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

        pdf.save(`${content.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export template.');
    } finally {
      setExportingId(null);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
            Document Templates
          </h1>
          <p className="text-base sm:text-lg text-slate-600">Saved templates ready to download</p>
        </div>

        {templates.length > 0 && (
          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-200"
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {searchQuery ? 'No templates found' : 'No saved templates'}
              </h3>
              <p className="text-slate-600 text-center">
                {searchQuery ? 'Try a different search' : 'Generate templates in Document Generator'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="group hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{template.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTemplate(template)}
                      className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="w-3 h-3 mr-2" />
                      AI Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm('Delete this template?')) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['docx', 'xlsx', 'pdf'].map(format => (
                      <Button
                        key={format}
                        size="sm"
                        variant="outline"
                        onClick={() => exportTemplate(template, format)}
                        disabled={exportingId === `${template.id}-${format}`}
                        className="text-xs"
                      >
                        {exportingId === `${template.id}-${format}` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          format.toUpperCase()
                        )}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* AI Edit Dialog */}
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>AI Edit Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium">Current: {editingTemplate?.title}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">What changes do you want?</Label>
                <Textarea
                  id="ai-prompt"
                  placeholder="e.g., Add a section for emergency contacts, make it more detailed, change the tone to be more formal..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <Button
                onClick={handleAiEdit}
                disabled={!aiPrompt.trim() || isAiEditing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isAiEditing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Editing...
                  </>
                ) : (
                  'Apply AI Changes'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}