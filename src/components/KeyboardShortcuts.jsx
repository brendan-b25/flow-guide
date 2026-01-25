import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard, Command } from 'lucide-react';

const shortcuts = [
  {
    category: 'Navigation',
    items: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['⌘', 'B'], description: 'Toggle sidebar' },
      { keys: ['⌘', 'H'], description: 'Go to home/dashboard' },
      { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
    ]
  },
  {
    category: 'Editing',
    items: [
      { keys: ['⌘', 'S'], description: 'Save document' },
      { keys: ['⌘', 'Z'], description: 'Undo' },
      { keys: ['⌘', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['⌘', 'C'], description: 'Copy' },
      { keys: ['⌘', 'V'], description: 'Paste' },
      { keys: ['⌘', 'X'], description: 'Cut' },
    ]
  },
  {
    category: 'AI Copilot',
    items: [
      { keys: ['⌘', 'Enter'], description: 'Send message' },
      { keys: ['Esc'], description: 'Clear input' },
      { keys: ['⌘', 'L'], description: 'Clear chat' },
      { keys: ['⌘', 'M'], description: 'Toggle voice input' },
    ]
  },
  {
    category: 'Documents',
    items: [
      { keys: ['⌘', 'N'], description: 'New document' },
      { keys: ['⌘', 'P'], description: 'Print/Export' },
      { keys: ['⌘', 'D'], description: 'Duplicate' },
      { keys: ['⌘', 'Delete'], description: 'Delete document' },
    ]
  }
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘/ or Ctrl+/ to open shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Keyboard className="w-4 h-4" />
        <span className="hidden sm:inline">Shortcuts</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Keyboard className="w-6 h-6 text-blue-600" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {shortcuts.map((category, idx) => (
              <div key={idx}>
                <h3 className="font-semibold text-slate-800 mb-3 text-lg">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-700">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-md shadow-sm">
                              {key}
                            </kbd>
                            {keyIdx < item.keys.length - 1 && (
                              <span className="text-slate-400 text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Command className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Pro Tip</h4>
                  <p className="text-sm text-blue-800">
                    Press <kbd className="px-1.5 py-0.5 text-xs bg-white border border-blue-300 rounded">⌘</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-white border border-blue-300 rounded">K</kbd> to quickly navigate anywhere in the app using the command palette.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
