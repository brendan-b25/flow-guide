import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Send, Loader2, FileText, RefreshCw, Paperclip, X, Download, Copy, Edit3, Mic, MicOff, Image as ImageIcon, Layout, Palette, Settings, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import AIFace from '@/components/copilot/AIFace';

export default function Copilot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
  const [canvasContent, setCanvasContent] = useState(null);
  const [isEditingCanvas, setIsEditingCanvas] = useState(false);
  const [canvasEditText, setCanvasEditText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [aiCustomization, setAiCustomization] = useState(() => {
    const saved = localStorage.getItem('aiCustomization');
    return saved ? JSON.parse(saved) : {
      skinTone: '#FFE4D6',
      hairColor: '#4B5768',
      eyeColor: '#3B82F6',
      lipColor: '#DC7B7B',
      voice: 'default'
    };
  });
  const [thinkingMode, setThinkingMode] = useState(() => {
    return localStorage.getItem('aiThinkingMode') || 'deep';
  });
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-AU';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Load available voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Initialize speech synthesis
    speechSynthesisRef.current = window.speechSynthesis;
  }, []);

  useEffect(() => {
    localStorage.setItem('aiCustomization', JSON.stringify(aiCustomization));
  }, [aiCustomization]);

  useEffect(() => {
    if (thinkingMode) {
      localStorage.setItem('aiThinkingMode', thinkingMode);
    }
  }, [thinkingMode]);

  const speakText = (text) => {
    if (!speechSynthesisRef.current) return;

    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();

    // Clean text for speech (remove markdown)
    const cleanText = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/```[^`]*```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Set voice if custom voice selected
    if (aiCustomization.voice !== 'default') {
      const selectedVoice = availableVoices.find(v => v.name === aiCustomization.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else {
      // Use Australian English voice by default
      const auVoice = availableVoices.find(v => v.lang === 'en-AU') || 
                      availableVoices.find(v => v.lang.startsWith('en'));
      if (auVoice) {
        utterance.voice = auVoice;
      }
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

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
      const isContentRequest = /create|write|generate|draft|make|add|improve|expand|update|revise/i.test(userMessage);
      
      // Build conversation history for context
      const conversationHistory = messages
        .slice(-6) // Last 6 messages for context
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      
      // Check if user wants visual content
      const needsVisuals = /visual|diagram|illustration|infographic|picture|image/i.test(userMessage);
      let generatedImageUrl = null;

      if (needsVisuals && isContentRequest) {
        generatedImageUrl = await generateVisualContent(userMessage);
      }

      const thinkingInstructions = {
        standard: `You are FlowGuide Copilot, a professional documentation assistant. Create clear, well-structured content with practical guidance.`,
        deep: `You are FlowGuide Copilot, an expert AI documentation specialist with advanced analytical capabilities.

DEEP THINKING PROCESS:
1. Thoroughly analyze the user's request - understand context, requirements, and end goals
2. Break down complex topics into logical, comprehensive components
3. Consider multiple approaches and select the optimal structure and content
4. Think through edge cases, safety considerations, and practical scenarios
5. Apply rigorous reasoning to ensure technical accuracy and completeness

Provide comprehensive, deeply reasoned responses with thorough explanations.`,
        technical: `You are FlowGuide Copilot, a senior technical documentation expert with deep expertise in complex systems, procedures, and SOPs.

TECHNICAL EXPERT MODE - DEEP ANALYSIS:
• Analyze requirements with system-level perspective and technical precision
• Consider dependencies, prerequisites, compliance requirements, and downstream impacts
• Apply engineering principles, industry standards, and best practices
• Include detailed technical specifications, measurements, and parameters
• Provide comprehensive explanations with technical rationale and theoretical foundations
• Think through failure modes, risk mitigation, error handling, and troubleshooting workflows
• Structure content for technical audiences while maintaining exceptional clarity

Use precise terminology, include maximum technical depth, explain underlying mechanisms and principles. For SOPs: Include purpose, scope, roles & responsibilities, detailed procedures with decision trees, quality controls, safety protocols, compliance requirements, and comprehensive troubleshooting.`
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${thinkingInstructions[thinkingMode]}

${generatedImageUrl ? `A visual illustration has been generated and is available at: ${generatedImageUrl}\nInclude this in your response where appropriate using markdown image syntax: ![Visual Guide](${generatedImageUrl})\n\n` : ''}

${conversationHistory ? `CONVERSATION HISTORY (for context):
${conversationHistory}

