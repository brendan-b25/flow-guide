import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function AIImproveButton({ section, onImproved }) {
  const [isImproving, setIsImproving] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleImprove = async () => {
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

Analyze this section and provide:
1. An improved version of the content that is clearer, more actionable, and better structured
2. Specific suggestions for what was improved and why

Make the improved content more engaging, easier to follow, and professional. Use markdown formatting effectively.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            improved_content: { type: "string" },
            improvements_made: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["improved_content", "improvements_made"]
        }
      });

      setSuggestions(result);
      setIsOpen(true);
    } catch (error) {
      console.error('Error improving content:', error);
      alert('Failed to improve content. Please try again.');
    } finally {
      setIsImproving(false);
    }
  };

  const handleApply = () => {
    if (suggestions) {
      onImproved(suggestions.improved_content);
      setIsOpen(false);
      setSuggestions(null);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleImprove}
          disabled={isImproving}
          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
        >
          {isImproving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-1" />
          )}
          {isImproving ? 'Analyzing...' : 'Improve with AI'}
        </Button>
      </PopoverTrigger>
      {suggestions && (
        <PopoverContent className="w-96 max-h-96 overflow-y-auto" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-slate-900 mb-2">
                ✨ AI Suggestions
              </h4>
              <div className="space-y-2">
                {suggestions.improvements_made.map((improvement, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <span className="text-green-600 font-bold">•</span>
                    <span>{improvement}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm text-slate-900 mb-2">
                Improved Content Preview:
              </h4>
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 max-h-40 overflow-y-auto">
                {suggestions.improved_content.substring(0, 200)}...
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApply}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Apply Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setSuggestions(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}