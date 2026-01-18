import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Plus, X, Upload, Type, FileText, Save, Download, Edit2, Trash2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import jsPDF from 'jspdf';

export default function CheatSheetGenerator() {
  const [products, setProducts] = useState([{ name: '', info: '', file: null }]);
  const [inputMethod, setInputMethod] = useState('type'); // 'type' or 'upload'
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSheet, setGeneratedSheet] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [sheetTitle, setSheetTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: savedSheets = [] } = useQuery({
    queryKey: ['cheat-sheets'],
    queryFn: () => base44.entities.CheatSheet.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CheatSheet.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['cheat-sheets'])
  });

  const addProduct = () => {
    setProducts([...products, { name: '', info: '', file: null }]);
  };

  const removeProduct = (index) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const handleFileUpload = async (index, file) => {
    updateProduct(index, 'file', file);
  };

  const generateCheatSheet = async () => {
    const validProducts = products.filter(p => p.name.trim() && (p.info.trim() || p.file));
    if (validProducts.length === 0) {
      alert('Please add at least one product with information');
      return;
    }

    setIsGenerating(true);
    try {
      let productInfo = '';
      const fileUrls = [];

      for (const product of validProducts) {
        if (product.file) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: product.file });
          fileUrls.push(file_url);
          productInfo += `Product: ${product.name}\n[File uploaded]\n\n`;
        } else {
          productInfo += `Product: ${product.name}\nInformation: ${product.info}\n\n`;
        }
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a quick reference cheat sheet for the following product(s). Make it practical, easy to scan, and focused on the most important information.

${productInfo}

Generate a structured cheat sheet with:
- title: Catchy, descriptive title
- summary: One-sentence overview
- sections: Array of sections, each with:
  - heading: Section title
  - items: Array of key points/steps (keep concise)
  - type: "dosage", "steps", "tips", "safety", "troubleshooting", or "general"

