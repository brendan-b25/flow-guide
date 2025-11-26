import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, X, Check } from 'lucide-react';

export default function AIImproveButton({ section, onImproved, isModal, onClose }) {
  const [isImproving, setIsImproving] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const handleImprove = useCallback(async () => {
    if (!section.content.trim()) {
      alert('Please add some content first before improving it.');
      return;
    }

    setIsImproving(true);
    try {
      const prompt = `You are an expert technical writer reviewing onboarding manual content.

Section Type: ${section.section_type}
Title: ${section.title}
Current Content:
${section.content}

Provide an improved version that is clearer, more actionable, and better structured.
Use markdown formatting. Keep it concise but comprehensive.

IMPORTANT: Use metric units and Australian English spelling.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            improved_content: { type: "string" },
            improvements_made: { type: "array", items: { type: "string" } }
          },
          required: ["improved_content", "improvements_made"]
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error('Error improving content:', error);
      alert('Failed to improve content. Please try again.');
    } finally {
      setIsImproving(false);
    }
  }, [section]);

  const handleApply = useCallback(() => {
    if (suggestions) {
      onImproved(suggestions.improved_content);
      setSuggestions(null);
    }
  }, [suggestions, onImproved]);

  // Auto-trigger on mount for modal mode
  React.useEffect(() => {
    if (isModal && !suggestions && !isImproving) {
      handleImprove();
    }
  }, [isModal]);

  if (isModal) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Improvements
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {isImproving ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-slate-600">Analysing and improving content...</p>
          </div>
        ) : suggestions ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Improvements made:</p>
              <ul className="space-y-1">
                {suggestions.improvements_made.slice(0, 4).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-1">Preview:</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {suggestions.improved_content.substring(0, 300)}
                {suggestions.improved_content.length > 300 && '...'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleApply} className="flex-1 bg-purple-600 hover:bg-purple-700">
                <Check className="w-4 h-4 mr-2" />
                Apply Changes
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">
            <p>Ready to improve your content</p>
            <Button onClick={handleImprove} className="mt-4 bg-purple-600 hover:bg-purple-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Original popover trigger button (kept for backwards compatibility)
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleImprove}
      disabled={isImproving}
      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
    >
      {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
    </Button>
  );
}