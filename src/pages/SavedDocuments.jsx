import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Copy, Edit2, Trash2, Download, RefreshCw, Sparkles, Loader2, ArrowLeft, X, FileDown, Wand2, CheckCircle } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function SavedDocuments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, item: null, type: null });
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedForCombine, setSelectedForCombine] = useState([]);
  const [isCombining, setIsCombining] = useState(false);
  const [openedDocument, setOpenedDocument] = useState(null);
  const [documentType, setDocumentType] = useState(null);
  const [showEnhancements, setShowEnhancements] = useState(false);
  const [suggestedEnhancements, setSuggestedEnhancements] = useState([]);
  const [isGeneratingEnhancements, setIsGeneratingEnhancements] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: cheatSheets = [] } = useQuery({
    queryKey: ['cheat-sheets'],
    queryFn: () => base44.entities.CheatSheet.list('-created_date')
  });

  const { data: docTemplates = [] } = useQuery({
    queryKey: ['doc-templates'],
    queryFn: () => base44.entities.DocumentTemplate.list('-created_date')
  });

  const deleteCheatSheetMutation = useMutation({
    mutationFn: (id) => base44.entities.CheatSheet.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['cheat-sheets'])
  });

  const deleteDocTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['doc-templates'])
  });

  const copyCheatSheet = async (sheet) => {
    try {
      await base44.entities.CheatSheet.create({
        title: `${sheet.title} (Copy)`,
        category: sheet.category,
        products: sheet.products,
        content: sheet.content
      });
      queryClient.invalidateQueries(['cheat-sheets']);
      alert('✅ Cheat sheet copied!');
    } catch (error) {
      alert('Failed to copy cheat sheet');
    }
  };

  const copyDocTemplate = async (doc) => {
    try {
      await base44.entities.DocumentTemplate.create({
        title: `${doc.title} (Copy)`,
        description: doc.description,
        category: doc.category,
        content: doc.content,
        tags: doc.tags
      });
      queryClient.invalidateQueries(['doc-templates']);
      alert('✅ Document template copied!');
    } catch (error) {
      alert('Failed to copy document template');
    }
  };

  const openEditDialog = (item, type) => {
    setEditDialog({ open: true, item, type });
    setEditPrompt('');
  };

  const handleAIEdit = async () => {
    if (!editPrompt.trim() || !editDialog.item) return;

    setIsEditing(true);
    try {
      const isCheatSheet = editDialog.type === 'cheatsheet';
      const content = editDialog.item.content;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Edit this ${isCheatSheet ? 'cheat sheet' : 'document template'} based on the request: "${editPrompt}"

Current content:
${JSON.stringify(content, null, 2)}

Generate an improved version with the same structure. Keep it professional and practical. Use Australian English.`,
        response_json_schema: isCheatSheet ? {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  type: { type: "string" }
                }
              }
            }
          }
        } : {
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
                  type: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (isCheatSheet) {
        await base44.entities.CheatSheet.update(editDialog.item.id, {
          title: result.title,
          content: result
        });
        queryClient.invalidateQueries(['cheat-sheets']);
      } else {
        await base44.entities.DocumentTemplate.update(editDialog.item.id, {
          title: result.title,
          content: result
        });
        queryClient.invalidateQueries(['doc-templates']);
      }

      // Update opened document if it's the same one being edited
      if (openedDocument && openedDocument.id === editDialog.item.id) {
        setOpenedDocument({
          ...openedDocument,
          title: result.title,
          content: result
        });
      }

      setEditDialog({ open: false, item: null, type: null });
      alert('✅ Updated successfully!');
    } catch (error) {
      console.error('Edit error:', error);
      alert('Failed to edit. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const toggleSelection = (id) => {
    setSelectedForCombine(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openDocument = (doc, type) => {
    setOpenedDocument(doc);
    setDocumentType(type);
    setSuggestedEnhancements([]);
    setShowEnhancements(false);
  };

  const closeDocument = () => {
    setOpenedDocument(null);
    setDocumentType(null);
    setSuggestedEnhancements([]);
    setShowEnhancements(false);
  };

  const openEditForCurrentDoc = () => {
    if (openedDocument && documentType) {
      setEditDialog({ open: true, item: openedDocument, type: documentType });
      setEditPrompt('');
    }
  };

  const generateEnhancements = async () => {
    if (!openedDocument) return;

    setIsGeneratingEnhancements(true);
    try {
      const isCheatSheet = documentType === 'cheatsheet';
      const content = openedDocument.content;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this ${isCheatSheet ? 'cheat sheet' : 'document'} and suggest 3-5 specific improvements:

${JSON.stringify(content, null, 2)}

Generate practical, actionable enhancements. Each should be a clear, specific improvement. Use Australian English.`,
        response_json_schema: {
          type: "object",
          properties: {
            enhancements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestedEnhancements(result.enhancements || []);
      setShowEnhancements(true);
    } catch (error) {
      console.error('Enhancement generation error:', error);
      alert('Failed to generate enhancements. Please try again.');
    } finally {
      setIsGeneratingEnhancements(false);
    }
  };

  const applyEnhancement = async (enhancement) => {
    if (!openedDocument) return;

    setIsEditing(true);
    try {
      const isCheatSheet = documentType === 'cheatsheet';
      const content = openedDocument.content;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Apply this enhancement to the ${isCheatSheet ? 'cheat sheet' : 'document'}:

Enhancement: ${enhancement.title}
Details: ${enhancement.description}

Current content:
${JSON.stringify(content, null, 2)}

Generate an improved version with the same structure. Keep it professional and practical. Use Australian English.`,
        response_json_schema: isCheatSheet ? {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  type: { type: "string" }
                }
              }
            }
          }
        } : {
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
                  type: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (isCheatSheet) {
        await base44.entities.CheatSheet.update(openedDocument.id, {
          title: result.title,
          content: result
        });
        queryClient.invalidateQueries(['cheat-sheets']);
      } else {
        await base44.entities.DocumentTemplate.update(openedDocument.id, {
          title: result.title,
          content: result
        });
        queryClient.invalidateQueries(['doc-templates']);
      }

      setOpenedDocument({
        ...openedDocument,
        title: result.title,
        content: result
      });

      setSuggestedEnhancements([]);
      setShowEnhancements(false);
      alert('✅ Enhancement applied!');
    } catch (error) {
      console.error('Apply enhancement error:', error);
      alert('Failed to apply enhancement. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const exportOpenedDocToWord = async () => {
    const content = openedDocument.content;
    const isCheatSheet = documentType === 'cheatsheet';

    const children = [
      new Paragraph({
        text: content?.title || openedDocument.title,
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    if (content?.summary) {
      children.push(new Paragraph({ text: content.summary, spacing: { after: 200 } }));
    }
    if (content?.description) {
      children.push(new Paragraph({ text: content.description, spacing: { after: 200 } }));
    }

    if (isCheatSheet) {
      content?.sections?.forEach((section) => {
        children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }));
        section.items?.forEach((item) => {
          children.push(new Paragraph({ text: `• ${item}`, spacing: { after: 100 } }));
        });
      });
    } else {
      content?.sections?.forEach((section) => {
        children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }));
        children.push(new Paragraph({ text: section.content || '', spacing: { after: 100 } }));
      });
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content?.title || 'document'}.docx`;
    a.click();
  };

  const exportOpenedDocToExcel = () => {
    const content = openedDocument.content;
    const isCheatSheet = documentType === 'cheatsheet';
    const data = [[content?.title || openedDocument.title], ['']];

    if (content?.summary) data.push(['Summary:', content.summary], ['']);
    if (content?.description) data.push(['Description:', content.description], ['']);

    if (isCheatSheet) {
      content?.sections?.forEach((section) => {
        data.push([section.heading], ['']);
        section.items?.forEach((item) => data.push([item]));
        data.push(['']);
      });
    } else {
      content?.sections?.forEach((section) => {
        data.push([section.heading], ['']);
        data.push([section.content || '']);
        data.push(['']);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Document');
    XLSX.writeFile(wb, `${content?.title || 'document'}.xlsx`);
  };

  const exportOpenedDocToPDF = () => {
    const content = openedDocument.content;
    const isCheatSheet = documentType === 'cheatsheet';
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.text(content?.title || openedDocument.title, 20, y);
    y += 15;

    if (content?.summary) {
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(content.summary, 170);
      doc.text(lines, 20, y);
      y += lines.length * 5 + 10;
    }

    if (content?.description) {
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(content.description, 170);
      doc.text(lines, 20, y);
      y += lines.length * 5 + 10;
    }

    doc.setFontSize(12);
    if (isCheatSheet) {
      content?.sections?.forEach((section) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(14);
        doc.text(section.heading, 20, y);
        y += 10;
        doc.setFontSize(10);
        section.items?.forEach((item) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          const lines = doc.splitTextToSize(`• ${item}`, 170);
          doc.text(lines, 25, y);
          y += lines.length * 5 + 2;
        });
        y += 5;
      });
    } else {
      content?.sections?.forEach((section) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(14);
        doc.text(section.heading, 20, y);
        y += 10;
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(section.content || '', 170);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 10;
      });
    }

    doc.save(`${content?.title || 'document'}.pdf`);
  };

  const combineIntoUltimateGuide = async () => {
    if (selectedForCombine.length < 2) {
      alert('Please select at least 2 cheat sheets to combine');
      return;
    }

    setIsCombining(true);
    try {
      const selectedSheets = cheatSheets.filter(s => selectedForCombine.includes(s.id));
      const combinedContent = selectedSheets.map(s => JSON.stringify(s.content, null, 2)).join('\n\n---\n\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Combine these ${selectedSheets.length} cheat sheets into one ultimate comprehensive reference guide.

${combinedContent}

Create a professional, well-organized ultimate guide with:
- title: A comprehensive title that covers all topics (e.g., "Ultimate Pool Maintenance Guide")
- summary: Brief overview of what's covered
- sections: Organized sections that intelligently combine and enhance information from all sheets
  - Each section should have: heading, items (array of detailed points), and type (dosage/steps/tips/safety/troubleshooting/general)
  
Remove duplicates, organize logically by topic/workflow, add cross-references where relevant, and enhance with additional expert tips. Make it the definitive guide. Use Australian English.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  items: {
                    type: "array",
                    items: { type: "string" }
                  },
                  type: { type: "string", enum: ["dosage", "steps", "tips", "safety", "troubleshooting", "general"] }
                },
                required: ["heading", "items", "type"]
              }
            }
          },
          required: ["title", "summary", "sections"]
        }
      });

      const allProducts = selectedSheets.flatMap(s => s.products || []);
      await base44.entities.CheatSheet.create({
        title: result.title,
        category: 'general',
        products: allProducts,
        content: result
      });

      queryClient.invalidateQueries(['cheat-sheets']);
      setSelectedForCombine([]);
      alert('✅ Ultimate guide created successfully!');
    } catch (error) {
      console.error('Combine error:', error);
      alert('Failed to create ultimate guide. Please try again.');
    } finally {
      setIsCombining(false);
    }
  };

  const filteredCheatSheets = cheatSheets.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocTemplates = docTemplates.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCheatSheetCard = (sheet) => (
    <Card key={sheet.id} className={`group hover:shadow-lg transition-all ${selectedForCombine.includes(sheet.id) ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={selectedForCombine.includes(sheet.id)}
              onChange={() => toggleSelection(sheet.id)}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <button 
              onClick={() => openDocument(sheet, 'cheatsheet')}
              className="flex-1 min-w-0 text-left"
            >
              <CardTitle className="text-lg truncate hover:text-blue-600 transition-colors">{sheet.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">Cheat Sheet</Badge>
                {sheet.products && sheet.products.length > 0 && (
                  <span className="text-xs text-slate-500 truncate">
                    {sheet.products.length} product{sheet.products.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <FileText className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(createPageUrl('CheatSheetGenerator'))}>
                <Edit2 className="w-3 h-3 mr-2" />
                Open in Editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(sheet, 'cheatsheet')}>
                <RefreshCw className="w-3 h-3 mr-2" />
                AI Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyCheatSheet(sheet)}>
                <Copy className="w-3 h-3 mr-2" />
                Make a Copy
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (confirm('Delete this cheat sheet?')) {
                    deleteCheatSheetMutation.mutate(sheet.id);
                  }
                }}
                className="text-red-600"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {sheet.content?.summary && (
          <p className="text-sm text-slate-600 line-clamp-2">{sheet.content.summary}</p>
        )}
      </CardContent>
    </Card>
  );

  const renderDocTemplateCard = (doc) => (
    <Card key={doc.id} className="group hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <button 
            onClick={() => openDocument(doc, 'document')}
            className="flex-1 min-w-0 text-left"
          >
            <CardTitle className="text-lg truncate hover:text-blue-600 transition-colors">{doc.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">Document</Badge>
              {doc.category && doc.category !== 'other' && (
                <Badge variant="secondary" className="text-xs capitalize">{doc.category}</Badge>
              )}
            </div>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <FileText className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(createPageUrl('DocumentGenerator'))}>
                <Edit2 className="w-3 h-3 mr-2" />
                Open in Editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(doc, 'document')}>
                <RefreshCw className="w-3 h-3 mr-2" />
                AI Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyDocTemplate(doc)}>
                <Copy className="w-3 h-3 mr-2" />
                Make a Copy
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (confirm('Delete this template?')) {
                    deleteDocTemplateMutation.mutate(doc.id);
                  }
                }}
                className="text-red-600"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {doc.description && (
          <p className="text-sm text-slate-600 line-clamp-2">{doc.description}</p>
        )}
      </CardContent>
    </Card>
  );

  const totalItems = cheatSheets.length + docTemplates.length;

  const sectionIcons = {
    dosage: '💧',
    steps: '📋',
    tips: '💡',
    safety: '⚠️',
    troubleshooting: '🔧',
    general: '📌'
  };

  if (openedDocument) {
    const isCheatSheet = documentType === 'cheatsheet';
    const content = openedDocument.content;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={closeDocument}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </Button>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileDown className="w-4 h-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportOpenedDocToWord}>
                    <FileText className="w-3 h-3 mr-2" />
                    Export to Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportOpenedDocToExcel}>
                    <FileText className="w-3 h-3 mr-2" />
                    Export to Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportOpenedDocToPDF}>
                    <FileText className="w-3 h-3 mr-2" />
                    Export to PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={generateEnhancements}
                disabled={isGeneratingEnhancements}
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {isGeneratingEnhancements ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    AI Enhance
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={openEditForCurrentDoc}
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Edit2 className="w-4 h-4" />
                AI Edit
              </Button>
            </div>
          </div>

          {showEnhancements && suggestedEnhancements.length > 0 && (
            <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg text-blue-900">AI Suggested Enhancements</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEnhancements(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestedEnhancements.map((enhancement, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">{enhancement.title}</h4>
                      <p className="text-sm text-slate-600">{enhancement.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => applyEnhancement(enhancement)}
                      disabled={isEditing}
                      className="bg-blue-600 hover:bg-blue-700 shrink-0"
                    >
                      {isEditing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Apply
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-3xl">{content?.title || openedDocument.title}</CardTitle>
              {content?.summary && (
                <p className="text-slate-600 mt-2">{content.summary}</p>
              )}
              {content?.description && (
                <p className="text-slate-600 mt-2">{content.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {isCheatSheet ? (
                content?.sections?.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{sectionIcons[section.type]}</span>
                      <h3 className="text-xl font-semibold text-slate-900">{section.heading}</h3>
                    </div>
                    <ul className="space-y-2 ml-10">
                      {section.items?.map((item, itemIdx) => (
                        <li key={itemIdx} className="text-slate-700 flex items-start gap-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                content?.sections?.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-xl font-semibold text-slate-900">{section.heading}</h3>
                    {section.type === 'table' && section.tableData ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border border-slate-200 rounded-lg">
                          <tbody>
                            {section.tableData.map((row, rowIdx) => (
                              <tr key={rowIdx} className={rowIdx === 0 ? 'bg-slate-100 font-medium' : 'bg-white'}>
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="border border-slate-200 px-4 py-2">
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
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
            Saved Documents
          </h1>
          <p className="text-base sm:text-lg text-slate-600">
            All your cheat sheets and document templates in one place
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white border-slate-200"
            />
          </div>

          {selectedForCombine.length > 0 && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600">{selectedForCombine.length}</Badge>
                      <span className="text-sm font-medium text-slate-700">
                        cheat sheet{selectedForCombine.length > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedForCombine([])}
                      className="h-8"
                    >
                      Clear
                    </Button>
                  </div>
                  <Button
                    onClick={combineIntoUltimateGuide}
                    disabled={isCombining || selectedForCombine.length < 2}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCombining ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Ultimate Guide
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All ({totalItems})</TabsTrigger>
            <TabsTrigger value="cheatsheets">Cheat Sheets ({cheatSheets.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({docTemplates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {totalItems === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No saved documents yet</p>
                  <p className="text-sm text-slate-500 mt-2">Create cheat sheets or documents to see them here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCheatSheets.map(renderCheatSheetCard)}
                {filteredDocTemplates.map(renderDocTemplateCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cheatsheets">
            {filteredCheatSheets.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    {cheatSheets.length === 0 ? 'No cheat sheets saved' : 'No results found'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCheatSheets.map(renderCheatSheetCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents">
            {filteredDocTemplates.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    {docTemplates.length === 0 ? 'No document templates saved' : 'No results found'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocTemplates.map(renderDocTemplateCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, item: null, type: null })}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                AI Edit {editDialog.type === 'cheatsheet' ? 'Cheat Sheet' : 'Document'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {editDialog.item && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded p-3">
                  Editing: <span className="font-medium">{editDialog.item.title}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>What changes do you want?</Label>
                <Textarea
                  placeholder="e.g., Add more details, simplify language, reorganize sections..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <Button
                onClick={handleAIEdit}
                disabled={!editPrompt.trim() || isEditing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isEditing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Apply Changes
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}