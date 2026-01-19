import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, FileText } from 'lucide-react';

export default function CreateCheatSheetDialog({ manualId, manualTitle, onCreated }) {
  const [open, setOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      
      // Get manual sections for context
      const sections = await base44.entities.ManualSection.filter({ manual_id: manualId }, 'order');
      
      const sectionsContext = sections.map(s => 
        `Section: ${s.title}\n${s.content}`
      ).join('\n\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a quick reference cheat sheet based on this procedure manual.

Manual Title: ${manualTitle}
Sheet Title: ${sheetTitle}
Description: ${description}

Manual Content:
${sectionsContext}

CRITICAL FORMATTING INSTRUCTIONS:
- ALWAYS use the 'table' object (with 'headers' and 'rows' arrays) for tabular data
- NEVER put table-like data in 'items' array as plain text
- Use tables for any comparison data, measurements, steps with details, or schedules

Generate a structured cheat sheet with:
- title: "${sheetTitle}"
- summary: One-sentence overview based on the manual
- sections: Array of sections, each with:
  - heading: Section title
  - items: Array of key points (NOT tables)
  - type: "steps", "tips", "safety", or "general"
  - table: { headers: [...], rows: [[...], [...]] } - USE for all tabular data

Make it scannable, practical, and focused on quick reference. Use Australian English.`,
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
                  type: { 
                    type: "string", 
                    enum: ["steps", "tips", "safety", "troubleshooting", "general"] 
                  },
                  table: {
                    type: "object",
                    properties: {
                      headers: { type: "array", items: { type: "string" } },
                      rows: { 
                        type: "array", 
                        items: { type: "array", items: { type: "string" } } 
                      }
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

      // Create the cheat sheet
      await base44.entities.CheatSheet.create({
        title: result.title,
        category: 'general',
        products: [],
        content: result
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cheat-sheets']);
      setSheetTitle('');
      setDescription('');
      setOpen(false);
      if (onCreated) onCreated();
      alert('✅ Cheat sheet created!');
    },
    onError: (error) => {
      console.error('Create error:', error);
      alert('Failed to create cheat sheet. Please try again.');
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
          <Sparkles className="w-4 h-4 mr-2" />
          Create Cheat Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Create Cheat Sheet from Procedure
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-slate-700">
            <p>AI will generate a quick reference cheat sheet based on your procedure: <strong>{manualTitle}</strong></p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-title">Cheat Sheet Title</Label>
            <Input
              id="sheet-title"
              placeholder="e.g., Pool Maintenance Quick Guide"
              value={sheetTitle}
              onChange={(e) => setSheetTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What should this cheat sheet focus on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!sheetTitle.trim() || isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}