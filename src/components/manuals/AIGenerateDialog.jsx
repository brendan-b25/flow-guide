import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function AIGenerateDialog({ manualId, onSectionsGenerated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [additionalContext, setAdditionalContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(r => r.file_url);
      setUploadedFiles(prev => [...prev, ...fileUrls]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const prompt = `You are an expert technical writer creating clear, professional procedure documentation optimized for A4 printing.

Topic: ${topic}
Tone: ${tone}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}
${uploadedFiles.length > 0 ? 'Files attached with additional context (video/audio transcripts or documents).' : ''}

Generate 5-8 comprehensive sections for this procedure manual. Each section should be:
- Clear and simple, easy to follow
- Professional and actionable
- Suitable for printing on A4 paper (concise paragraphs, clear headings)
- Step-by-step where applicable

IMPORTANT: 
- All measurements in metric units (metres, centimetres, millimetres, kilograms, litres, Celsius)
- Australian English spelling throughout
- Keep content printer-friendly (avoid overly long paragraphs)

For each section, determine the most appropriate type:
- "introduction": For opening/overview sections
- "step": For action-oriented instructions
- "tip": For helpful advice and best practices
- "warning": For important cautions or things to avoid
- "conclusion": For closing/summary sections

Use markdown formatting for better readability (bullet points, bold text, numbered lists, etc.).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  section_type: { 
                    type: "string",
                    enum: ["introduction", "step", "tip", "warning", "conclusion"]
                  }
                },
                required: ["title", "content", "section_type"]
              }
            }
          },
          required: ["sections"]
        }
      });

      if (result.sections && result.sections.length > 0) {
        // Create sections in database
        const sectionsToCreate = result.sections.map((section, index) => ({
          manual_id: manualId,
          title: section.title,
          content: section.content,
          section_type: section.section_type,
          order: index
        }));

        await base44.entities.ManualSection.bulkCreate(sectionsToCreate);
        
        onSectionsGenerated();
        setIsOpen(false);
        setTopic('');
        setAdditionalContext('');
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error('Error generating sections:', error);
      alert('Failed to generate sections. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Section Generator
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label htmlFor="topic" className="text-sm font-medium">
              What topic should the manual cover?
            </Label>
            <Input
              id="topic"
              placeholder="e.g., New employee onboarding process"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone" className="text-sm font-medium">
              Tone & Style
            </Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger id="tone" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly & Casual</SelectItem>
                <SelectItem value="technical">Technical & Detailed</SelectItem>
                <SelectItem value="simple">Simple & Beginner-Friendly</SelectItem>
                <SelectItem value="formal">Formal & Corporate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context" className="text-sm font-medium">
              Additional Context (Optional)
            </Label>
            <Textarea
              id="context"
              placeholder="Any specific requirements, company policies, or details to include..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="h-24 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="files" className="text-sm font-medium">
              Upload Files (Optional)
            </Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-purple-400 transition-colors">
              <input
                id="files"
                type="file"
                multiple
                accept="video/*,audio/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <label htmlFor="files" className="cursor-pointer block text-center">
                {isUploading ? (
                  <div className="text-sm text-slate-600">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Uploading...
                  </div>
                ) : uploadedFiles.length > 0 ? (
                  <div className="text-sm">
                    <p className="text-green-700 font-medium mb-1">✓ {uploadedFiles.length} file(s) uploaded</p>
                    <p className="text-xs text-slate-500">Click to add more</p>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">
                    <p className="font-medium mb-1">📎 Upload video, audio, or documents</p>
                    <p className="text-xs text-slate-500">AI will analyze content for context</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>✨ AI will generate:</strong> 5-8 comprehensive sections with titles, 
              detailed content, and appropriate section types automatically assigned.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Sections...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Manual Sections
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}