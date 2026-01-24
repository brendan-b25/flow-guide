import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shuffle, Loader2, LayoutTemplate } from 'lucide-react';

export default function AIRestructureDialog({ manualId, sections, onRestructured }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restructureType, setRestructureType] = useState('reorder');
  const [customInstructions, setCustomInstructions] = useState('');

  const handleRestructure = async () => {
    if (sections.length === 0) return;

    setIsProcessing(true);
    try {
      const currentSections = sections.map((s, idx) => ({
        id: s.id,
        order: idx,
        title: s.title,
        content: s.content,
        section_type: s.section_type
      }));

      const typeInstructions = {
        reorder: 'Reorganise the sections in the most logical order for a reader. Move introductions to the start, conclusions to the end, group related steps together, and place tips/warnings near relevant content.',
        consolidate: 'Merge sections that cover similar topics, eliminate redundancy, and create a more streamlined document. Combine related steps and tips where appropriate.',
        expand: 'Break down complex sections into smaller, more digestible parts. Split long sections and add transitional content between major topics.',
        simplify: 'Simplify the structure by reducing the number of sections while keeping all essential information. Combine short sections and remove unnecessary divisions.'
      };

      const prompt = `You are an expert document architect restructuring an onboarding manual.

Current Sections (in order):
${JSON.stringify(currentSections, null, 2)}

Task: ${typeInstructions[restructureType]}

${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

IMPORTANT:
- All measurements must be in metric units (metres, centimetres, kilograms, litres, Celsius)
- Use Australian English spelling
- Maintain all important information
- Improve clarity and flow
- Use appropriate section types (introduction, step, tip, warning, conclusion)

Return the restructured sections with updated content, titles, types, and new order.`;

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
            },
            changes_summary: { type: "string" }
          },
          required: ["sections", "changes_summary"]
        }
      });

      if (result.sections && result.sections.length > 0) {
        // FIRST: Save backup of current state before any changes
        const backupData = sections.map(s => ({
          title: s.title,
          content: s.content,
          section_type: s.section_type,
          order: s.order
        }));
        
        await base44.entities.ManualVersion.create({
          manual_id: manualId,
          version_type: 'manual_snapshot',
          snapshot_data: { sections: backupData },
          change_description: 'Backup before restructure'
        });

        // Prepare new restructured sections
        const newSections = result.sections.map((section, index) => ({
          manual_id: manualId,
          title: section.title,
          content: section.content,
          section_type: section.section_type || 'step',
          order: index
        }));

        // Create new sections FIRST
        await base44.entities.ManualSection.bulkCreate(newSections);

        // Only delete old sections AFTER new ones are created successfully
        for (const section of sections) {
          await base44.entities.ManualSection.delete(section.id);
        }

        // Save version of new state
        await base44.entities.ManualVersion.create({
          manual_id: manualId,
          version_type: 'manual_snapshot',
          snapshot_data: { sections: newSections },
          change_description: `Manual restructured: ${result.changes_summary}`
        });

        onRestructured();
        setIsOpen(false);
        setCustomInstructions('');
      }
    } catch (error) {
      console.error('Error restructuring:', error);
      alert('Failed to restructure manual. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50">
          <Shuffle className="w-4 h-4" />
          Restructure
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-orange-600" />
            AI Restructure Manual
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Restructure Type</Label>
            <Select value={restructureType} onValueChange={setRestructureType}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reorder">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Reorder & Organise</span>
                    <span className="text-xs text-slate-500">Optimal section ordering</span>
                  </div>
                </SelectItem>
                <SelectItem value="consolidate">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Consolidate</span>
                    <span className="text-xs text-slate-500">Merge similar sections</span>
                  </div>
                </SelectItem>
                <SelectItem value="expand">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Expand</span>
                    <span className="text-xs text-slate-500">Break into smaller parts</span>
                  </div>
                </SelectItem>
                <SelectItem value="simplify">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Simplify</span>
                    <span className="text-xs text-slate-500">Reduce complexity</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Custom Instructions (Optional)</Label>
            <Textarea
              placeholder="e.g., Put all safety warnings at the beginning, group training steps by week..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="h-24 resize-none"
            />
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-900">
              <strong>⚠️ Note:</strong> This will reorganise your entire manual. 
              A backup will be saved to version history.
            </p>
          </div>

          <Button
            onClick={handleRestructure}
            disabled={sections.length === 0 || isProcessing}
            className="w-full h-12 bg-orange-600 hover:bg-orange-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Restructuring...
              </>
            ) : (
              <>
                <Shuffle className="w-5 h-5 mr-2" />
                Restructure Manual
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}