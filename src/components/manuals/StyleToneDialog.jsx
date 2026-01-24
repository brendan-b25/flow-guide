import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';

export default function StyleToneDialog({ currentTone, currentStyle, onApply }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tone, setTone] = useState(currentTone || 'professional');
  const [style, setStyle] = useState(currentStyle || 'structured');

  const tones = [
    { value: 'professional', label: 'Professional', desc: 'Formal and business-appropriate' },
    { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { value: 'technical', label: 'Technical', desc: 'Detailed and precise' },
    { value: 'casual', label: 'Casual', desc: 'Relaxed and conversational' },
    { value: 'formal', label: 'Formal', desc: 'Official and authoritative' }
  ];

  const styles = [
    { value: 'minimal', label: 'Minimal', desc: 'Clean and concise' },
    { value: 'detailed', label: 'Detailed', desc: 'Comprehensive with examples' },
    { value: 'visual', label: 'Visual', desc: 'Image and diagram focused' },
    { value: 'structured', label: 'Structured', desc: 'Step-by-step organized' }
  ];

  const handleApply = () => {
    onApply({ tone, style });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Style & Tone</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Document Style & Tone</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {/* Tone Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Writing Tone</Label>
            <div className="grid gap-2">
              {tones.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    tone === t.value 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{t.label}</div>
                  <div className="text-sm text-slate-600">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Document Style</Label>
            <div className="grid gap-2">
              {styles.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    style === s.value 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{s.label}</div>
                  <div className="text-sm text-slate-600">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleApply} className="w-full bg-blue-600 hover:bg-blue-700">
            Apply Style & Tone
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}