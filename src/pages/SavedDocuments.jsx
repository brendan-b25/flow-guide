import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Copy, Edit2, Trash2, Download, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function SavedDocuments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, item: null, type: null });
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: cheatSheets = [] } = useQuery({
    queryKey: ['cheat-sheets'],
    queryFn: () => base44.entities.CheatSheet.list('-created_date')
  });

  const { data: docTemplates = [] } = useQuery({
    queryKey: ['doc-templates'],
    queryFn: () => base44.entities.DocumentTemplate.list('-created_date')
  });

  const deleteCheatSheetMutation = useMutation({
    mutationFn: (id) => base44.entities.CheatSheet.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['cheat-sheets'])
  });

  const deleteDocTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['doc-templates'])
  });

  const copyCheatSheet = async (sheet) => {
    try {
      await base44.entities.CheatSheet.create({
        title: `${sheet.title} (Copy)`,
        category: sheet.category,
        products: sheet.products,
        content: sheet.content
      });
      queryClient.invalidateQueries(['cheat-sheets']);
      alert('✅ Cheat sheet copied!');
    } catch (error) {
      alert('Failed to copy cheat sheet');
    }
  };

  const copyDocTemplate = async (doc) => {
    try {
      await base44.entities.DocumentTemplate.create({
        title: `${doc.title} (Copy)`,
        description: doc.description,
        category: doc.category,
        content: doc.content,
        tags: doc.tags
      });
      queryClient.invalidateQueries(['doc-templates']);
      alert('✅ Document template copied!');
    } catch (error) {
      alert('Failed to copy document template');
    }
  };

  const openEditDialog = (item, type) => {
    setEditDialog({ open: true, item, type });
    setEditPrompt('');
  };

  const handleAIEdit = async () => {
    if (!editPrompt.trim() || !editDialog.item) return;

    setIsEditing(true);
    try {
      const isCheatSheet = editDialog.type === 'cheatsheet';
      const content = editDialog.item.content;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Edit this ${isCheatSheet ? 'cheat sheet' : 'document template'} based on the request: "${editPrompt}"

Current content:
${JSON.stringify(content, null, 2)}

Generate an improved version with the same structure. Keep it professional and practical. Use Australian English.`,
        response_json_schema: isCheatSheet ? {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  type: { type: "string" }
                }
              }
            }
          }
        } : {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  content: { type: "string" },
                  type: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (isCheatSheet) {
        await base44.entities.CheatSheet.update(editDialog.item.id, {
          title: result.title,
          content: result
        });
        queryClient.invalidateQueries(['cheat-sheets']);
      } else {
        await base44.entities.DocumentTemplate.update(editDialog.item.id, {
          title: result.title,
          content: result
        });
        queryClient.invalidateQueries(['doc-templates']);
      }

      setEditDialog({ open: false, item: null, type: null });
      alert('✅ Updated successfully!');
    } catch (error) {
      console.error('Edit error:', error);
      alert('Failed to edit. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const filteredCheatSheets = cheatSheets.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocTemplates = docTemplates.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCheatSheetCard = (sheet) => (
    <Card key={sheet.id} className="group hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{sheet.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">Cheat Sheet</Badge>
              {sheet.products && sheet.products.length > 0 && (
                <span className="text-xs text-slate-500 truncate">
                  {sheet.products.length} product{sheet.products.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <FileText className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(createPageUrl('CheatSheetGenerator'))}>
                <Edit2 className="w-3 h-3 mr-2" />
                Open in Editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(sheet, 'cheatsheet')}>
                <RefreshCw className="w-3 h-3 mr-2" />
                AI Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyCheatSheet(sheet)}>
                <Copy className="w-3 h-3 mr-2" />
                Make a Copy
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (confirm('Delete this cheat sheet?')) {
                    deleteCheatSheetMutation.mutate(sheet.id);
                  }
                }}
                className="text-red-600"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {sheet.content?.summary && (
          <p className="text-sm text-slate-600 line-clamp-2">{sheet.content.summary}</p>
        )}
      </CardContent>
    </Card>
  );

  const renderDocTemplateCard = (doc) => (
    <Card key={doc.id} className="group hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{doc.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">Document</Badge>
              {doc.category && doc.category !== 'other' && (
                <Badge variant="secondary" className="text-xs capitalize">{doc.category}</Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <FileText className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(createPageUrl('DocumentGenerator'))}>
                <Edit2 className="w-3 h-3 mr-2" />
                Open in Editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(doc, 'document')}>
                <RefreshCw className="w-3 h-3 mr-2" />
                AI Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyDocTemplate(doc)}>
                <Copy className="w-3 h-3 mr-2" />
                Make a Copy
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (confirm('Delete this template?')) {
                    deleteDocTemplateMutation.mutate(doc.id);
                  }
                }}
                className="text-red-600"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {doc.description && (
          <p className="text-sm text-slate-600 line-clamp-2">{doc.description}</p>
        )}
      </CardContent>
    </Card>
  );

  const totalItems = cheatSheets.length + docTemplates.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
            Saved Documents
          </h1>
          <p className="text-base sm:text-lg text-slate-600">
            All your cheat sheets and document templates in one place
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white border-slate-200"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All ({totalItems})</TabsTrigger>
            <TabsTrigger value="cheatsheets">Cheat Sheets ({cheatSheets.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({docTemplates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {totalItems === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No saved documents yet</p>
                  <p className="text-sm text-slate-500 mt-2">Create cheat sheets or documents to see them here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCheatSheets.map(renderCheatSheetCard)}
                {filteredDocTemplates.map(renderDocTemplateCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cheatsheets">
            {filteredCheatSheets.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    {cheatSheets.length === 0 ? 'No cheat sheets saved' : 'No results found'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCheatSheets.map(renderCheatSheetCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents">
            {filteredDocTemplates.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    {docTemplates.length === 0 ? 'No document templates saved' : 'No results found'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocTemplates.map(renderDocTemplateCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, item: null, type: null })}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                AI Edit {editDialog.type === 'cheatsheet' ? 'Cheat Sheet' : 'Document'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {editDialog.item && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded p-3">
                  Editing: <span className="font-medium">{editDialog.item.title}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>What changes do you want?</Label>
                <Textarea
                  placeholder="e.g., Add more details, simplify language, reorganize sections..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <Button
                onClick={handleAIEdit}
                disabled={!editPrompt.trim() || isEditing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isEditing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Apply Changes
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}