import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Send, Loader2, FileText, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Copilot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are FlowGuide Copilot, an AI assistant specialized in helping users create professional documentation, procedures, cheat sheets, and guides.

User question: ${userMessage}

Context: You're helping users in a documentation platform that includes:
- Procedures (step-by-step manuals with sections)
- Cheat Sheets (quick reference guides)
- Document Templates (forms, reports, etc.)
- Document Generation (AI-powered content creation)

Provide helpful, concise, and actionable advice. If the user asks how to do something in the app, explain the steps clearly. If they ask for documentation help, provide professional guidance.

Use Australian English. Be friendly but professional.`,
        add_context_from_internet: false
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      console.error('Copilot error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickPrompts = [
    "How do I create a new procedure?",
    "Help me write safety instructions",
    "What's the best way to format a checklist?",
    "How do I attach a cheat sheet to a procedure?",
  ];

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
                AI Copilot
              </h1>
              <p className="text-base sm:text-lg text-slate-600">
                Your documentation assistant
              </p>
            </div>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="text-slate-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Chat
              </Button>
            )}
          </div>
        </div>

        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            {/* Messages */}
            <div className="space-y-4 mb-6 min-h-[400px] max-h-[500px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Welcome to FlowGuide Copilot
                  </h3>
                  <p className="text-slate-600 max-w-md mb-6">
                    Ask me anything about creating documentation, procedures, or cheat sheets. I'm here to help!
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors text-sm text-slate-700"
                      >
                        <FileText className="w-4 h-4 inline-block mr-2 text-blue-600" />
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-slate-200'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        ) : (
                          <ReactMarkdown
                            className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                              code: ({ inline, children }) => (
                                inline ? (
                                  <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                                    {children}
                                  </code>
                                ) : (
                                  <code className="block p-2 rounded bg-slate-100 text-slate-700 text-xs">
                                    {children}
                                  </code>
                                )
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask me anything about documentation..."
                className="min-h-[60px] resize-none"
                disabled={isProcessing}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
                size="icon"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <h4 className="font-semibold text-slate-900 mb-2 text-sm">
            💡 What I can help with:
          </h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Creating and organizing procedures</li>
            <li>• Writing cheat sheets and quick reference guides</li>
            <li>• Formatting documentation professionally</li>
            <li>• Best practices for safety and technical writing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}