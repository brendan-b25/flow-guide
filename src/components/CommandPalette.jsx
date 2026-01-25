import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  BookOpen,
  FileText,
  Sparkles,
  Home,
  Settings,
  Search,
  Clock,
  Star,
  Palette,
  Moon,
  Sun,
  Keyboard,
  Download,
  Upload,
  Plus,
  Edit,
  Trash,
  Copy,
  Save
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const NAVIGATION_ITEMS = [
  { name: 'Dashboard', icon: Home, page: 'Dashboard', category: 'Navigation' },
  { name: 'Procedures', icon: BookOpen, page: 'Manuals', category: 'Navigation' },
  { name: 'Templates', icon: FileText, page: 'Templates', category: 'Navigation' },
  { name: 'Documents', icon: FileText, page: 'DocumentGenerator', category: 'Navigation' },
  { name: 'Cheat Sheets', icon: FileText, page: 'CheatSheetGenerator', category: 'Navigation' },
  { name: 'Saved Documents', icon: Save, page: 'SavedDocuments', category: 'Navigation' },
  { name: 'AI Copilot', icon: Sparkles, page: 'Copilot', category: 'Navigation' },
];

const ACTION_ITEMS = [
  { name: 'Create New Document', icon: Plus, action: 'new-document', category: 'Actions' },
  { name: 'Create New Template', icon: Plus, action: 'new-template', category: 'Actions' },
  { name: 'Export Document', icon: Download, action: 'export', category: 'Actions' },
  { name: 'Import Document', icon: Upload, action: 'import', category: 'Actions' },
  { name: 'Toggle Theme', icon: Palette, action: 'toggle-theme', category: 'Settings' },
  { name: 'Keyboard Shortcuts', icon: Keyboard, action: 'shortcuts', category: 'Help' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [recentPages, setRecentPages] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Load recent pages and favorites from localStorage
  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentPages') || '[]');
    const favs = JSON.parse(localStorage.getItem('favoritePages') || '[]');
    setRecentPages(recent);
    setFavorites(favs);
  }, []);

  // Keyboard shortcut to open command palette
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback((callback) => {
    setOpen(false);
    callback();
  }, []);

  const navigateToPage = (page) => {
    // Add to recent pages
    const recent = JSON.parse(localStorage.getItem('recentPages') || '[]');
    const updated = [page, ...recent.filter(p => p !== page)].slice(0, 5);
    localStorage.setItem('recentPages', JSON.stringify(updated));
    setRecentPages(updated);

    navigate(createPageUrl(page));
  };

  const toggleFavorite = (page) => {
    const favs = JSON.parse(localStorage.getItem('favoritePages') || '[]');
    const updated = favs.includes(page)
      ? favs.filter(p => p !== page)
      : [...favs, page];
    localStorage.setItem('favoritePages', JSON.stringify(updated));
    setFavorites(updated);
  };

  const executeAction = (action) => {
    switch (action) {
      case 'toggle-theme':
        toggleTheme();
        break;
      case 'shortcuts':
        // Trigger keyboard shortcuts - will be handled by KeyboardShortcuts component
        const event = new KeyboardEvent('keydown', {
          key: '/',
          metaKey: true,
          bubbles: true
        });
        document.dispatchEvent(event);
        break;
      case 'new-document':
        navigate(createPageUrl('DocumentGenerator'));
        break;
      case 'new-template':
        navigate(createPageUrl('Templates'));
        break;
      default:
        console.log('Action:', action);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Quick search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-slate-300 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-600">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Recent Pages */}
          {recentPages.length > 0 && (
            <>
              <CommandGroup heading="Recent">
                {recentPages.map((page) => {
                  const item = NAVIGATION_ITEMS.find(i => i.page === page);
                  if (!item) return null;
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={page}
                      onSelect={() => handleSelect(() => navigateToPage(page))}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      <span>{item.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Favorites */}
          {favorites.length > 0 && (
            <>
              <CommandGroup heading="Favorites">
                {favorites.map((page) => {
                  const item = NAVIGATION_ITEMS.find(i => i.page === page);
                  if (!item) return null;
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={page}
                      onSelect={() => handleSelect(() => navigateToPage(page))}
                    >
                      <Star className="mr-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{item.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Navigation */}
          <CommandGroup heading="Navigation">
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const isFavorite = favorites.includes(item.page);
              return (
                <CommandItem
                  key={item.page}
                  onSelect={() => handleSelect(() => navigateToPage(item.page))}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                  {isFavorite && (
                    <Star className="ml-auto h-3 w-3 fill-yellow-400 text-yellow-400" />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Actions */}
          <CommandGroup heading="Actions">
            {ACTION_ITEMS.filter(item => item.category === 'Actions').map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.action}
                  onSelect={() => handleSelect(() => executeAction(item.action))}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Settings & Help */}
          <CommandGroup heading="Settings & Help">
            {ACTION_ITEMS.filter(item => item.category === 'Settings' || item.category === 'Help').map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.action}
                  onSelect={() => handleSelect(() => executeAction(item.action))}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
