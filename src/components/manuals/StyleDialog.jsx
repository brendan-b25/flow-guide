import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Paintbrush, Loader2 } from 'lucide-react';

export default function StyleDialog({ manualId, sections, onStyled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [style, setStyle] = useState('professional');
  const [formatting, setFormatting] = useState('structured');
  const [customInstructions, setCustomInstructions] = useState('');

  const handleApplyStyle = async () => {
    if (sections.length === 0) return;

    setIsProcessing(true);
    try {
      const currentSections = sections.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
        section_type: s.section_type,
        order: s.order
      }));

      const styleDescriptions = {
        professional: 'Formal, corporate tone with clear and precise language. Suitable for official documentation.',
        friendly: 'Warm, approachable tone using conversational language. Makes content feel welcoming.',
        technical: 'Detailed, precise language with technical terminology. Thorough explanations.',
        simple: 'Plain language, short sentences, easy to understand. Suitable for beginners.',
        instructional: 'Clear step-by-step format with action-oriented language. Direct commands.'
      };

      const formattingDescriptions = {
        structured: 'Use headers, bullet points, numbered lists, and clear sections.',
        narrative: 'Flowing paragraphs with smooth transitions between topics.',
        checklist: 'Format as actionable checklists with checkbox-style items.',
        qa: 'Question and answer format, addressing common queries.',
        concise: 'Minimal text, key points only, maximum brevity.'
      };

      const prompt = `You are an expert document stylist transforming manual content.

Current Sections:
${JSON.stringify(currentSections, null, 2)}

Apply these style changes:
- Writing Style: ${style} - ${styleDescriptions[style]}
- Formatting: ${formatting} - ${formattingDescriptions[formatting]}

${customInstructions ? `Additional Style Instructions: ${customInstructions}` : ''}

IMPORTANT:
- All measurements must be in metric units (metres, centimetres, kilograms, litres, Celsius)
- Use Australian English spelling (colour, organisation, metre, etc.)
- Keep the same section structure and order
- Transform the writing style and formatting while preserving all information
- Use appropriate markdown formatting

Return all sections with the new style applied.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  content: { type: "string" },
                  section_type: { type: "string" }
                },
                required: ["title", "content", "section_type"]
              }
            },
            style_changes: { type: "string" }
          },
          required: ["sections", "style_changes"]
        }
      });

      if (result.sections && result.sections.length > 0) {
        // Update each section with new styled content
        for (let i = 0; i < result.sections.length; i++) {
          const styledSection = result.sections[i];
          const originalSection = sections[i];
          
          if (originalSection) {
            await base44.entities.ManualSection.update(originalSection.id, {
              title: styledSection.title,
              content: styledSection.content,
              section_type: styledSection.section_type || originalSection.section_type
            });
          }
        }

        // Save version
        await base44.entities.ManualVersion.create({
          manual_id: manualId,
          version_type: 'manual_snapshot',
          snapshot_data: { 
            sections: result.sections.map((s, idx) => ({
              ...s,
              order: idx
            }))
          },
          change_description: `Style applied: ${style} writing, ${formatting} formatting`
        });

        onStyled();
        setIsOpen(false);
        setCustomInstructions('');
      }
    } catch (error) {
      console.error('Error applying style:', error);
      alert('Failed to apply style. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-pink-200 text-pink-700 hover:bg-pink-50">
          <Paintbrush className="w-4 h-4" />
          Style
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Paintbrush className="w-6 h-6 text-pink-600" />
            Change Document Style
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Writing Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional & Formal</SelectItem>
                <SelectItem value="friendly">Friendly & Conversational</SelectItem>
                <SelectItem value="technical">Technical & Detailed</SelectItem>
                <SelectItem value="simple">Simple & Beginner-Friendly</SelectItem>
                <SelectItem value="instructional">Instructional & Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Formatting Style</Label>
            <Select value={formatting} onValueChange={setFormatting}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="structured">Structured (Headers & Lists)</SelectItem>
                <SelectItem value="narrative">Narrative (Flowing Text)</SelectItem>
                <SelectItem value="checklist">Checklist Format</SelectItem>
                <SelectItem value="qa">Q&A Format</SelectItem>
                <SelectItem value="concise">Concise (Key Points Only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Additional Instructions (Optional)</Label>
            <Textarea
              placeholder="e.g., Add more examples, use dot points instead of paragraphs, include summary boxes..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="h-20 resize-none"
            />
          </div>

          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
            <p className="text-sm text-pink-900">
              <strong>✨ AI will:</strong> Transform writing tone and formatting 
              while keeping all content and section order intact.
            </p>
          </div>

          <Button
            onClick={handleApplyStyle}
            disabled={sections.length === 0 || isProcessing}
            className="w-full h-12 bg-pink-600 hover:bg-pink-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Applying Style...
              </>
            ) : (
              <>
                <Paintbrush className="w-5 h-5 mr-2" />
                Apply Style
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}