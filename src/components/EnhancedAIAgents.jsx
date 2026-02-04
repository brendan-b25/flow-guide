import { useState, useEffect } from 'react';
import { 
  Mic, Camera, MapPin, Wifi, WifiOff, Image as ImageIcon, 
  FileText, Languages, Brain, Sparkles, Zap 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Enhanced AI Agents with Mobile Capabilities
export const MOBILE_AI_AGENTS = {
  'voice-assistant': {
    name: 'Voice Assistant',
    icon: Mic,
    color: 'from-blue-500 to-cyan-600',
    description: 'Voice-to-text AI for hands-free operation',
    capabilities: ['Speech recognition', 'Voice commands', 'Dictation'],
    offline: false,
    mobileOptimized: true
  },
  'vision-agent': {
    name: 'Vision AI',
    icon: Camera,
    color: 'from-purple-500 to-pink-600',
    description: 'Image recognition and document scanning',
    capabilities: ['OCR', 'Object detection', 'Document scanning'],
    offline: false,
    mobileOptimized: true
  },
  'location-agent': {
    name: 'Location AI',
    icon: MapPin,
    color: 'from-green-500 to-emerald-600',
    description: 'Location-aware AI assistant',
    capabilities: ['Location context', 'Local search', 'Maps integration'],
    offline: false,
    mobileOptimized: true
  },
  'offline-agent': {
    name: 'Offline AI',
    icon: WifiOff,
    color: 'from-orange-500 to-red-600',
    description: 'AI that works without internet',
    capabilities: ['Local processing', 'Cached responses', 'Basic tasks'],
    offline: true,
    mobileOptimized: true
  },
  'translation-agent': {
    name: 'Translation AI',
    icon: Languages,
    color: 'from-indigo-500 to-purple-600',
    description: 'Multi-language translation',
    capabilities: ['100+ languages', 'Real-time translation', 'Context-aware'],
    offline: false,
    mobileOptimized: true
  },
  'smart-capture': {
    name: 'Smart Capture',
    icon: ImageIcon,
    color: 'from-pink-500 to-rose-600',
    description: 'AI-powered photo and document capture',
    capabilities: ['Auto enhance', 'Smart crop', 'Text extraction'],
    offline: false,
    mobileOptimized: true
  }
};

export default function EnhancedAIAgents({ onAgentChange, onCapabilityUse }) {
  const [selectedAgent, setSelectedAgent] = useState(() => {
    return localStorage.getItem('selectedMobileAgent') || 'voice-assistant';
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [permissions, setPermissions] = useState({
    microphone: false,
    camera: false,
    location: false
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedMobileAgent', selectedAgent);
    onAgentChange?.(selectedAgent);
  }, [selectedAgent, onAgentChange]);

  const requestPermission = async (type) => {
    try {
      if (type === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissions(prev => ({ ...prev, microphone: true }));
        return true;
      } else if (type === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissions(prev => ({ ...prev, camera: true }));
        return true;
      } else if (type === 'location') {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        setPermissions(prev => ({ ...prev, location: true }));
        return true;
      }
    } catch (error) {
      console.error(`Permission denied for ${type}:`, error);
      return false;
    }
  };

  const currentAgent = MOBILE_AI_AGENTS[selectedAgent];
  const AgentIcon = currentAgent?.icon || Brain;

  // Check if agent requires permissions
  const requiresPermission = (agent) => {
    if (agent === 'voice-assistant') return !permissions.microphone;
    if (agent === 'vision-agent' || agent === 'smart-capture') return !permissions.camera;
    if (agent === 'location-agent') return !permissions.location;
    return false;
  };

  // Check if agent can work offline
  const canWorkOffline = currentAgent?.offline || false;
  const isAgentAvailable = isOnline || canWorkOffline;

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-green-600" />
            <span className="text-green-600">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-orange-600" />
            <span className="text-orange-600">Offline - Limited functionality</span>
          </>
        )}
      </div>

      {/* Agent Selector */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${currentAgent?.color} rounded-lg flex items-center justify-center`}>
          <AgentIcon className="w-5 h-5 text-white" />
        </div>
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-full max-w-xs border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MOBILE_AI_AGENTS).map(([key, agent]) => {
              const Icon = agent.icon;
              const needsPermission = requiresPermission(key);
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{agent.name}</span>
                    </div>
                    {needsPermission && (
                      <Badge variant="outline" className="text-xs">
                        Needs Permission
                      </Badge>
                    )}
                    {agent.offline && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        Offline
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Agent Info Card */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AgentIcon className="w-4 h-4" />
            {currentAgent?.name}
          </CardTitle>
          <CardDescription className="text-sm">
            {currentAgent?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Capabilities */}
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2">Capabilities:</h4>
              <div className="flex flex-wrap gap-1">
                {currentAgent?.capabilities.map(cap => (
                  <Badge key={cap} variant="outline" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-600">Status:</span>
              {isAgentAvailable ? (
                <Badge className="bg-green-100 text-green-700 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Requires Internet
                </Badge>
              )}
            </div>

            {/* Permission Request */}
            {requiresPermission(selectedAgent) && (
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  if (selectedAgent === 'voice-assistant') requestPermission('microphone');
                  else if (selectedAgent === 'vision-agent' || selectedAgent === 'smart-capture') requestPermission('camera');
                  else if (selectedAgent === 'location-agent') requestPermission('location');
                }}
              >
                Grant Permission
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {isAgentAvailable && !requiresPermission(selectedAgent) && (
        <div className="grid grid-cols-2 gap-2">
          {selectedAgent === 'voice-assistant' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onCapabilityUse?.('start-voice-input')}
              className="w-full"
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Listening
            </Button>
          )}
          {(selectedAgent === 'vision-agent' || selectedAgent === 'smart-capture') && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCapabilityUse?.('capture-photo')}
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCapabilityUse?.('scan-document')}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Scan Doc
              </Button>
            </>
          )}
          {selectedAgent === 'location-agent' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onCapabilityUse?.('get-location')}
              className="w-full col-span-2"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Use Current Location
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
