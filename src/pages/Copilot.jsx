import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Send, Loader2, FileText, RefreshCw, Paperclip, X, Download, Copy, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

export default function Copilot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
  const [canvasContent, setCanvasContent] = useState(null);
  const [isEditingCanvas, setIsEditingCanvas] = useState(false);
  const [canvasEditText, setCanvasEditText] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setAttachedFiles(prev => [...prev, ...files]);
    
    // Upload files and get URLs
    const uploadPromises = files.map(file => 
      base44.integrations.Core.UploadFile({ file })
    );
    
    try {
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setUploadedFileUrls(prev => [...prev, ...urls]);
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload some files');
    }
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedFileUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isProcessing) return;

    const userMessage = input.trim();
    const filesInfo = attachedFiles.length > 0 
      ? ` [${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''} attached]`
      : '';
    
    setInput('');
    const currentFiles = [...attachedFiles];
    const currentUrls = [...uploadedFileUrls];
    setAttachedFiles([]);
    setUploadedFileUrls([]);
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage + filesInfo,
      files: currentFiles
    }]);
    setIsProcessing(true);

    try {
      const isContentRequest = /create|write|generate|draft|make/i.test(userMessage);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are FlowGuide Copilot, an expert AI assistant specialized in creating comprehensive, professional documentation, procedures, cheat sheets, and guides.

${currentUrls.length > 0 ? 'IMPORTANT: The user has attached files/images. Carefully analyze them and incorporate ALL relevant information in your response.' : ''}

User request: ${userMessage}

Context: You're helping users in a professional documentation platform that includes:
- Procedures (detailed step-by-step manuals with comprehensive sections)
- Cheat Sheets (thorough quick reference guides)
- Document Templates (professional forms, reports, etc.)
- Document Generation (AI-powered content creation)

${isContentRequest ? `
CRITICAL INSTRUCTIONS FOR CONTENT CREATION:

1. READ THE USER'S REQUEST CAREFULLY - Follow EXACTLY what they're asking for
2. BE COMPREHENSIVE AND DETAILED:
   - Include ALL relevant information, not just basics
   - Provide thorough explanations, not minimal summaries
   - Cover edge cases, safety considerations, and best practices
   - Include specific measurements, timeframes, and technical details
   - Add troubleshooting sections where relevant

3. PROFESSIONAL FORMATTING:
   - Use ## for main section headings
   - Use ### for subsections when needed
   - Use **bold** for important terms, warnings, and key points
   - Use bullet points (-) for lists
   - Use numbered lists (1. 2. 3.) for sequential steps
   - Include tables in markdown format for:
     * Dosage/measurement information
     * Schedules and timelines
     * Comparison data
     * Technical specifications
   - Use code blocks with \`\`\` for examples, formulas, or technical content

4. COMPREHENSIVE STRUCTURE:
   - Introduction/Overview section
   - Multiple detailed content sections (at least 4-6 sections for full documents)
   - Safety warnings and precautions (where applicable)
   - Troubleshooting section (where applicable)
   - Tips and best practices
   - References or additional notes

5. DEPTH AND QUALITY:
   - Write 300-500+ words minimum for full documents
   - Include specific examples and scenarios
   - Provide context and explanations, not just lists
   - Add professional insights and recommendations
   - Make it immediately usable without further editing

REMEMBER: The user wants EXTENSIVE, IN-DEPTH content. Do not provide minimal or surface-level information. Generate a complete, thorough, professional document.
` : `
Provide helpful, detailed, and actionable advice. If the user asks how to do something in the app, explain the steps clearly with examples. If they ask for documentation help, provide comprehensive professional guidance with specific recommendations.
`}

Use Australian English throughout. Be professional, thorough, and detailed.`,
        add_context_from_internet: false,
        file_urls: currentUrls.length > 0 ? currentUrls : undefined
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result,
        isStructured: isContentRequest
      }]);
      
      if (isContentRequest) {
        setCanvasContent(result);
      }
    } catch (error) {
      console.error('Copilot error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickPrompts = [
    "Create a safety procedure template",
    "Write a chemical handling guide",
    "Generate a maintenance checklist",
    "Create a training document outline",
  ];

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  const clearChat = () => {
    setMessages([]);
    setCanvasContent(null);
    setAttachedFiles([]);
    setUploadedFileUrls([]);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard');
  };

  const exportCanvasToPDF = async () => {
    if (!canvasContent) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);
    let y = margin;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(15, 23, 42);

    const lines = canvasContent.split('\n');
    lines.forEach(line => {
      if (y > 270) {
        pdf.addPage();
        y = margin;
      }

      if (line.startsWith('##')) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(line.replace(/^##\s*/, ''), margin, y);
        y += 10;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
      } else if (line.startsWith('**') && line.endsWith('**')) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(line.replace(/\*\*/g, ''), margin, y);
        pdf.setFont('helvetica', 'normal');
        y += 6;
      } else if (line.trim()) {
        const splitLines = pdf.splitTextToSize(line, maxWidth);
        splitLines.forEach(l => {
          pdf.text(l, margin, y);
          y += 6;
        });
      } else {
        y += 4;
      }
    });

    pdf.save('copilot-content.pdf');
  };

  const exportCanvasToWord = async () => {
    if (!canvasContent) return;

    const sections = [];
    const lines = canvasContent.split('\n');

    lines.forEach(line => {
      if (line.startsWith('##')) {
        sections.push(
          new Paragraph({
            text: line.replace(/^##\s*/, ''),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          })
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: line.replace(/\*\*/g, ''), bold: true })],
            spacing: { after: 120 }
          })
        );
      } else if (line.trim()) {
        sections.push(
          new Paragraph({
            text: line,
            spacing: { after: 120 }
          })
        );
      }
    });

    const doc = new Document({
      sections: [{ children: sections }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'copilot-content.docx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleEditCanvas = async () => {
    if (!canvasEditText.trim()) return;

    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Edit this content based on the user's request: "${canvasEditText}"

Current content:
${canvasContent}

IMPORTANT: Generate improved content maintaining professional formatting:
- Use ## for main headings
- Use **bold** for emphasis
- Use bullet points with - or numbered lists
- Include tables in markdown format when appropriate
- Keep it well-structured and scannable

Return only the revised content, properly formatted. Use Australian English.`,
        add_context_from_internet: false
      });

      setCanvasContent(result);
      setMessages(prev => [...prev, 
        { role: 'user', content: `Edit: ${canvasEditText}` },
        { role: 'assistant', content: result, isStructured: true }
      ]);
      setIsEditingCanvas(false);
      setCanvasEditText('');
    } catch (error) {
      console.error('Edit error:', error);
      alert('Failed to edit content');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid gap-6 ${canvasContent ? 'lg:grid-cols-2' : 'lg:grid-cols-1 max-w-4xl mx-auto'}`}>
        {/* Chat Section */}
        <div className={canvasContent ? '' : 'col-span-full'}>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-1">
                  AI Copilot
                </h1>
                <p className="text-sm text-slate-600">
                  Create and format professional documentation
                </p>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="text-slate-600"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            {/* Messages */}
            <div className="space-y-4 mb-6 min-h-[300px] max-h-[500px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    AI Documentation Assistant
                  </h3>
                  <p className="text-slate-600 max-w-md mb-6 text-sm">
                    Generate professional documentation, upload files for analysis, and create formatted content
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors text-xs text-slate-700"
                      >
                        <Sparkles className="w-3 h-3 inline-block mr-1 text-blue-600" />
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-slate-200'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <div>
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            {msg.files && msg.files.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {msg.files.map((file, fIdx) => (
                                  <div key={fIdx} className="text-xs bg-blue-700 px-2 py-1 rounded">
                                    📎 {file.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <ReactMarkdown
                              className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                              components={{
                                h2: ({ children }) => <h2 className="text-base font-bold text-slate-900 mt-4 mb-2">{children}</h2>,
                                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                                table: ({ children }) => <table className="w-full border-collapse border border-slate-300 my-3">{children}</table>,
                                thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
                                th: ({ children }) => <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold">{children}</th>,
                                td: ({ children }) => <td className="border border-slate-300 px-3 py-2 text-xs">{children}</td>,
                                code: ({ inline, children }) => (
                                  inline ? (
                                    <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                                      {children}
                                    </code>
                                  ) : (
                                    <code className="block p-3 rounded bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto my-2">
                                      {children}
                                    </code>
                                  )
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                            {msg.isStructured && (
                              <div className="mt-3 pt-3 border-t flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(msg.content)}
                                  className="text-xs h-7"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="bg-slate-100 rounded px-3 py-1 text-xs flex items-center gap-2">
                    <span className="text-slate-700">📎 {file.name}</span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Create documentation, analyze files, or ask questions..."
                  className="min-h-[60px] resize-none"
                  disabled={isProcessing}
                />
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Button
                  type="submit"
                  disabled={(!input.trim() && attachedFiles.length === 0) || isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 shrink-0"
                  size="icon"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <h4 className="font-semibold text-slate-900 mb-1 text-xs">
            💡 Capabilities:
          </h4>
          <ul className="text-xs text-slate-600 space-y-0.5">
            <li>• Generate formatted documents</li>
            <li>• Analyze uploaded files and images</li>
            <li>• Create procedures and checklists</li>
            <li>• Professional writing assistance</li>
          </ul>
        </div>
        </div>

        {/* Canvas Section */}
        {canvasContent && (
          <div>
            <Card className="border-0 shadow-lg sticky top-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Canvas</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingCanvas(true)}
                      className="text-xs h-8"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(canvasContent)}
                      className="text-xs h-8"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportCanvasToPDF}
                      className="text-xs h-8"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportCanvasToWord}
                      className="text-xs h-8"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Word
                    </Button>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                  <ReactMarkdown
                    className="prose prose-sm prose-slate max-w-none"
                    components={{
                      h2: ({ children }) => <h2 className="text-lg font-bold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h2>,
                      p: ({ children }) => <p className="mb-3 leading-relaxed text-slate-700">{children}</p>,
                      ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-slate-700">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                      table: ({ children }) => <table className="w-full border-collapse border border-slate-300 my-4">{children}</table>,
                      thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
                      th: ({ children }) => <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">{children}</th>,
                      td: ({ children }) => <td className="border border-slate-300 px-3 py-2 text-sm">{children}</td>,
                      code: ({ inline, children }) => (
                        inline ? (
                          <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-sm font-mono">
                            {children}
                          </code>
                        ) : (
                          <code className="block p-3 rounded bg-slate-900 text-slate-100 text-sm font-mono overflow-x-auto my-3">
                            {children}
                          </code>
                        )
                      ),
                    }}
                  >
                    {canvasContent}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>

        {/* Edit Canvas Dialog */}
        <Dialog open={isEditingCanvas} onOpenChange={setIsEditingCanvas}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Edit Canvas Content
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Describe how you want to edit the content..."
                  value={canvasEditText}
                  onChange={(e) => setCanvasEditText(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingCanvas(false);
                    setCanvasEditText('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditCanvas}
                  disabled={!canvasEditText.trim() || isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Apply Changes'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}