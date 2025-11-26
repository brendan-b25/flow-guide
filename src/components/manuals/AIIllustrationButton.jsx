import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Image, Loader2, RefreshCw, Check } from 'lucide-react';

export default function AIIllustrationButton({ section, onImageGenerated }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Create a clean, professional illustration for an onboarding manual section titled "${section.title}". 
Style: Modern, minimalist corporate illustration with soft colours. 
Context: ${section.content.substring(0, 200)}
The image should be simple, professional, and suitable for a business document.`;

      const result = await base44.integrations.Core.GenerateImage({ prompt });
      
      if (result.url) {
        setGeneratedImage(result.url);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate illustration. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    const imageMarkdown = `\n\n![${section.title} illustration](${generatedImage})\n\n`;
    onImageGenerated(section.content + imageMarkdown);
    setIsOpen(false);
    setGeneratedImage(null);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
        >
          <Image className="w-4 h-4 mr-1" />
          Add Illustration
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-slate-900 mb-1">
              🎨 AI Illustration Generator
            </h4>
            <p className="text-xs text-slate-500">
              Generate a custom illustration for this section
            </p>
          </div>

          {generatedImage ? (
            <div className="space-y-3">
              <img
                src={generatedImage}
                alt="Generated illustration"
                className="w-full h-40 object-cover rounded-lg border"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInsert}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Insert
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="w-4 h-4 mr-2" />
                  Generate Illustration
                </>
              )}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}