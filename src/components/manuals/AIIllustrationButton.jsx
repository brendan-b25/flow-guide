import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Image, Loader2, RefreshCw, Check, X } from 'lucide-react';

export default function AIIllustrationButton({ section, onImageGenerated, isModal, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const prompt = `Create a clean, professional illustration for an onboarding manual section titled "${section.title}". 
Style: Modern, minimalist corporate illustration with soft colours.
Context: ${section.content.substring(0, 200)}
Simple, professional, suitable for business documents.`;

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
  }, [section]);

  const handleInsert = useCallback(() => {
    const imageMarkdown = `\n\n![${section.title} illustration](${generatedImage})\n\n`;
    onImageGenerated(section.content + imageMarkdown);
    setGeneratedImage(null);
  }, [generatedImage, section, onImageGenerated]);

  if (isModal) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Image className="w-5 h-5 text-teal-600" />
            AI Illustration
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {isGenerating ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
            <p className="text-slate-600">Generating illustration...</p>
            <p className="text-xs text-slate-400 mt-1">This may take 5-10 seconds</p>
          </div>
        ) : generatedImage ? (
          <div className="space-y-4">
            <img
              src={generatedImage}
              alt="Generated illustration"
              className="w-full h-48 object-cover rounded-lg border shadow-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleInsert} className="flex-1 bg-teal-600 hover:bg-teal-700">
                <Check className="w-4 h-4 mr-2" />
                Insert Image
              </Button>
              <Button variant="outline" onClick={handleGenerate} className="px-3">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-slate-600 mb-4">Generate a custom illustration for this section</p>
            <Button onClick={handleGenerate} className="bg-teal-600 hover:bg-teal-700">
              <Image className="w-4 h-4 mr-2" />
              Generate Illustration
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
    >
      <Image className="w-4 h-4" />
    </Button>
  );
}