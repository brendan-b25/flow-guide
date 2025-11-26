import React, { useState, useMemo, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search } from 'lucide-react';

const symbolCategories = {
  'Common': ['✓', '✗', '→', '←', '↑', '↓', '•', '○', '●', '■', '□', '▲', '△', '★', '☆', '♦', '◆'],
  'Alerts': ['⚠️', '⛔', '🚫', '❌', '✅', '❗', '❓', '💡', '🔔', '📌', '🎯', '⚡', '🔥', '💥'],
  'Documents': ['📄', '📋', '📝', '📑', '📂', '📁', '🗂️', '📊', '📈', '📉', '📆', '🗓️', '📎', '🔗'],
  'People': ['👤', '👥', '🙋', '💼', '🤝', '👍', '👎', '✋', '👋', '🖐️', '✍️', '🧑‍💼', '👨‍💻', '👩‍💻'],
  'Actions': ['🔧', '⚙️', '🔨', '🔩', '🛠️', '📐', '📏', '🔍', '🔎', '💾', '🖨️', '📤', '📥', '🔄'],
  'Status': ['🟢', '🟡', '🔴', '🔵', '⚪', '⚫', '🟠', '🟣', '🟤', '✨', '💫', '⭐', '🌟', '🏆'],
  'Numbers': ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '❶', '❷', '❸', '❹', '❺', '❻']
};

const SymbolPicker = memo(function SymbolPicker({ onInsert, isModal, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Common');

  const filteredSymbols = useMemo(() => {
    if (searchQuery) {
      return Object.values(symbolCategories).flat();
    }
    return symbolCategories[activeCategory] || [];
  }, [searchQuery, activeCategory]);

  const handleSelect = useCallback((symbol) => {
    onInsert(symbol);
    if (onClose) onClose();
  }, [onInsert, onClose]);

  if (isModal) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Insert Symbol</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {!searchQuery && (
            <div className="flex flex-wrap gap-1">
              {Object.keys(symbolCategories).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                    activeCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1">
            {filteredSymbols.map((symbol, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(symbol)}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-slate-100 rounded-lg transition-colors active:scale-95"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
});

export default SymbolPicker;