` : ''}${currentUrls.length > 0 ? 'IMPORTANT: The user has attached files/images. Carefully analyze them and incorporate ALL relevant information in your response.\n\n' : ''}CURRENT USER REQUEST: ${userMessage}

${canvasContent ? `EXISTING CANVAS CONTENT (user may want to modify/extend this):
${canvasContent}

` : ''}Context: You're helping users in a professional documentation platform that includes:
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
   - Use images with ![alt text](url) for visual content
   - Add visual break sections with ---

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

6. ITERATIVE IMPROVEMENTS:
   - If there's existing canvas content and the user asks to modify/add/improve it, build upon what's already there
   - Maintain the existing structure while incorporating requested changes
   - If asked to "add" something, integrate it naturally into the existing content
   - If asked to "change" or "improve", revise the relevant sections while keeping the rest intact

REMEMBER: The user wants EXTENSIVE, IN-DEPTH content. Do not provide minimal or surface-level information. Generate a complete, thorough, professional document that can be immediately used and printed.
` : `
Provide helpful, detailed, and actionable advice. If the user asks how to do something in the app, explain the steps clearly with examples. If they ask for documentation help, provide comprehensive professional guidance with specific recommendations.

If continuing a conversation, reference previous context and build upon it.
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
      
      // Speak response
      speakText(result);
      
      // Update canvas if it's content creation OR if canvas exists and user is modifying it
      if (isContentRequest || (canvasContent && /add|improve|expand|update|revise|change|modify/i.test(userMessage))) {
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
    "Create a comprehensive SOP for equipment operation",
    "Write a detailed safety procedure with risk assessment",
    "Generate a technical maintenance guide with troubleshooting",
    "Create a quality control checklist with verification steps",
  ];

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const templates = [
    { id: 'safety', name: 'Safety Procedure', icon: '⚠️', prompt: 'Create a comprehensive workplace safety procedure including hazard identification, PPE requirements, emergency procedures, and safety checklists' },
    { id: 'training', name: 'Training Manual', icon: '📚', prompt: 'Create a detailed training manual with learning objectives, step-by-step instructions, practice exercises, and assessment criteria' },
    { id: 'sop', name: 'Standard Operating Procedure', icon: '📋', prompt: 'Create a standard operating procedure with purpose, scope, responsibilities, detailed procedures, quality controls, and documentation requirements' },
    { id: 'checklist', name: 'Inspection Checklist', icon: '✅', prompt: 'Create a comprehensive inspection checklist with categories, specific items to check, pass/fail criteria, and corrective action notes' },
    { id: 'maintenance', name: 'Maintenance Guide', icon: '🔧', prompt: 'Create a maintenance guide with equipment specifications, routine maintenance schedule, troubleshooting guide, and spare parts list' },
    { id: 'emergency', name: 'Emergency Response', icon: '🚨', prompt: 'Create an emergency response plan with emergency contacts, evacuation procedures, incident reporting, and post-emergency protocols' },
    { id: 'visual', name: 'Visual Guide', icon: '🎨', prompt: 'Create a visual step-by-step guide with clear instructions suitable for infographic-style presentation with diagrams and illustrations' },
    { id: 'report', name: 'Report Template', icon: '📊', prompt: 'Create a professional report template with executive summary, methodology, findings, data analysis, conclusions, and recommendations' }
  ];

  const applyTemplate = (template) => {
    setInput(template.prompt);
    setSelectedTemplate(template.id);
    setShowTemplates(false);
  };

  const generateVisualContent = async (prompt) => {
    setIsGeneratingImage(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Professional documentation illustration: ${prompt}. Clean, modern, technical diagram style with clear labels and professional color scheme using blues and greys.`
      });
      
      return url;
    } catch (error) {
      console.error('Image generation error:', error);
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const clearChat = () => {
    stopSpeaking();
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
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - (margin * 2);
    let y = margin;

    // Header
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, pageWidth, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FlowGuide Documentation', margin, 10);
    
    y = 25;
    pdf.setTextColor(15, 23, 42);

    const lines = canvasContent.split('\n');
    lines.forEach(line => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        // Header on new pages
        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, pageWidth, 10, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.text('FlowGuide Documentation', margin, 7);
        y = 20;
        pdf.setTextColor(15, 23, 42);
      }

      if (line.startsWith('###')) {
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        const text = line.replace(/^###\s*/, '');
        pdf.text(text, margin, y);
        y += 8;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
      } else if (line.startsWith('##')) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(37, 99, 235);
        const text = line.replace(/^##\s*/, '');
        pdf.text(text, margin, y);
        pdf.setTextColor(15, 23, 42);
        y += 10;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
      } else if (line.includes('**')) {
        pdf.setFont('helvetica', 'bold');
        const text = line.replace(/\*\*/g, '');
        const splitLines = pdf.splitTextToSize(text, maxWidth);
        splitLines.forEach(l => {
          pdf.text(l, margin, y);
          y += 6;
        });
        pdf.setFont('helvetica', 'normal');
      } else if (line.trim().match(/^[-•]\s/)) {
        const text = line.trim().replace(/^[-•]\s/, '');
        pdf.circle(margin + 2, y - 1.5, 0.8, 'F');
        const splitLines = pdf.splitTextToSize(text, maxWidth - 6);
        splitLines.forEach(l => {
          pdf.text(l, margin + 5, y);
          y += 5.5;
        });
      } else if (line.trim().match(/^\d+\.\s/)) {
        const splitLines = pdf.splitTextToSize(line.trim(), maxWidth - 6);
        splitLines.forEach(l => {
          pdf.text(l, margin + 2, y);
          y += 5.5;
        });
      } else if (line.trim()) {
        const splitLines = pdf.splitTextToSize(line, maxWidth);
        splitLines.forEach(l => {
          pdf.text(l, margin, y);
          y += 5.5;
        });
      } else {
        y += 3;
      }
    });

    // Footer on last page
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated ${new Date().toLocaleDateString('en-AU')} via FlowGuide Copilot`, margin, pageHeight - 10);

    pdf.save('flowguide-document.pdf');
  };

  const exportCanvasToWord = async () => {
    if (!canvasContent) return;

    const { AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = await import('docx');
    const sections = [];
    const lines = canvasContent.split('\n');
    
    let currentList = [];
    let listType = null;

    const flushList = () => {
      if (currentList.length > 0) {
        currentList.forEach(item => sections.push(item));
        currentList = [];
        listType = null;
      }
    };

    lines.forEach(line => {
      if (line.startsWith('###')) {
        flushList();
        sections.push(
          new Paragraph({
            text: line.replace(/^###\s*/, ''),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 150 }
          })
        );
      } else if (line.startsWith('##')) {
        flushList();
        sections.push(
          new Paragraph({
            text: line.replace(/^##\s*/, ''),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
            run: { color: "2563EB" }
          })
        );
      } else if (line.includes('**')) {
        flushList();
        const text = line.replace(/\*\*/g, '');
        sections.push(
          new Paragraph({
            children: [new TextRun({ text, bold: true })],
            spacing: { after: 120 }
          })
        );
      } else if (line.trim().match(/^[-•]\s/)) {
        const text = line.trim().replace(/^[-•]\s/, '');
        currentList.push(
          new Paragraph({
            text,
            bullet: { level: 0 },
            spacing: { after: 80 }
          })
        );
        listType = 'bullet';
      } else if (line.trim().match(/^\d+\.\s/)) {
        const text = line.trim().replace(/^\d+\.\s/, '');
        currentList.push(
          new Paragraph({
            text,
            numbering: { reference: "default-numbering", level: 0 },
            spacing: { after: 80 }
          })
        );
        listType = 'number';
      } else if (line.trim()) {
        flushList();
        sections.push(
          new Paragraph({
            text: line,
            spacing: { after: 120 }
          })
        );
      } else {
        flushList();
      }
    });

    flushList();

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: sections
      }],
      numbering: {
        config: [{
          reference: "default-numbering",
          levels: [{
            level: 0,
            format: "decimal",
            text: "%1.",
            alignment: AlignmentType.LEFT
          }]
        }]
      }
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowguide-document.docx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleEditCanvas = async () => {
    if (!canvasEditText.trim()) return;

    setIsProcessing(true);
    try {
      const conversationHistory = messages
        .slice(-4)
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are editing existing document content. Follow the user's instructions precisely.

${conversationHistory ? `Recent conversation context:
${conversationHistory}

` : ''}Current canvas content:
${canvasContent}

User's edit request: ${canvasEditText}

INSTRUCTIONS:
- Follow the user's request EXACTLY
- If they ask to add something, integrate it naturally into the existing content
- If they ask to change/improve something, revise those sections while keeping the rest
- If they ask to expand, add comprehensive detail to the relevant areas
- Maintain professional formatting with ##, ###, **bold**, bullet points, numbered lists, and tables
- Keep the document well-structured, thorough, and ready for printing/downloading
- Use Australian English

Return the complete revised document with all requested changes applied.`,
        add_context_from_internet: false
      });

      setCanvasContent(result);
      setMessages(prev => [...prev, 
        { role: 'user', content: canvasEditText },
        { role: 'assistant', content: result, isStructured: true }
      ]);
      speakText(result);
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
              <div className="flex gap-2 items-center">
                <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-100 to-blue-100 text-xs font-medium text-slate-700 flex items-center gap-1.5 border border-blue-200">
                  <Brain className="w-3.5 h-3.5 text-blue-600" />
                  {thinkingMode === 'standard' && 'Standard'}
                  {thinkingMode === 'deep' && 'Deep Thinking'}
                  {thinkingMode === 'technical' && 'Technical Expert'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAISettings(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Customize
                </Button>
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
          </div>

          <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            {/* Messages */}
            <div className="space-y-4 mb-6 min-h-[300px] max-h-[500px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <AIFace 
                    isListening={isListening}
                    isProcessing={isProcessing || isSpeaking}
                    isIdle={!isListening && !isProcessing && !isSpeaking}
                    customization={aiCustomization}
                  />
                  <h3 className="text-lg font-semibold text-slate-900 mb-1 mt-4">
                    AI Documentation Studio
                  </h3>
                  <p className="text-slate-600 max-w-md mb-3 text-xs">
                    Talk to me or type • Professional templates • Visual content
                  </p>
                  <Button
                    onClick={() => setShowTemplates(true)}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-8"
                  >
                    <Layout className="w-3 h-3 mr-2" />
                    Templates
                  </Button>
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
                                img: ({ src, alt }) => (
                                  <img src={src} alt={alt} className="w-full max-w-md mx-auto rounded-lg shadow-md my-4" />
                                ),
                                hr: () => <hr className="my-4 border-slate-200" />,
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
                            <div className="mt-3 pt-3 border-t flex gap-2">
                              {msg.isStructured && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(msg.content)}
                                  className="text-xs h-7"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                                className="text-xs h-7"
                              >
                                {isSpeaking ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
                                {isSpeaking ? 'Stop' : 'Speak'}
                              </Button>
                            </div>
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
                  onClick={() => setShowTemplates(true)}
                  disabled={isProcessing}
                  className="shrink-0 bg-gradient-to-br from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 border-blue-200"
                  title="Templates"
                >
                  <Layout className="w-5 h-5 text-blue-600" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="shrink-0"
                  title="Attach files"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={toggleVoiceInput}
                  disabled={isProcessing}
                  className={`shrink-0 ${isListening ? 'bg-red-50 border-red-300' : ''}`}
                  title="Voice input"
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5 text-red-600 animate-pulse" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={(!input.trim() && attachedFiles.length === 0) || isProcessing}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shrink-0"
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
        <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-3 border border-blue-100">
          <h4 className="font-semibold text-slate-900 mb-1 text-xs flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Studio Capabilities
          </h4>
          <ul className="text-xs text-slate-600 space-y-0.5">
            <li>🎤 Voice commands for hands-free creation</li>
            <li>📋 Professional templates for instant start</li>
            <li>🎨 Visual content generation with AI</li>
            <li>📄 Export to print-ready PDF & Word</li>
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
                      thead: ({ children }) => <thead className="bg-gradient-to-r from-blue-50 to-slate-50">{children}</thead>,
                      th: ({ children }) => <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">{children}</th>,
                      td: ({ children }) => <td className="border border-slate-300 px-3 py-2 text-sm">{children}</td>,
                      img: ({ src, alt }) => (
                        <img src={src} alt={alt} className="w-full max-w-lg mx-auto rounded-lg shadow-lg my-4 border border-slate-200" />
                      ),
                      hr: () => <hr className="my-4 border-slate-200" />,
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

        {/* AI Settings Dialog */}
        <Dialog open={showAISettings} onOpenChange={setShowAISettings}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Customize AI Assistant
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <AIFace 
                  isListening={false}
                  isProcessing={false}
                  isIdle={true}
                  customization={aiCustomization}
                />
              </div>

              {/* Thinking Mode Selection */}
              <div className="space-y-3 pb-4 border-b">
                <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  AI Thinking Mode
                </label>
                <div className="grid gap-3">
                  <button
                    onClick={() => setThinkingMode('standard')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      thinkingMode === 'standard'
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 text-sm">Standard Mode</div>
                    <div className="text-xs text-slate-600 mt-0.5">Clear and concise professional responses</div>
                  </button>
                  
                  <button
                    onClick={() => setThinkingMode('deep')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      thinkingMode === 'deep'
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 text-sm">Deep Thinking Mode ⭐</div>
                    <div className="text-xs text-slate-600 mt-0.5">Advanced analysis with comprehensive reasoning</div>
                  </button>
                  
                  <button
                    onClick={() => setThinkingMode('technical')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      thinkingMode === 'technical'
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 text-sm">Technical Expert Mode 🔬</div>
                    <div className="text-xs text-slate-600 mt-0.5">Maximum technical depth and precision for SOPs</div>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Skin Tone</label>
                  <div className="flex gap-2">
                    {['#FFE4D6', '#F5C8A3', '#D9A574', '#C68642', '#8D5524'].map(color => (
                      <button
                        key={color}
                        onClick={() => setAiCustomization({...aiCustomization, skinTone: color})}
                        className={`w-10 h-10 rounded-full border-2 ${aiCustomization.skinTone === color ? 'border-blue-600 scale-110' : 'border-slate-300'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Hair Color</label>
                  <div className="flex gap-2">
                    {['#2D3748', '#4B5768', '#8B4513', '#D4A574', '#E8C9A3'].map(color => (
                      <button
                        key={color}
                        onClick={() => setAiCustomization({...aiCustomization, hairColor: color})}
                        className={`w-10 h-10 rounded-full border-2 ${aiCustomization.hairColor === color ? 'border-blue-600 scale-110' : 'border-slate-300'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Eye Color</label>
                  <div className="flex gap-2">
                    {['#3B82F6', '#10B981', '#8B4513', '#6B7280', '#8B5CF6'].map(color => (
                      <button
                        key={color}
                        onClick={() => setAiCustomization({...aiCustomization, eyeColor: color})}
                        className={`w-10 h-10 rounded-full border-2 ${aiCustomization.eyeColor === color ? 'border-blue-600 scale-110' : 'border-slate-300'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Lip Color</label>
                  <div className="flex gap-2">
                    {['#DC7B7B', '#E57373', '#F48FB1', '#CE93D8', '#B0756F'].map(color => (
                      <button
                        key={color}
                        onClick={() => setAiCustomization({...aiCustomization, lipColor: color})}
                        className={`w-10 h-10 rounded-full border-2 ${aiCustomization.lipColor === color ? 'border-blue-600 scale-110' : 'border-slate-300'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Voice</label>
                  <Select 
                    value={aiCustomization.voice} 
                    onValueChange={(value) => setAiCustomization({...aiCustomization, voice: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      {availableVoices.filter(v => v.lang.startsWith('en')).map((voice, idx) => (
                        <SelectItem key={idx} value={voice.name}>
                          {voice.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={() => setShowAISettings(false)} className="w-full">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Templates Dialog */}
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-blue-600" />
                Professional Templates
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-4 max-h-[500px] overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="text-left p-4 bg-gradient-to-br from-slate-50 to-blue-50 hover:from-blue-50 hover:to-blue-100 rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-all"
                >
                  <div className="text-2xl mb-2">{template.icon}</div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">
                    {template.name}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {template.prompt}
                  </p>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Visual Generation Indicator */}
        {isGeneratingImage && (
          <div className="fixed bottom-24 right-6 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Generating visual content...</span>
          </div>
        )}
      </div>
    </div>
  );
}