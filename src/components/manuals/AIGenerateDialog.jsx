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

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const prompt = `You are an expert technical writer creating onboarding manual sections.

Topic: ${topic}
Tone: ${tone}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Generate 5-8 comprehensive sections for this onboarding manual. Each section should be detailed and practical.

IMPORTANT: All measurements must be in metric units (metres, centimetres, millimetres, kilograms, litres, Celsius, etc.). Use Australian English spelling throughout.

For each section, determine the most appropriate type:
- "introduction": For opening/overview sections
- "step": For action-oriented instructions
- "tip": For helpful advice and best practices
- "warning": For important cautions or things to avoid
- "conclusion": For closing/summary sections

Make the content detailed, actionable, and easy to follow. Use markdown formatting for better readability (bullet points, bold text, etc.).`;

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