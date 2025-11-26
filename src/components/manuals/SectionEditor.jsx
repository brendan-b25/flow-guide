import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, GripVertical } from 'lucide-react';
import AIImproveButton from './AIImproveButton';
import AIChatButton from './AIChatButton';

const sectionTypeColors = {
  introduction: 'bg-blue-50 border-blue-200',
  step: 'bg-slate-50 border-slate-200',
  tip: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-amber-50 border-amber-200',
  conclusion: 'bg-purple-50 border-purple-200'
};

const sectionTypeIcons = {
  introduction: '📘',
  step: '📝',
  tip: '💡',
  warning: '⚠️',
  conclusion: '✅'
};

export default function SectionEditor({ 
  section, 
  provided, 
  snapshot, 
  onUpdate, 
  onDelete 
}) {
  const [localTitle, setLocalTitle] = useState(section.title);
  const [localContent, setLocalContent] = useState(section.content);
  const debounceRef = useRef(null);

  // Sync with external changes
  useEffect(() => {
    setLocalTitle(section.title);
    setLocalContent(section.content);
  }, [section.id]);

  const debouncedUpdate = (field, value) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdate(section.id, { [field]: value });
    }, 800);
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    setLocalTitle(value);
    debouncedUpdate('title', value);
  };

  const handleContentChange = (e) => {
    const value = e.target.value;
    setLocalContent(value);
    debouncedUpdate('content', value);
  };

  const handleTypeChange = (value) => {
    onUpdate(section.id, { section_type: value });
  };

  const handleImproved = (improvedContent) => {
    setLocalContent(improvedContent);
    onUpdate(section.id, { content: improvedContent });
  };

  return (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`${sectionTypeColors[section.section_type]} border-2 transition-all ${
        snapshot.isDragging ? 'shadow-2xl scale-105' : 'shadow-md'
      }`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div
            {...provided.dragHandleProps}
            className="mt-2 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl">
                {sectionTypeIcons[section.section_type]}
              </span>
              <Select
                value={section.section_type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="introduction">Introduction</SelectItem>
                  <SelectItem value="step">Step</SelectItem>
                  <SelectItem value="tip">Tip</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="conclusion">Conclusion</SelectItem>
                </SelectContent>
              </Select>
              <AIImproveButton
                section={{ ...section, content: localContent, title: localTitle }}
                onImproved={handleImproved}
              />
              <AIChatButton
                section={{ ...section, content: localContent, title: localTitle }}
                onApplyChanges={handleImproved}
              />
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-red-600 hover:bg-red-50"
                onClick={() => onDelete(section.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Section title..."
              value={localTitle}
              onChange={handleTitleChange}
              className="text-lg font-semibold bg-white"
            />
            <Textarea
              placeholder="Write your instructions here..."
              value={localContent}
              onChange={handleContentChange}
              className="min-h-32 bg-white"
            />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}