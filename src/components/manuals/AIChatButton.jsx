import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Loader2, Send, Check, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function AIChatButton({ section, onApplyChanges }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [request, setRequest] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    if (!request.trim() || !section.content.trim()) return;

    setIsProcessing(true);
    try {
      const prompt = `You are an expert technical writer helping to modify manual content.

Current Section Title: ${section.title}
Current Section Type: ${section.section_type}
Current Content:
${section.content}

User Request: ${request}

IMPORTANT: 
- All measurements must be in metric units (metres, centimetres, millimetres, kilograms, litres, Celsius, etc.)
- Convert any imperial measurements to metric
- Use Australian English spelling (e.g., colour, metre, organisation)

Apply the requested changes to the content while maintaining:
- Professional tone and clarity
- Proper markdown formatting
- Logical structure and flow
- Metric measurements throughout

Return only the modified content.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            modified_content: { type: "string" },
            changes_summary: { type: "string" }
          },
          required: ["modified_content", "changes_summary"]
        }
      });

      setResult(response);
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Failed to process request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApplyChanges(result.modified_content);
      setIsOpen(false);
      setRequest('');
      setResult(null);
    }
  };

  const handleCancel = () => {
    setResult(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setRequest('');
    setResult(null);
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          Request Changes
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-slate-900 mb-2">
              💬 Request AI Changes
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Describe the changes you want. All measurements will be converted to metric.
            </p>
          </div>

          {!result ? (
            <>
              <Textarea
                placeholder="e.g., Add more detail about safety precautions, convert to a step-by-step list, simplify the language..."
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                className="min-h-24 text-sm"
                disabled={isProcessing}
              />
              <Button
                onClick={handleSubmit}
                disabled={!request.trim() || isProcessing || !section.content.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-900 mb-1">Changes Ready</p>
                <p className="text-xs text-green-700">{result.changes_summary}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-xs text-slate-600 whitespace-pre-wrap">
                  {result.modified_content.substring(0, 200)}...
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}