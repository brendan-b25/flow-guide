import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Plus, X, Save, Download, Edit2, Trash2, Search, RefreshCw, Combine, MoreVertical, Ruler, Image as ImageIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';

export default function CheatSheetGenerator() {
  const [products, setProducts] = useState([{ name: '', info: '', file: null }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSheet, setGeneratedSheet] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [sheetTitle, setSheetTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiEnhancePrompt, setAiEnhancePrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [isCombining, setIsCombining] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingAI, setIsEditingAI] = useState(false);
  const [unitPreference, setUnitPreference] = useState('metric');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertToUnit, setConvertToUnit] = useState('metric');
  const [isConverting, setIsConverting] = useState(false);
  const [convertingSheet, setConvertingSheet] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renamingSheet, setRenamingSheet] = useState(null);
  const [newSheetName, setNewSheetName] = useState('');
  const [generatingImageFor, setGeneratingImageFor] = useState(null);
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
        productInfo += `Product: ${product.name}\n`;
        
        if (product.info.trim()) {
          productInfo += `Typed Information: ${product.info}\n`;
        }
        
        if (product.file) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: product.file });
          fileUrls.push(file_url);
          productInfo += `[Additional file uploaded for this product]\n`;
        }
        
        productInfo += '\n';
      }

      const unitInstructions = {
        metric: 'Use metric units (litres, millilitres, grams, kilograms, metres, centimetres). Round to convenient whole or half measurements.',
        imperial: 'Use imperial units (gallons, fluid ounces, pounds, ounces, feet, inches). Round to convenient whole or half measurements.',
        us: 'Use US customary units (gallons, fluid ounces, pounds, ounces, feet, inches). Round to convenient whole or half measurements.',
        kitchen: 'Use kitchen measurements (cups, tablespoons, teaspoons, millilitres, litres). Round to convenient whole, half, or quarter measurements (e.g., 1 cup, ½ cup, 2 tbsp, 1 tsp).',
        mixed: 'Use a practical mix of metric and kitchen measurements (litres, millilitres, cups, tablespoons, teaspoons, grams). Round to convenient whole or half measurements.'
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a quick reference cheat sheet for the following product(s). Make it practical, easy to scan, and focused on the most important information.

      ${productInfo}

      MEASUREMENT UNITS: ${unitInstructions[unitPreference]}
      Always convert and round measurements to convenient, easy-to-measure amounts. Prefer whole numbers or simple fractions (½, ¼, ¾).

      CRITICAL FORMATTING INSTRUCTIONS:

      1. TABLE FORMATTING - READ CAREFULLY:
      - ALWAYS use the 'table' object (with 'headers' and 'rows' arrays) for ANY tabular data
      - NEVER put table-like data in the 'items' array as plain text or markdown
      - Examples requiring tables: dosage charts, measurement schedules, chemical levels, comparison charts, rating scales
      - Table structure: { headers: ["Column 1", "Column 2", ...], rows: [["Cell 1", "Cell 2", ...], ["Cell 1", "Cell 2", ...]] }
      - First row in 'rows' should contain data, NOT headers (headers are separate)

      2. WHEN TO USE TABLES:
      - Dosage/chemical information (e.g., Pool Size vs Amount to Add)
      - Measurement ranges (e.g., pH levels, chlorine levels, temperatures)
      - Schedules or timelines (e.g., Daily, Weekly, Monthly tasks)
      - Comparison data (e.g., different products or scenarios)
      - Any data with 2+ columns of related information

      3. SECTION STRUCTURE:
      Generate a structured cheat sheet with:
      - title: Catchy, descriptive title
      - summary: One-sentence overview
      - sections: Array of sections, each with:
      - heading: Clear section title
      - items: Array of brief key points (ONLY if not table data)
      - type: "dosage", "steps", "tips", "safety", "troubleshooting", or "general"
      - table: { headers: [...], rows: [[...], [...]] } - USE THIS for all tabular data

      4. CONTENT QUALITY:
      - Be specific and actionable
      - Use precise measurements in the preferred units
      - Provide clear step-by-step instructions where applicable
      - Include safety warnings for hazardous materials
      - Make it scannable with clear headings and organized data

      For multi-product sheets, organize by product or by task/use case.
      Use Australian English throughout. Focus on quick reference - make it scannable, accurate, and professionally formatted.`,
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
                  type: { type: "string", enum: ["dosage", "steps", "tips", "safety", "troubleshooting", "general"] },
                  image_url: { type: "string" },
                  table: {
                    type: "object",
                    properties: {
                      headers: { type: "array", items: { type: "string" } },
                      rows: { type: "array", items: { type: "array", items: { type: "string" } } }
                    }
                  }
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
      
      // Clear the generator for a new cheat sheet
      setGeneratedSheet(null);
      setSheetTitle('');
      setProducts([{ name: '', info: '', file: null }]);
      setEditMode(false);
      setEditedContent('');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save cheat sheet.');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToPDF = async () => {
    if (!generatedSheet) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - (margin * 2);
    let y = margin;

    // Enhanced color palette
    const colors = {
      primary: [37, 99, 235],
      text: [15, 23, 42],
      lightText: [100, 116, 139],
      dosage: [59, 130, 246],
      steps: [16, 185, 129],
      tips: [245, 158, 11],
      safety: [239, 68, 68],
      troubleshooting: [139, 92, 246],
      general: [71, 85, 105]
    };

    const addText = (text, fontSize, bold = false, color = colors.text, indent = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, maxWidth - indent);
      lines.forEach(line => {
        if (y > pageHeight - 25) {
          pdf.addPage();
          y = margin;
          // Add page number
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.lightText);
          pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 10);
          pdf.setTextColor(...colors.text);
        }
        pdf.text(line, margin + indent, y);
        y += fontSize * 0.45;
      });
    };

    const addImage = async (imageUrl, maxHeight = 80) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });
        
        const aspectRatio = img.width / img.height;
        let imgWidth = maxWidth - 20;
        let imgHeight = imgWidth / aspectRatio;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        
        if (y + imgHeight > pageHeight - 25) {
          pdf.addPage();
          y = margin;
        }
        
        pdf.addImage(img, 'JPEG', margin + 10, y, imgWidth, imgHeight);
        y += imgHeight + 8;
      } catch (error) {
        console.error('Failed to add image:', error);
      }
    };

    // Cover with gradient effect (simulated with rectangles)
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, pageWidth, 70, 'F');
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 60, pageWidth, 10, 'F');
    
    // Title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(generatedSheet.title, maxWidth);
    let titleY = 30;
    titleLines.forEach(line => {
      pdf.text(line, margin, titleY);
      titleY += 12;
    });

    // Summary
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const summaryLines = pdf.splitTextToSize(generatedSheet.summary, maxWidth);
    summaryLines.forEach(line => {
      pdf.text(line, margin, titleY);
      titleY += 6;
    });

    y = 85;

    // Sections
    for (const section of generatedSheet.sections) {
      if (y > pageHeight - 60) {
        pdf.addPage();
        y = margin;
      }

      const sectionColor = colors[section.type] || colors.general;

      // Section header with background
      pdf.setFillColor(...sectionColor);
      pdf.roundedRect(margin - 5, y - 4, maxWidth + 10, 12, 2, 2, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(section.heading, margin, y + 4);
      y += 16;

      pdf.setTextColor(...colors.text);

      // Image if present
      if (section.image_url) {
        await addImage(section.image_url);
      }

      // Table if present
      if (section.table && section.table.headers && section.table.rows) {
        // Table header
        pdf.setFillColor(241, 245, 249);
        const cellHeight = 8;
        const colWidth = maxWidth / section.table.headers.length;
        
        pdf.rect(margin, y, maxWidth, cellHeight, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        section.table.headers.forEach((header, idx) => {
          pdf.text(header, margin + (idx * colWidth) + 2, y + 5);
        });
        y += cellHeight;

        // Table rows
        pdf.setFont('helvetica', 'normal');
        section.table.rows.forEach((row, rowIdx) => {
          if (rowIdx % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, y, maxWidth, cellHeight, 'F');
          }
          row.forEach((cell, idx) => {
            pdf.text(cell, margin + (idx * colWidth) + 2, y + 5);
          });
          y += cellHeight;
        });
        y += 5;
      }

      // Items
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      section.items.forEach(item => {
        // Bullet point
        pdf.setFillColor(...sectionColor);
        pdf.circle(margin + 2, y - 1, 1, 'F');
        
        const itemLines = pdf.splitTextToSize(item, maxWidth - 8);
        itemLines.forEach((line, idx) => {
          pdf.text(line, margin + 6, y);
          y += 5;
        });
        y += 1;
      });

      y += 8;
    }

    // Footer on last page
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.lightText);
    pdf.text(`Generated on ${new Date().toLocaleDateString('en-AU')}`, margin, pageHeight - 10);

    pdf.save(`${generatedSheet.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const loadSavedSheet = (sheet) => {
    setGeneratedSheet(sheet.content);
    setSheetTitle(sheet.title);
    setProducts(sheet.products?.map(p => ({ ...p, file: null })) || [{ name: '', info: '', file: null }]);
    setEditMode(false);
    setSelectedSheets([]);
  };

  const openEditDialog = (sheet) => {
    setEditingSheet(sheet);
    setEditPrompt('');
    setShowEditDialog(true);
  };

  const handleAIEditSheet = async () => {
    if (!editPrompt.trim() || !editingSheet) return;

    setIsEditingAI(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Edit this cheat sheet based on the request: "${editPrompt}"

      Current cheat sheet:
      ${JSON.stringify(editingSheet.content, null, 2)}

      CRITICAL FORMATTING INSTRUCTIONS:
      - ALWAYS use the 'table' object (with 'headers' and 'rows' arrays) for tabular data
      - NEVER convert tables to plain text or markdown in 'items'
      - Maintain or add table formatting for dosage charts, measurements, schedules, comparisons
      - Use 'items' array only for bullet points and key points that are NOT tabular

      Generate an improved version with the same structure:
      - title: Catchy, clear title
      - summary: One-sentence overview
      - sections: Array with:
      - heading: Section title
      - items: Array of strings (for bullet points, NOT tables)
      - type: "dosage", "steps", "tips", "safety", "troubleshooting", or "general"
      - table: { headers: [...], rows: [[...], [...]] } - for all tabular data
      - image_url: Keep existing if present

      Keep it scannable, practical, and professionally formatted. Use Australian English.`,
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
                  type: { type: "string", enum: ["dosage", "steps", "tips", "safety", "troubleshooting", "general"] },
                  image_url: { type: "string" },
                  table: {
                    type: "object",
                    properties: {
                      headers: { type: "array", items: { type: "string" } },
                      rows: { type: "array", items: { type: "array", items: { type: "string" } } }
                    }
                  }
                },
                required: ["heading", "items", "type"]
              }
            }
          },
          required: ["title", "summary", "sections"]
        }
      });

      await base44.entities.CheatSheet.update(editingSheet.id, {
        title: result.title,
        content: result
      });

      queryClient.invalidateQueries(['cheat-sheets']);
      setShowEditDialog(false);
      setEditingSheet(null);
      alert('✅ Cheat sheet updated!');
    } catch (error) {
      console.error('Edit error:', error);
      alert('Failed to edit cheat sheet.');
    } finally {
      setIsEditingAI(false);
    }
  };

  const exportSheetToWord = async (sheet) => {
    const content = sheet.content;
    const sections = [];

    // Import additional docx components for styling
    const { Table: DocxTable, TableRow, TableCell, WidthType, BorderStyle, AlignmentType: DocxAlignment, ShadingType, convertInchesToTwip, ImageRun } = await import('docx');

    // Title with custom styling
    sections.push(
      new Paragraph({
        text: content.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300, before: 200 },
        shading: {
          type: ShadingType.CLEAR,
          fill: "2563EB",
        },
        run: {
          color: "FFFFFF",
          bold: true,
          size: 32
        }
      }),
      new Paragraph({
        text: content.summary,
        italics: true,
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        run: {
          size: 24,
          color: "475569"
        }
      })
    );

    // Section colors
    const sectionColors = {
      dosage: "3B82F6",
      steps: "10B981",
      tips: "F59E0B",
      safety: "EF4444",
      troubleshooting: "8B5CF6",
      general: "64748B"
    };

    for (const section of content.sections) {
      const sectionColor = sectionColors[section.type] || sectionColors.general;
      
      // Section heading with background
      sections.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
          shading: {
            type: ShadingType.CLEAR,
            fill: sectionColor,
          },
          run: {
            color: "FFFFFF",
            bold: true,
            size: 28
          }
        })
      );

      // Image if present
      if (section.image_url) {
        try {
          const imageData = await fetch(section.image_url).then(r => r.arrayBuffer());
          sections.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageData,
                  transformation: {
                    width: 400,
                    height: 300,
                  },
                })
              ],
              spacing: { after: 200 }
            })
          );
        } catch (error) {
          console.error('Failed to embed image:', error);
        }
      }

      // Table if present
      if (section.table && section.table.headers && section.table.rows) {
        const tableRows = [
          new TableRow({
            children: section.table.headers.map(header =>
              new TableCell({
                children: [new Paragraph({ text: header, bold: true })],
                shading: { fill: "F1F5F9" },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                }
              })
            ),
            tableHeader: true
          }),
          ...section.table.rows.map((row, idx) =>
            new TableRow({
              children: row.map(cell =>
                new TableCell({
                  children: [new Paragraph(cell)],
                  shading: { fill: idx % 2 === 0 ? "FFFFFF" : "F9FAFB" },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                  }
                })
              )
            })
          )
        ];

        sections.push(
          new DocxTable({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: {
              top: convertInchesToTwip(0.1),
              bottom: convertInchesToTwip(0.1),
              left: convertInchesToTwip(0.1),
              right: convertInchesToTwip(0.1),
            }
          })
        );
        sections.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      }

      // Items with custom bullets
      section.items.forEach(item => {
        sections.push(
          new Paragraph({
            text: item,
            bullet: { level: 0 },
            spacing: { after: 120 },
            run: {
              size: 22,
              color: "1E293B"
            }
          })
        );
      });

      sections.push(new Paragraph({ text: "", spacing: { after: 200 } }));
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: sections
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.title.replace(/[^a-z0-9]/gi, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const exportSheetToExcel = (sheet) => {
    const content = sheet.content;
    const data = [];

    data.push([content.title]);
    data.push([content.summary]);
    data.push([]);

    content.sections.forEach(section => {
      data.push([section.heading]);
      
      if (section.table && section.table.headers && section.table.rows) {
        data.push(section.table.headers);
        section.table.rows.forEach(row => {
          data.push(row);
        });
        data.push([]);
      }
      
      section.items.forEach(item => {
        data.push(['•', item]);
      });
      data.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Styling
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Title styling (row 0)
    ws['A1'].s = {
      font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
    
    // Summary styling (row 1)
    if (ws['A2']) {
      ws['A2'].s = {
        font: { italic: true, sz: 12, color: { rgb: "475569" } },
        alignment: { horizontal: "center", wrapText: true }
      };
    }

    // Section headings and content
    const sectionColors = {
      dosage: "3B82F6",
      steps: "10B981",
      tips: "F59E0B",
      safety: "EF4444",
      troubleshooting: "8B5CF6",
      general: "64748B"
    };

    let currentRow = 3;
    content.sections.forEach(section => {
      const sectionColor = sectionColors[section.type] || sectionColors.general;
      const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
      
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: sectionColor } },
          alignment: { horizontal: "left", vertical: "center" }
        };
      }
      currentRow++;

      // Table styling
      if (section.table && section.table.headers && section.table.rows) {
        // Header row
        for (let col = 0; col < section.table.headers.length; col++) {
          const headerRef = XLSX.utils.encode_cell({ r: currentRow, c: col });
          if (ws[headerRef]) {
            ws[headerRef].s = {
              font: { bold: true, sz: 11 },
              fill: { fgColor: { rgb: "F1F5F9" } },
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

        // Data rows
        section.table.rows.forEach((row, rowIdx) => {
          for (let col = 0; col < row.length; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: col });
            if (ws[cellRef]) {
              ws[cellRef].s = {
                fill: { fgColor: { rgb: rowIdx % 2 === 0 ? "FFFFFF" : "F9FAFB" } },
                border: {
                  top: { style: "thin", color: { rgb: "E2E8F0" } },
                  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                  left: { style: "thin", color: { rgb: "E2E8F0" } },
                  right: { style: "thin", color: { rgb: "E2E8F0" } }
                }
              };
            }
          }
          currentRow++;
        });
        currentRow++;
      }

      // Items
      section.items.forEach(item => {
        currentRow++;
      });
      currentRow++;
    });

    // Column widths
    ws['!cols'] = [
      { wch: 5 },  // Bullet column
      { wch: 80 }  // Content column
    ];

    // Row heights
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 30 };  // Title row
    ws['!rows'][1] = { hpt: 25 };  // Summary row

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cheat Sheet');
    XLSX.writeFile(wb, `${content.title.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
  };

  const exportSheetToPDF = async (sheet) => {
    const content = sheet.content;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - (margin * 2);
    let y = margin;

    const colors = {
      primary: [37, 99, 235],
      text: [15, 23, 42],
      lightText: [100, 116, 139],
      dosage: [59, 130, 246],
      steps: [16, 185, 129],
      tips: [245, 158, 11],
      safety: [239, 68, 68],
      troubleshooting: [139, 92, 246],
      general: [71, 85, 105]
    };

    const addText = (text, fontSize, bold = false, color = colors.text, indent = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, maxWidth - indent);
      lines.forEach(line => {
        if (y > pageHeight - 25) {
          pdf.addPage();
          y = margin;
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.lightText);
          pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 10);
          pdf.setTextColor(...colors.text);
        }
        pdf.text(line, margin + indent, y);
        y += fontSize * 0.45;
      });
    };

    const addImage = async (imageUrl, maxHeight = 80) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });
        
        const aspectRatio = img.width / img.height;
        let imgWidth = maxWidth - 20;
        let imgHeight = imgWidth / aspectRatio;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        
        if (y + imgHeight > pageHeight - 25) {
          pdf.addPage();
          y = margin;
        }
        
        pdf.addImage(img, 'JPEG', margin + 10, y, imgWidth, imgHeight);
        y += imgHeight + 8;
      } catch (error) {
        console.error('Failed to add image:', error);
      }
    };

    // Cover
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, pageWidth, 70, 'F');
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 60, pageWidth, 10, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(content.title, maxWidth);
    let titleY = 30;
    titleLines.forEach(line => {
      pdf.text(line, margin, titleY);
      titleY += 12;
    });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const summaryLines = pdf.splitTextToSize(content.summary, maxWidth);
    summaryLines.forEach(line => {
      pdf.text(line, margin, titleY);
      titleY += 6;
    });

    y = 85;

    for (const section of content.sections) {
      if (y > pageHeight - 60) {
        pdf.addPage();
        y = margin;
      }

      const sectionColor = colors[section.type] || colors.general;

      pdf.setFillColor(...sectionColor);
      pdf.roundedRect(margin - 5, y - 4, maxWidth + 10, 12, 2, 2, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(section.heading, margin, y + 4);
      y += 16;

      pdf.setTextColor(...colors.text);

      if (section.image_url) {
        await addImage(section.image_url);
      }

      if (section.table && section.table.headers && section.table.rows) {
        pdf.setFillColor(241, 245, 249);
        const cellHeight = 8;
        const colWidth = maxWidth / section.table.headers.length;
        
        pdf.rect(margin, y, maxWidth, cellHeight, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        section.table.headers.forEach((header, idx) => {
          pdf.text(header, margin + (idx * colWidth) + 2, y + 5);
        });
        y += cellHeight;

        pdf.setFont('helvetica', 'normal');
        section.table.rows.forEach((row, rowIdx) => {
          if (rowIdx % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, y, maxWidth, cellHeight, 'F');
          }
          row.forEach((cell, idx) => {
            pdf.text(cell, margin + (idx * colWidth) + 2, y + 5);
          });
          y += cellHeight;
        });
        y += 5;
      }

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      section.items.forEach(item => {
        pdf.setFillColor(...sectionColor);
        pdf.circle(margin + 2, y - 1, 1, 'F');
        
        const itemLines = pdf.splitTextToSize(item, maxWidth - 8);
        itemLines.forEach((line, idx) => {
          pdf.text(line, margin + 6, y);
          y += 5;
        });
        y += 1;
      });

      y += 8;
    }

    pdf.setFontSize(8);
    pdf.setTextColor(...colors.lightText);
    pdf.text(`Generated on ${new Date().toLocaleDateString('en-AU')}`, margin, pageHeight - 10);

    pdf.save(`${content.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const exportSheetToJSON = (sheet) => {
    const content = sheet.content;
    const dataStr = JSON.stringify(content, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleConvertUnits = async (sheet = null) => {
    const targetSheet = sheet || generatedSheet;
    if (!targetSheet) return;

    setIsConverting(true);
    try {
      const unitInstructions = {
        metric: 'Convert all measurements to metric units (litres, millilitres, grams, kilograms, metres, centimetres). Round to convenient whole or half measurements.',
        imperial: 'Convert all measurements to imperial units (gallons, fluid ounces, pounds, ounces, feet, inches). Round to convenient whole or half measurements.',
        us: 'Convert all measurements to US customary units (gallons, fluid ounces, pounds, ounces, feet, inches). Round to convenient whole or half measurements.',
        kitchen: 'Convert all measurements to kitchen measurements (cups, tablespoons, teaspoons, millilitres, litres). Round to convenient whole, half, or quarter measurements (e.g., 1 cup, ½ cup, 2 tbsp, 1 tsp).',
        mixed: 'Convert all measurements to a practical mix of metric and kitchen measurements (litres, millilitres, cups, tablespoons, teaspoons, grams). Round to convenient whole or half measurements.'
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Convert all measurements in this cheat sheet to the specified units:

      Current cheat sheet:
      ${JSON.stringify(targetSheet, null, 2)}

      ${unitInstructions[convertToUnit]}

      CRITICAL INSTRUCTIONS:
      - Only change the measurements - keep all other content, structure, and formatting EXACTLY the same
      - Maintain ALL existing tables with their 'headers' and 'rows' structure
      - NEVER convert tables to plain text or markdown
      - Convert numbers and units in both 'items' arrays AND 'table' data
      - Keep all 'image_url' fields unchanged

      Return the cheat sheet with the same structure:
      - title: Keep the same
      - summary: Keep the same (update only if it contains measurements)
      - sections: Same sections with converted measurements, maintaining table structures`,
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
                  type: { type: "string", enum: ["dosage", "steps", "tips", "safety", "troubleshooting", "general"] },
                  image_url: { type: "string" },
                  table: {
                    type: "object",
                    properties: {
                      headers: { type: "array", items: { type: "string" } },
                      rows: { type: "array", items: { type: "array", items: { type: "string" } } }
                    }
                  }
                },
                required: ["heading", "items", "type"]
              }
            }
          },
          required: ["title", "summary", "sections"]
        }
      });

      if (sheet) {
        // Converting a saved sheet
        await base44.entities.CheatSheet.update(sheet.id, {
          content: result
        });
        queryClient.invalidateQueries(['cheat-sheets']);
        
        // Load the converted sheet into view
        setGeneratedSheet(result);
        setSheetTitle(result.title);
        setProducts(sheet.products?.map(p => ({ ...p, file: null })) || [{ name: '', info: '', file: null }]);
        setEditMode(false);
        
        alert('✅ Measurements converted!');
      } else {
        // Converting the current generated sheet
        setGeneratedSheet(result);
        setSheetTitle(result.title);
      }

      setShowConvertDialog(false);
      setConvertingSheet(null);
    } catch (error) {
      console.error('Conversion error:', error);
      alert('Failed to convert measurements.');
    } finally {
      setIsConverting(false);
    }
  };

  const openConvertDialog = (sheet = null) => {
    setConvertingSheet(sheet);
    setConvertToUnit('metric');
    setShowConvertDialog(true);
  };

  const openRenameDialog = (sheet) => {
    setRenamingSheet(sheet);
    setNewSheetName(sheet.title);
    setShowRenameDialog(true);
  };

  const handleRenameSheet = async () => {
    if (!newSheetName.trim() || !renamingSheet) return;

    try {
      await base44.entities.CheatSheet.update(renamingSheet.id, {
        title: newSheetName.trim()
      });
      queryClient.invalidateQueries(['cheat-sheets']);
      setShowRenameDialog(false);
      setRenamingSheet(null);
      setNewSheetName('');
    } catch (error) {
      console.error('Rename error:', error);
      alert('Failed to rename cheat sheet.');
    }
  };

  const generateIllustration = async (sectionIndex) => {
    const section = generatedSheet.sections[sectionIndex];
    setGeneratingImageFor(sectionIndex);

    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Create a clear, professional illustration for a cheat sheet section titled "${section.heading}". 
        
Section content: ${section.items.join('. ')}

Style: Clean, simple diagram or infographic that visually explains the concept. Use clear colors and labels. Make it educational and easy to understand at a glance.`
      });

      const updatedSections = [...generatedSheet.sections];
      updatedSections[sectionIndex] = { ...section, image_url: url };
      
      setGeneratedSheet({ ...generatedSheet, sections: updatedSections });
    } catch (error) {
      console.error('Image generation error:', error);
      alert('Failed to generate illustration.');
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleAiEnhance = async () => {
    if (!aiEnhancePrompt.trim() || !generatedSheet) return;

    setIsEnhancing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Enhance this cheat sheet based on the request: "${aiEnhancePrompt}"

      Current cheat sheet:
      ${JSON.stringify(generatedSheet, null, 2)}

      CRITICAL FORMATTING INSTRUCTIONS:
      - ALWAYS use the 'table' object (with 'headers' and 'rows' arrays) for any tabular data
      - NEVER convert tables to plain text or markdown
      - Add table formatting for any data that would benefit from columns/rows
      - Maintain existing tables and their proper structure

      Generate an improved version with the same structure:
      - title: Catchy, descriptive title
      - summary: One-sentence overview
      - sections: Array with:
      - heading: Section title
      - items: Array of strings (bullet points, NOT tables)
      - type: "dosage", "steps", "tips", "safety", "troubleshooting", or "general"
      - table: { headers: [...], rows: [[...], [...]] } - USE for all tabular data
      - image_url: Keep existing if present

      Keep it scannable, practical, and professionally formatted. Use Australian English.`,
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
                  type: { type: "string", enum: ["dosage", "steps", "tips", "safety", "troubleshooting", "general"] },
                  image_url: { type: "string" },
                  table: {
                    type: "object",
                    properties: {
                      headers: { type: "array", items: { type: "string" } },
                      rows: { type: "array", items: { type: "array", items: { type: "string" } } }
                    }
                  }
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
      setShowEnhanceDialog(false);
      setAiEnhancePrompt('');
    } catch (error) {
      console.error('Enhancement error:', error);
      alert('Failed to enhance cheat sheet.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const toggleSheetSelection = (sheetId) => {
    setSelectedSheets(prev =>
      prev.includes(sheetId) ? prev.filter(id => id !== sheetId) : [...prev, sheetId]
    );
  };

  const combineSelectedSheets = async () => {
    if (selectedSheets.length < 2) {
      alert('Select at least 2 sheets to combine');
      return;
    }

    setIsCombining(true);
    try {
      const sheetsToMerge = savedSheets.filter(s => selectedSheets.includes(s.id));
      const combinedContent = sheetsToMerge.map(s => JSON.stringify(s.content, null, 2)).join('\n\n---\n\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Combine these ${sheetsToMerge.length} cheat sheets into one unified, well-organized reference guide:

      ${combinedContent}

      CRITICAL FORMATTING INSTRUCTIONS:
      - Maintain ALL table structures from the source sheets using 'table' object with 'headers' and 'rows'
      - NEVER convert tables to plain text or markdown
      - Combine similar tables into comprehensive ones where appropriate
      - Use tables for any comparison data, dosage info, measurements, or schedules

      Create a single comprehensive cheat sheet with:
      - title: Descriptive title covering all products/topics
      - summary: Brief overview of what's included
      - sections: Organized sections that combine related information from all sheets
      - Use 'table' format for any tabular data
      - Use 'items' arrays only for bullet points
      - Keep 'image_url' fields where relevant

      Remove duplicates, organize logically, maintain professional formatting, and make it scannable. Use Australian English.`,
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
                  type: { type: "string", enum: ["dosage", "steps", "tips", "safety", "troubleshooting", "general"] },
                  image_url: { type: "string" },
                  table: {
                    type: "object",
                    properties: {
                      headers: { type: "array", items: { type: "string" } },
                      rows: { type: "array", items: { type: "array", items: { type: "string" } } }
                    }
                  }
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
      setProducts([{ name: 'Combined', info: 'Merged from multiple sheets', file: null }]);
      setSelectedSheets([]);
      setEditMode(false);
    } catch (error) {
      console.error('Combine error:', error);
      alert('Failed to combine sheets.');
    } finally {
      setIsCombining(false);
    }
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
                {/* Unit Preference */}
                <div className="space-y-2 pb-4 border-b border-slate-200">
                  <Label className="flex items-center gap-2 text-slate-700">
                    <Ruler className="w-4 h-4" />
                    Measurement Units
                  </Label>
                  <Select value={unitPreference} onValueChange={setUnitPreference}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (L, mL, g, kg, m, cm)</SelectItem>
                      <SelectItem value="imperial">Imperial (gal, fl oz, lb, oz, ft, in)</SelectItem>
                      <SelectItem value="us">US Customary (gal, fl oz, lb, oz, ft, in)</SelectItem>
                      <SelectItem value="kitchen">Kitchen (cups, tbsp, tsp, mL, L)</SelectItem>
                      <SelectItem value="mixed">Mixed (Metric + Kitchen)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">AI will convert measurements to convenient whole or half amounts</p>
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
                      <Textarea
                        placeholder="Type product information, dosing instructions, usage steps..."
                        value={product.info}
                        onChange={(e) => updateProduct(index, 'info', e.target.value)}
                        className="min-h-[100px] bg-white"
                      />
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-600">Or upload product guide/manual (optional)</Label>
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(index, e.target.files[0])}
                          className="bg-white"
                        />
                        {product.file && (
                          <p className="text-sm text-slate-600">📎 {product.file.name}</p>
                        )}
                      </div>
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
                      <div key={idx} className="space-y-3 border-b border-slate-200 pb-4 last:border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{sectionIcons[section.type]}</span>
                            <h3 className="text-lg font-semibold text-slate-900">{section.heading}</h3>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateIllustration(idx)}
                            disabled={generatingImageFor === idx}
                            className="text-xs h-8"
                          >
                            {generatingImageFor === idx ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <ImageIcon className="w-3 h-3 mr-1" />
                            )}
                            {section.image_url ? 'Regenerate' : 'Add'} Illustration
                          </Button>
                        </div>
                        
                        {section.image_url && (
                          <div className="ml-8">
                            <img 
                              src={section.image_url} 
                              alt={section.heading}
                              className="rounded-lg border border-slate-200 max-w-md w-full"
                            />
                          </div>
                        )}
                        
                        {section.table && (
                          <div className="ml-8 overflow-x-auto">
                            <table className="min-w-full border border-slate-300 rounded-lg overflow-hidden">
                              <thead className="bg-slate-100">
                                <tr>
                                  {section.table.headers.map((header, hIdx) => (
                                    <th key={hIdx} className="px-4 py-2 text-left text-sm font-semibold text-slate-700 border-b border-slate-300">
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {section.table.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="border-b border-slate-200 last:border-0">
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="px-4 py-2 text-sm text-slate-700">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
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

                  <div className="flex flex-col gap-3 pt-4 border-t">
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setShowEnhanceDialog(true)}
                        variant="outline"
                        className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        AI Enhance
                      </Button>
                      <Button
                        onClick={() => openConvertDialog()}
                        variant="outline"
                        className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Ruler className="w-4 h-4 mr-2" />
                        Convert Units
                      </Button>
                    </div>
                    <div className="flex gap-3">
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
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Saved Sheets Sidebar */}
          <div className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Saved Sheets</CardTitle>
                  {selectedSheets.length > 0 && (
                    <Button
                      size="sm"
                      onClick={combineSelectedSheets}
                      disabled={isCombining || selectedSheets.length < 2}
                      className="bg-purple-600 hover:bg-purple-700 h-8"
                    >
                      {isCombining ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Combine className="w-3 h-3 mr-1" />
                          Combine ({selectedSheets.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
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
                      <Card 
                        key={sheet.id} 
                        className={`group hover:shadow-md transition-all ${
                          selectedSheets.includes(sheet.id) 
                            ? 'bg-blue-50 border-2 border-blue-400' 
                            : 'bg-white'
                        }`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedSheets.includes(sheet.id)}
                              onChange={() => toggleSheetSelection(sheet.id)}
                              className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-auto p-1"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openRenameDialog(sheet)}>
                                  <Edit2 className="w-3 h-3 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(sheet)}>
                                  <RefreshCw className="w-3 h-3 mr-2" />
                                  AI Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openConvertDialog(sheet)}>
                                  <Ruler className="w-3 h-3 mr-2" />
                                  Convert Units
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportSheetToPDF(sheet)}>
                                  <Download className="w-3 h-3 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportSheetToWord(sheet)}>
                                  <Download className="w-3 h-3 mr-2" />
                                  Download Word
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportSheetToExcel(sheet)}>
                                  <Download className="w-3 h-3 mr-2" />
                                  Download Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportSheetToJSON(sheet)}>
                                  <Download className="w-3 h-3 mr-2" />
                                  Download JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (confirm('Delete this cheat sheet?')) {
                                      deleteMutation.mutate(sheet.id);
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

        {/* AI Enhancement Dialog */}
        <Dialog open={showEnhanceDialog} onOpenChange={setShowEnhanceDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-600" />
                AI Enhancement
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="enhance-prompt">What improvements do you want?</Label>
                <Textarea
                  id="enhance-prompt"
                  placeholder="e.g., Add more safety tips, simplify the language, add troubleshooting section, make dosage instructions clearer..."
                  value={aiEnhancePrompt}
                  onChange={(e) => setAiEnhancePrompt(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <Button
                onClick={handleAiEnhance}
                disabled={!aiEnhancePrompt.trim() || isEnhancing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply Enhancement
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Convert Units Dialog */}
        <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-blue-600" />
                Convert Measurements
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {convertingSheet && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded p-3">
                  Converting: <span className="font-medium">{convertingSheet.title}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="convert-to">Convert to:</Label>
                <Select value={convertToUnit} onValueChange={setConvertToUnit}>
                  <SelectTrigger id="convert-to" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric (L, mL, g, kg, m, cm)</SelectItem>
                    <SelectItem value="imperial">Imperial (gal, fl oz, lb, oz, ft, in)</SelectItem>
                    <SelectItem value="us">US Customary (gal, fl oz, lb, oz, ft, in)</SelectItem>
                    <SelectItem value="kitchen">Kitchen (cups, tbsp, tsp, mL, L)</SelectItem>
                    <SelectItem value="mixed">Mixed (Metric + Kitchen)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  AI will convert all measurements to convenient whole or half amounts
                </p>
              </div>
              <Button
                onClick={() => handleConvertUnits(convertingSheet)}
                disabled={isConverting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Convert Measurements
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename Dialog */}
        <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Rename Cheat Sheet
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">New Name</Label>
                <Input
                  id="new-name"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameSheet()}
                  placeholder="Enter new name..."
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRenameDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRenameSheet}
                  disabled={!newSheetName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Rename
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Edit Sheet Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                AI Edit Cheat Sheet
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {editingSheet && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded p-3">
                  Editing: <span className="font-medium">{editingSheet.title}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-prompt">What changes do you want?</Label>
                <Textarea
                  id="edit-prompt"
                  placeholder="e.g., Add more details, simplify, reorganize sections, add safety warnings..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <Button
                onClick={handleAIEditSheet}
                disabled={!editPrompt.trim() || isEditingAI}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isEditingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
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