For products with dosing information (pools, chemicals, etc.), create clear dosage tables/guidelines.
For multi-product sheets, organize by product or by task/use case.
Use Australian English. Focus on quick reference - make it scannable.`,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
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

      setGeneratedSheet(result);
      setSheetTitle(result.title);
      setEditMode(false);
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate cheat sheet. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCheatSheet = async () => {
    if (!generatedSheet) return;
    setIsSaving(true);

    try {
      await base44.entities.CheatSheet.create({
        title: sheetTitle,
        category: 'general',
        products: products.filter(p => p.name.trim()).map(p => ({ name: p.name, info: p.info })),
        content: editMode ? { ...generatedSheet, edited: editedContent } : generatedSheet
      });

      alert('✅ Cheat sheet saved!');
      queryClient.invalidateQueries(['cheat-sheets']);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save cheat sheet.');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToPDF = () => {
    if (!generatedSheet) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - (margin * 2);
    let y = margin;

    const addText = (text, fontSize, bold = false, color = [0, 0, 0]) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, maxWidth);
      lines.forEach(line => {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += fontSize * 0.4;
      });
    };

    // Title
    addText(generatedSheet.title, 18, true, [30, 64, 175]);
    y += 3;

    // Summary
    addText(generatedSheet.summary, 10, false, [71, 85, 105]);
    y += 8;

    // Sections
    generatedSheet.sections.forEach(section => {
      if (y > pageHeight - 50) {
        pdf.addPage();
        y = margin;
      }

      const sectionColors = {
        dosage: [59, 130, 246],
        steps: [16, 185, 129],
        tips: [245, 158, 11],
        safety: [239, 68, 68],
        troubleshooting: [139, 92, 246],
        general: [71, 85, 105]
      };

      addText(section.heading, 12, true, sectionColors[section.type] || [0, 0, 0]);
      y += 2;

      section.items.forEach(item => {
        addText(`• ${item}`, 9);
        y += 1;
      });

      y += 5;
    });

    pdf.save(`${generatedSheet.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const loadSavedSheet = (sheet) => {
    setGeneratedSheet(sheet.content);
    setSheetTitle(sheet.title);
    setProducts(sheet.products?.map(p => ({ ...p, file: null })) || [{ name: '', info: '', file: null }]);
    setEditMode(false);
  };

  const sectionIcons = {
    dosage: '💧',
    steps: '📋',
    tips: '💡',
    safety: '⚠️',
    troubleshooting: '🔧',
    general: '📌'
  };

  const filteredSheets = savedSheets.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
            Quick Reference Cheat Sheets
          </h1>
          <p className="text-base sm:text-lg text-slate-600">
            Create easy-to-scan guides for products, dosing, and instructions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Add Products
                </CardTitle>
                <CardDescription>Add one or more products to create a combined cheat sheet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Input Method Toggle */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                  <button
                    onClick={() => setInputMethod('type')}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                      inputMethod === 'type' ? 'bg-white shadow-sm text-blue-700 font-medium' : 'text-slate-600'
                    }`}
                  >
                    <Type className="w-4 h-4" />
                    Type
                  </button>
                  <button
                    onClick={() => setInputMethod('upload')}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                      inputMethod === 'upload' ? 'bg-white shadow-sm text-blue-700 font-medium' : 'text-slate-600'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>

                {/* Products */}
                {products.map((product, index) => (
                  <Card key={index} className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-slate-700">Product {index + 1}</Label>
                        {products.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(index)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Product name (e.g., Pool Chlorine Tablets)"
                        value={product.name}
                        onChange={(e) => updateProduct(index, 'name', e.target.value)}
                        className="bg-white"
                      />
                      {inputMethod === 'type' ? (
                        <Textarea
                          placeholder="Product information, dosing instructions, usage steps..."
                          value={product.info}
                          onChange={(e) => updateProduct(index, 'info', e.target.value)}
                          className="min-h-[100px] bg-white"
                        />
                      ) : (
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,image/*"
                            onChange={(e) => handleFileUpload(index, e.target.files[0])}
                            className="bg-white"
                          />
                          {product.file && (
                            <p className="text-sm text-slate-600">📎 {product.file.name}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={addProduct}
                  className="w-full border-dashed border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Product
                </Button>

                <Button
                  onClick={generateCheatSheet}
                  disabled={isGenerating}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Cheat Sheet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview/Edit Section */}
            {generatedSheet && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Input
                      value={sheetTitle}
                      onChange={(e) => setSheetTitle(e.target.value)}
                      className="text-xl font-bold border-0 px-0 focus-visible:ring-0"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditMode(!editMode);
                        if (!editMode) {
                          setEditedContent(JSON.stringify(generatedSheet, null, 2));
                        }
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {editMode ? 'Preview' : 'Edit JSON'}
                    </Button>
                  </div>
                  <CardDescription>{generatedSheet.summary}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {editMode ? (
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                  ) : (
                    generatedSheet.sections.map((section, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{sectionIcons[section.type]}</span>
                          <h3 className="text-lg font-semibold text-slate-900">{section.heading}</h3>
                        </div>
                        <ul className="space-y-1 ml-8">
                          {section.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="text-slate-700 flex items-start gap-2">
                              <span className="text-blue-600 font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={saveCheatSheet}
                      disabled={isSaving}
                      className="flex-1 bg-slate-700 hover:bg-slate-800"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                    <Button
                      onClick={exportToPDF}
                      variant="outline"
                      className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Saved Sheets Sidebar */}
          <div className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Saved Sheets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedSheets.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                )}

                {filteredSheets.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    {savedSheets.length === 0 ? 'No saved sheets yet' : 'No results'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredSheets.map(sheet => (
                      <Card key={sheet.id} className="group hover:shadow-md transition-all bg-white">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => loadSavedSheet(sheet)}
                              className="text-left flex-1 min-w-0"
                            >
                              <h4 className="font-medium text-slate-900 text-sm truncate">
                                {sheet.title}
                              </h4>
                              {sheet.products && sheet.products.length > 0 && (
                                <p className="text-xs text-slate-500 truncate">
                                  {sheet.products.map(p => p.name).join(', ')}
                                </p>
                              )}
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Delete this cheat sheet?')) {
                                  deleteMutation.mutate(sheet.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 h-auto p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Example */}
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-slate-50">
              <CardHeader>
                <CardTitle className="text-sm">Example</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p className="font-medium">Pool Chlorine Dosing:</p>
                <p>"For 50,000L pool: Add 2 tablets weekly. Test pH (7.2-7.6) and chlorine (1-3 ppm) twice weekly. Shock treatment: 5 tablets for cloudy water."</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}