import { useState, useEffect } from 'react';
import { Brain, Sparkles, Zap, Code, FileText, BarChart3, MessageSquare, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

// AI Model configurations
export const AI_MODELS = {
  'gpt-4': {
    name: 'GPT-4',
    provider: 'OpenAI',
    icon: Brain,
    color: 'from-green-500 to-emerald-600',
    description: 'Most capable model for complex reasoning',
    strengths: ['Complex reasoning', 'Code generation', 'Analysis'],
    speed: 'Medium',
    quality: 'Excellent'
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    icon: Zap,
    color: 'from-blue-500 to-cyan-600',
    description: 'Fast and efficient for most tasks',
    strengths: ['Quick responses', 'General tasks', 'Cost-effective'],
    speed: 'Fast',
    quality: 'Good'
  },
  'claude-3-opus': {
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    description: 'Advanced reasoning and creative tasks',
    strengths: ['Creative writing', 'Analysis', 'Long context'],
    speed: 'Medium',
    quality: 'Excellent'
  },
  'claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    icon: MessageSquare,
    color: 'from-indigo-500 to-purple-600',
    description: 'Balance of speed and capability',
    strengths: ['Balanced performance', 'Versatile', 'Efficient'],
    speed: 'Fast',
    quality: 'Very Good'
  },
  'gemini-pro': {
    name: 'Gemini Pro',
    provider: 'Google',
    icon: Brain,
    color: 'from-orange-500 to-red-600',
    description: 'Google\'s advanced multimodal AI',
    strengths: ['Multimodal', 'Analysis', 'Research'],
    speed: 'Fast',
    quality: 'Very Good'
  }
};

// Task-based AI routing
export const TASK_MODES = {
  'general': {
    name: 'General Assistant',
    icon: MessageSquare,
    description: 'General purpose conversations and tasks',
    recommendedModel: 'gpt-3.5-turbo',
    color: 'from-blue-500 to-cyan-500'
  },
  'code': {
    name: 'Code Expert',
    icon: Code,
    description: 'Code generation, debugging, and technical tasks',
    recommendedModel: 'gpt-4',
    color: 'from-green-500 to-emerald-500'
  },
  'writing': {
    name: 'Writing Assistant',
    icon: FileText,
    description: 'Document creation, editing, and creative writing',
    recommendedModel: 'claude-3-opus',
    color: 'from-purple-500 to-pink-500'
  },
  'analysis': {
    name: 'Data Analyst',
    icon: BarChart3,
    description: 'Data analysis, research, and insights',
    recommendedModel: 'claude-3-sonnet',
    color: 'from-orange-500 to-red-500'
  }
};

export default function AIAgentSelector({ onModelChange, onModeChange, onSettingsChange }) {
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('selectedAIModel') || 'gpt-3.5-turbo';
  });
  const [selectedMode, setSelectedMode] = useState(() => {
    return localStorage.getItem('selectedAIMode') || 'general';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('aiSettings');
    return saved ? JSON.parse(saved) : {
      temperature: 0.7,
      maxTokens: 2000,
      streamResponse: true,
      autoSuggest: true
    };
  });

  useEffect(() => {
    localStorage.setItem('selectedAIModel', selectedModel);
    onModelChange?.(selectedModel);
  }, [selectedModel, onModelChange]);

  useEffect(() => {
    localStorage.setItem('selectedAIMode', selectedMode);
    // Auto-switch to recommended model for the mode
    const recommendedModel = TASK_MODES[selectedMode]?.recommendedModel;
    if (recommendedModel) {
      setSelectedModel(recommendedModel);
    }
    onModeChange?.(selectedMode);
  }, [selectedMode, onModeChange]);

  useEffect(() => {
    localStorage.setItem('aiSettings', JSON.stringify(settings));
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const currentModel = AI_MODELS[selectedModel];
  const currentMode = TASK_MODES[selectedMode];
  const ModelIcon = currentModel?.icon || Brain;
  const ModeIcon = currentMode?.icon || MessageSquare;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Task Mode Selector */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 bg-gradient-to-br ${currentMode?.color || 'from-blue-500 to-cyan-500'} rounded-lg flex items-center justify-center`}>
          <ModeIcon className="w-4 h-4 text-white" />
        </div>
        <Select value={selectedMode} onValueChange={setSelectedMode}>
          <SelectTrigger className="w-[180px] border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TASK_MODES).map(([key, mode]) => {
              const Icon = mode.icon;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{mode.name}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Model Selector */}
      <div className="flex items-center gap-2">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[160px] border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AI_MODELS).map(([key, model]) => {
              const Icon = model.icon;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-slate-500">{model.provider}</span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">
          {currentModel?.speed}
        </Badge>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Current Model Info */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 bg-gradient-to-br ${currentModel?.color} rounded-lg flex items-center justify-center`}>
                  <ModelIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{currentModel?.name}</h3>
                  <p className="text-xs text-slate-500">{currentModel?.provider}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">{currentModel?.description}</p>
              <div className="flex flex-wrap gap-1">
                {currentModel?.strengths.map(strength => (
                  <Badge key={strength} variant="secondary" className="text-xs">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Temperature: {settings.temperature}</Label>
                <span className="text-xs text-slate-500">
                  {settings.temperature < 0.3 ? 'Precise' : settings.temperature > 0.7 ? 'Creative' : 'Balanced'}
                </span>
              </div>
              <Slider
                value={[settings.temperature]}
                onValueChange={([value]) => setSettings({ ...settings, temperature: value })}
                min={0}
                max={1}
                step={0.1}
              />
              <p className="text-xs text-slate-500">
                Lower values are more focused, higher values are more creative
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Max Response Length: {settings.maxTokens}</Label>
              </div>
              <Slider
                value={[settings.maxTokens]}
                onValueChange={([value]) => setSettings({ ...settings, maxTokens: value })}
                min={500}
                max={4000}
                step={100}
              />
              <p className="text-xs text-slate-500">
                Maximum length of AI responses
              </p>
            </div>

            {/* Stream Response */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Stream Responses</Label>
                <p className="text-xs text-slate-500">
                  Show responses as they're generated
                </p>
              </div>
              <Switch
                checked={settings.streamResponse}
                onCheckedChange={(checked) => setSettings({ ...settings, streamResponse: checked })}
              />
            </div>

            {/* Auto Suggest */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Suggestions</Label>
                <p className="text-xs text-slate-500">
                  Get smart prompt suggestions
                </p>
              </div>
              <Switch
                checked={settings.autoSuggest}
                onCheckedChange={(checked) => setSettings({ ...settings, autoSuggest: checked })}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
