import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

export default function AIStepBuilder({ manualId, onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    topic: '',
    audience: '',
    goals: '',
    existingKnowledge: '',
    specificAreas: ''
  });

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGenerate = async () => {
    setIsProcessing(true);
    try {
      const prompt = `Create a comprehensive procedure manual with 8-12 sections based on these requirements:

Topic: ${formData.topic}
Target Audience: ${formData.audience}
Goals: ${formData.goals}
Existing Knowledge Level: ${formData.existingKnowledge}
Specific Areas to Cover: ${formData.specificAreas}

Create detailed, actionable sections with:
- Clear titles
- Rich markdown content with step-by-step instructions
- Appropriate section types (introduction, step, tip, warning, conclusion)
- Use metric units and Australian English
- Include best practices and common pitfalls
- Make content practical and easy to follow

Start with an introduction, include multiple procedural steps with tips and warnings where relevant, and end with a conclusion.`;

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
        const sectionsToCreate = result.sections.map((section, index) => ({
          manual_id: manualId,
          title: section.title,
          content: section.content,
          section_type: section.section_type,
          order: index
        }));

        await base44.entities.ManualSection.bulkCreate(sectionsToCreate);

        await base44.entities.ManualVersion.create({
          manual_id: manualId,
          version_type: 'manual_snapshot',
          snapshot_data: { sections: sectionsToCreate },
          change_description: 'Manual created with AI Step Builder'
        });

        setStep(6); // Success step
        setTimeout(() => {
          onComplete();
          setIsOpen(false);
          setStep(1);
          setFormData({
            topic: '',
            audience: '',
            goals: '',
            existingKnowledge: '',
            specificAreas: ''
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Error generating manual:', error);
      alert('Failed to generate manual. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>🎯 Step 1 of 5:</strong> Let's start by understanding what you want to document
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">What is this procedure about?</Label>
              <Input
                id="topic"
                placeholder="e.g., Pool maintenance, Equipment setup, Safety protocols..."
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>👥 Step 2 of 5:</strong> Who will be using this manual?
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Target audience</Label>
              <Input
                id="audience"
                placeholder="e.g., New employees, technicians, pool owners..."
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>🎯 Step 3 of 5:</strong> What should users achieve after following this?
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goals">Learning goals and outcomes</Label>
              <Textarea
                id="goals"
                placeholder="e.g., Be able to perform weekly maintenance, understand safety procedures, troubleshoot common issues..."
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                className="h-24 resize-none"
              />
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>📚 Step 4 of 5:</strong> What do users already know?
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="existingKnowledge">Existing knowledge level</Label>
              <Input
                id="existingKnowledge"
                placeholder="e.g., Complete beginner, basic understanding, experienced..."
                value={formData.existingKnowledge}
                onChange={(e) => setFormData({ ...formData, existingKnowledge: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>🔍 Step 5 of 5:</strong> Any specific areas to focus on?
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specificAreas">Specific topics or areas (optional)</Label>
              <Textarea
                id="specificAreas"
                placeholder="e.g., Chemical balancing, equipment troubleshooting, seasonal maintenance..."
                value={formData.specificAreas}
                onChange={(e) => setFormData({ ...formData, specificAreas: e.target.value })}
                className="h-24 resize-none"
              />
            </div>
          </div>
        );
      
      case 6:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Manual Created!</h3>
            <p className="text-slate-600">Your procedure manual has been generated successfully.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg">
          <Sparkles className="w-4 h-4" />
          AI Step Builder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI-Guided Procedure Builder
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Progress Indicator */}
          {step < 6 && (
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      s === step
                        ? 'bg-blue-600 text-white'
                        : s < step
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {s < step ? '✓' : s}
                  </div>
                ))}
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${((step - 1) / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          {renderStep()}

          {/* Navigation Buttons */}
          {step < 6 && (
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              {step < 5 ? (
                <Button
                  onClick={handleNext}
                  disabled={!formData[Object.keys(formData)[step - 1]]?.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Manual
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}