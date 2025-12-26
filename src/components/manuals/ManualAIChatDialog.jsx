import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Loader2, Send, Check, X, Bot, User, Plus } from 'lucide-react';

export default function ManualAIChatDialog({ manualId, manual, sections, onApplyChanges }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [pendingAdditions, setPendingAdditions] = useState(null);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      const currentSections = sections.map((s, idx) => ({
        id: s.id,
        order: idx,
        title: s.title,
        content: s.content,
        section_type: s.section_type
      }));

      const prompt = `You are an AI assistant helping to edit and improve an onboarding manual.

Manual Title: ${manual?.title || 'Untitled'}
Manual Description: ${manual?.description || 'No description'}

Current Sections:
${JSON.stringify(currentSections, null, 2)}

User Request: ${userMessage}

IMPORTANT RULES:
- All measurements must be in metric units (metres, centimetres, kilograms, litres, Celsius)
- Use Australian English spelling (colour, organisation, metre, etc.)
- Maintain professional quality
- If the user asks a question, answer it helpfully
- If the user requests changes to existing sections, provide modified_sections
- If the user asks to ADD new content/steps/procedures, provide new_sections to add

Respond with either:
1. A helpful answer if it's a question
2. Modified sections if changes to existing content are requested (has_changes: true, modified_sections)
3. New sections to add if user wants to add content (has_additions: true, new_sections)

Always explain what you're doing or suggesting.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            response_text: { type: "string" },
            has_changes: { type: "boolean" },
            has_additions: { type: "boolean" },
            modified_sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  section_type: { type: "string" }
                },
                required: ["title", "content", "section_type"]
              }
            },
            new_sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  section_type: { type: "string" }
                },
                required: ["title", "content", "section_type"]
              }
            }
          },
          required: ["response_text"]
        }
      });

      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: result.response_text,
        hasChanges: result.has_changes,
        hasAdditions: result.has_additions
      }]);

      if (result.has_changes && result.modified_sections) {
        setPendingChanges(result.modified_sections);
      }
      
      if (result.has_additions && result.new_sections) {
        setPendingAdditions(result.new_sections);
      }
    } catch (error) {
      console.error('Error:', error);
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!pendingChanges) return;

    setIsProcessing(true);
    try {
      // FIRST: Save backup of current state before any changes
      const backupData = sections.map(s => ({
        title: s.title,
        content: s.content,
        section_type: s.section_type,
        order: s.order
      }));
      
      await base44.entities.ManualVersion.create({
        manual_id: manualId,
        version_type: 'manual_snapshot',
        snapshot_data: { sections: backupData },
        change_description: 'Backup before AI Chat changes'
      });

      // Prepare new sections data
      const newSectionsData = pendingChanges.map((section, index) => ({
        manual_id: manualId,
        title: section.title,
        content: section.content,
        section_type: section.section_type || 'step',
        order: index
      }));

      // Create new sections FIRST
      await base44.entities.ManualSection.bulkCreate(newSectionsData);

      // Only delete old sections AFTER new ones are created successfully
      for (const section of sections) {
        await base44.entities.ManualSection.delete(section.id);
      }

      // Save version of new state
      await base44.entities.ManualVersion.create({
        manual_id: manualId,
        version_type: 'manual_snapshot',
        snapshot_data: { sections: newSectionsData },
        change_description: 'Changes applied via AI Chat'
      });

      setPendingChanges(null);
      setConversation(prev => [...prev, { 
        role: 'system', 
        content: '✅ Changes applied successfully!' 
      }]);
      
      onApplyChanges();
    } catch (error) {
      console.error('Error applying changes:', error);
      alert('Failed to apply changes. Your original content is preserved.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSections = async () => {
    if (!pendingAdditions) return;

    setIsProcessing(true);
    try {
      // Get current max order
      const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order || 0)) : -1;
      
      // Create new sections at the end
      const newSections = pendingAdditions.map((section, index) => ({
        manual_id: manualId,
        title: section.title,
        content: section.content,
        section_type: section.section_type || 'step',
        order: maxOrder + 1 + index
      }));

      await base44.entities.ManualSection.bulkCreate(newSections);

      // Save version
      await base44.entities.ManualVersion.create({
        manual_id: manualId,
        version_type: 'manual_snapshot',
        snapshot_data: { sections: newSections },
        change_description: `Added ${newSections.length} new sections via AI Chat`
      });

      setPendingAdditions(null);
      setConversation(prev => [...prev, { 
        role: 'system', 
        content: `✅ ${newSections.length} new sections added successfully!` 
      }]);
      
      onApplyChanges();
    } catch (error) {
      console.error('Error adding sections:', error);
      alert('Failed to add sections.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setConversation([]);
    setPendingChanges(null);
    setPendingAdditions(null);
    setMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <MessageCircle className="w-4 h-4" />
          AI Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            Chat with AI about your Manual
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {conversation.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">Ask me anything about your manual</p>
                <p className="text-sm mt-1">I can help edit, improve, reorganise, or answer questions</p>
              </div>
            )}
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-purple-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.role === 'system'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                </div>
                <div className="bg-slate-100 rounded-xl px-4 py-3">
                  <p className="text-sm text-slate-500">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {pendingChanges && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-amber-900">
              <strong>Changes ready</strong> - {pendingChanges.length} sections will be modified
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleApplyChanges}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPendingChanges(null)}
              >
                <X className="w-4 h-4 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {pendingAdditions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-blue-900">
              <strong>New sections ready</strong> - {pendingAdditions.length} sections will be added
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddSections}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPendingAdditions(null)}
              >
                <X className="w-4 h-4 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Textarea
            placeholder="Ask a question or describe changes you want..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[60px] resize-none"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isProcessing}
            className="h-auto bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}