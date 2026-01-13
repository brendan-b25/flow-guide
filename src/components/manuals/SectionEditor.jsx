import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { GripVertical, Upload, X, Loader2 } from 'lucide-react';
import SectionToolbar from './SectionToolbar';
import AIImproveButton from './AIImproveButton';
import AIChatButton from './AIChatButton';
import AIIllustrationButton from './AIIllustrationButton';
import SymbolPicker from './SymbolPicker';

const sectionTypeConfig = {
  introduction: { color: 'bg-blue-50 border-blue-200 hover:border-blue-300', icon: '📘' },
  step: { color: 'bg-slate-50 border-slate-200 hover:border-slate-300', icon: '📝' },
  tip: { color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300', icon: '💡' },
  warning: { color: 'bg-amber-50 border-amber-200 hover:border-amber-300', icon: '⚠️' },
  conclusion: { color: 'bg-purple-50 border-purple-200 hover:border-purple-300', icon: '✅' }
};

const SectionEditor = memo(function SectionEditor({ 
  section, 
  provided, 
  snapshot, 
  onUpdate, 
  onDelete 
}) {
  const [localTitle, setLocalTitle] = useState(section.title);
  const [localContent, setLocalContent] = useState(section.content);
  const [showImprove, setShowImprove] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showIllustration, setShowIllustration] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [localImages, setLocalImages] = useState(section.images || []);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const debounceRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync with external changes - use a ref to track if user is actively editing
  const isEditingRef = useRef(false);
  
  useEffect(() => {
    // Only sync if user isn't actively editing (prevents glitches)
    if (!isEditingRef.current) {
      setLocalTitle(section.title);
      setLocalContent(section.content);
      setLocalImages(section.images || []);
    }
  }, [section.id]);
  
  // Reset editing flag when section changes
  useEffect(() => {
    isEditingRef.current = false;
  }, [section.id]);

  const debouncedUpdate = useCallback((updates) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdate(section.id, updates);
    }, 1200); // Increased debounce for better performance
  }, [section.id, onUpdate]);

  const handleTitleChange = useCallback((e) => {
    isEditingRef.current = true;
    const value = e.target.value;
    setLocalTitle(value);
    debouncedUpdate({ title: value });
  }, [debouncedUpdate]);

  const handleContentChange = useCallback((e) => {
    isEditingRef.current = true;
    const value = e.target.value;
    setLocalContent(value);
    debouncedUpdate({ content: value });
  }, [debouncedUpdate]);

  const handleTypeChange = useCallback((value) => {
    onUpdate(section.id, { section_type: value });
  }, [section.id, onUpdate]);

  const handleImproved = useCallback((improvedContent) => {
    setLocalContent(improvedContent);
    onUpdate(section.id, { content: improvedContent });
    setShowImprove(false);
    setShowChat(false);
    setShowIllustration(false);
  }, [section.id, onUpdate]);

  const handleSymbolInsert = useCallback((symbol) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart || localContent.length;
    const newContent = localContent.slice(0, start) + symbol + localContent.slice(start);
    setLocalContent(newContent);
    onUpdate(section.id, { content: newContent });
    setShowSymbols(false);
  }, [localContent, section.id, onUpdate]);

  const handleDelete = useCallback(() => {
    if (confirm('Delete this section?')) {
      onDelete(section.id);
    }
  }, [section.id, onDelete]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newImages = [...localImages, file_url];
      setLocalImages(newImages);
      onUpdate(section.id, { images: newImages });
    } catch (error) {
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    const newImages = localImages.filter((_, idx) => idx !== indexToRemove);
    setLocalImages(newImages);
    onUpdate(section.id, { images: newImages });
  };

  const config = sectionTypeConfig[section.section_type] || sectionTypeConfig.step;

  return (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`${config.color} border-2 transition-all duration-200 ${
        snapshot.isDragging ? 'shadow-2xl scale-[1.02] rotate-1' : 'shadow-sm hover:shadow-md'
      }`}
    >
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Drag Handle */}
          <div
            {...provided.dragHandleProps}
            className="mt-2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/5 transition-colors"
          >
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            {/* Header Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl flex-shrink-0">{config.icon}</span>
              
              <Select value={section.section_type} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-32 sm:w-36 h-8 text-sm bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="introduction">📘 Introduction</SelectItem>
                  <SelectItem value="step">📝 Step</SelectItem>
                  <SelectItem value="tip">💡 Tip</SelectItem>
                  <SelectItem value="warning">⚠️ Warning</SelectItem>
                  <SelectItem value="conclusion">✅ Conclusion</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <SectionToolbar
                onImprove={() => setShowImprove(true)}
                onRequestChanges={() => setShowChat(true)}
                onAddIllustration={() => setShowIllustration(true)}
                onSymbolPicker={() => setShowSymbols(true)}
                onDelete={handleDelete}
              />
            </div>

            {/* Title Input */}
            <Input
              placeholder="Section title..."
              value={localTitle}
              onChange={handleTitleChange}
              className="text-base sm:text-lg font-semibold bg-white/90 border-transparent focus:border-slate-300 transition-colors"
            />

            {/* Content Textarea */}
            <Textarea
              ref={textareaRef}
              placeholder="Write your instructions here... Use markdown for formatting."
              value={localContent}
              onChange={handleContentChange}
              className="min-h-28 sm:min-h-32 bg-white/90 border-transparent focus:border-slate-300 resize-y transition-colors text-sm sm:text-base"
            />

            {/* Section Images */}
            {localImages.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wider">Section Images</div>
                <div className="grid grid-cols-2 gap-2">
                  {localImages.map((imageUrl, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={imageUrl} 
                        alt={`Image ${idx + 1}`}
                        className="w-full h-24 object-cover rounded border border-slate-200"
                      />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Upload Button */}
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id={`image-upload-${section.id}`}
              />
              <label htmlFor={`image-upload-${section.id}`}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild 
                  disabled={isUploadingImage}
                  className="cursor-pointer"
                >
                  <span>
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-2" />
                        Add Image
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* AI Tool Modals - Rendered conditionally for performance */}
      {showImprove && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setShowImprove(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <AIImproveButton
              section={{ ...section, content: localContent, title: localTitle }}
              onImproved={handleImproved}
              isModal
              onClose={() => setShowImprove(false)}
            />
          </div>
        </div>
      )}

      {showChat && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setShowChat(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <AIChatButton
              section={{ ...section, content: localContent, title: localTitle }}
              onApplyChanges={handleImproved}
              isModal
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}

      {showIllustration && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setShowIllustration(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <AIIllustrationButton
              section={{ ...section, content: localContent, title: localTitle }}
              onImageGenerated={handleImproved}
              isModal
              onClose={() => setShowIllustration(false)}
            />
          </div>
        </div>
      )}

      {showSymbols && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setShowSymbols(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
            <SymbolPicker
              onInsert={handleSymbolInsert}
              isModal
              onClose={() => setShowSymbols(false)}
            />
          </div>
        </div>
      )}
    </Card>
  );
});

export default SectionEditor;