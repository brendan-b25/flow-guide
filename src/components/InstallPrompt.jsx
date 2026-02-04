import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Zap, Wifi, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { promptInstall, isAppInstalled } from '@/lib/pwa';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(isAppInstalled());

    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      if (!isAppInstalled()) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowPrompt(false);
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal for 7 days
    localStorage.setItem('installPromptDismissed', Date.now() + 7 * 24 * 60 * 60 * 1000);
  };

  // Don't show if already installed or dismissed recently
  if (isInstalled || !showPrompt) {
    return null;
  }

  const dismissedUntil = localStorage.getItem('installPromptDismissed');
  if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Card className="border-2 border-blue-500 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Install FlowGuide App</h3>
                <p className="text-xs text-slate-600">Get the full experience</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="flex flex-col items-center text-center p-2 bg-slate-50 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600 mb-1" />
              <span className="text-xs text-slate-700">Fast Access</span>
            </div>
            <div className="flex flex-col items-center text-center p-2 bg-slate-50 rounded-lg">
              <Wifi className="w-5 h-5 text-green-600 mb-1" />
              <span className="text-xs text-slate-700">Works Offline</span>
            </div>
            <div className="flex flex-col items-center text-center p-2 bg-slate-50 rounded-lg">
              <Bell className="w-5 h-5 text-purple-600 mb-1" />
              <span className="text-xs text-slate-700">Notifications</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            onClick={handleInstallClick}
          >
            <Download className="w-4 h-4 mr-2" />
            Install Now
          </Button>

          <p className="text-xs text-center text-slate-500 mt-2">
            Works on iPhone, iPad, and Android
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
