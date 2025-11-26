import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Smile } from 'lucide-react';

const symbolCategories = {
  'Common': ['✓', '✗', '→', '←', '↑', '↓', '•', '○', '●', '■', '□', '▲', '△', '★', '☆', '♦', '◆'],
  'Alerts': ['⚠️', '⛔', '🚫', '❌', '✅', '❗', '❓', '💡', '🔔', '📌', '🎯', '⚡', '🔥', '💥'],
  'Documents': ['📄', '📋', '📝', '📑', '📂', '📁', '🗂️', '📊', '📈', '📉', '📆', '🗓️', '📎', '🔗'],
  'People': ['👤', '👥', '🙋', '💼', '🤝', '👍', '👎', '✋', '👋', '🖐️', '✍️', '🧑‍💼', '👨‍💻', '👩‍💻'],
  'Actions': ['🔧', '⚙️', '🔨', '🔩', '🛠️', '📐', '📏', '🔍', '🔎', '💾', '🖨️', '📤', '📥', '🔄'],
  'Status': ['🟢', '🟡', '🔴', '🔵', '⚪', '⚫', '🟠', '🟣', '🟤', '✨', '💫', '⭐', '🌟', '🏆'],
  'Time': ['⏰', '⏱️', '⏳', '⌛', '📅', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘'],
  'Numbers': ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⓪', '❶', '❷', '❸', '❹', '❺']
};

export default function SymbolPicker({ onInsert }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Common');

  const handleSelect = (symbol) => {
    onInsert(symbol);
    setIsOpen(false);
  };

  const filteredSymbols = searchQuery
    ? Object.values(symbolCategories).flat().filter(s => s.includes(searchQuery))
    : symbolCategories[activeCategory];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        >
          <Smile className="w-4 h-4 mr-1" />
          Symbols
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm text-slate-900 mb-2">
              Insert Symbol
            </h4>
            <Input
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {!searchQuery && (
            <div className="flex flex-wrap gap-1">
              {Object.keys(symbolCategories).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs px-2 py-1 rounded ${
                    activeCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
            {filteredSymbols.map((symbol, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(symbol)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 rounded transition-colors"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}