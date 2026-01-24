import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Loader2, Send, Check, X, RotateCcw } from 'lucide-react';

export default function AIChatButton({ section, onApplyChanges, isModal, onClose }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [request, setRequest] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = useCallback(async () => {
    if (!request.trim() || !section.content.trim()) return;

    setIsProcessing(true);
    try {
      const prompt = `You are an expert technical writer modifying manual content.

Section: ${section.title} (${section.section_type})
Content: ${section.content}

Request: ${request}

Apply the changes while maintaining professional tone, markdown formatting, and using metric units with Australian English spelling.`;

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
  }, [request, section]);

  const handleApply = useCallback(() => {
    if (result) {
      onApplyChanges(result.modified_content);
      setRequest('');
      setResult(null);
    }
  }, [result, onApplyChanges]);

  const handleReset = useCallback(() => {
    setResult(null);
  }, []);

  if (isModal) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Request Changes
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Describe what you'd like to change about this section.
            </p>
            <Textarea
              placeholder="e.g., Add more safety details, simplify the language, convert to bullet points..."
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              className="min-h-28 text-sm"
              disabled={isProcessing}
              autoFocus
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-800 mb-1">✓ Changes Ready</p>
              <p className="text-xs text-green-700">{result.changes_summary}</p>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-1">Preview:</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {result.modified_content.substring(0, 250)}
                {result.modified_content.length > 250 && '...'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApply} className="flex-1 bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-2" />
                Apply
              </Button>
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Original trigger button
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
    >
      <MessageSquare className="w-4 h-4" />
    </Button>
  );
}