import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Loader2, CheckCircle, Plus } from 'lucide-react';

export default function CheatSheetAttachDialog({ manualId, onAttached }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSheets, setSelectedSheets] = useState([]);
  const queryClient = useQueryClient();

  const { data: cheatSheets = [] } = useQuery({
    queryKey: ['cheat-sheets'],
    queryFn: () => base44.entities.CheatSheet.list('-created_date'),
    enabled: open
  });

  const attachMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedSheets.map(async (sheetId) => {
        const sheet = cheatSheets.find(s => s.id === sheetId);
        if (!sheet) return;

        // Get existing sections to determine order
        const sections = await base44.entities.ManualSection.filter({ manual_id: manualId }, 'order');
        const nextOrder = sections.length;

        // Create section from cheat sheet content
        let content = `**${sheet.content?.summary || ''}**\n\n`;
        
        sheet.content?.sections?.forEach((section) => {
          content += `## ${section.heading}\n\n`;
          
          if (section.table && section.table.headers && section.table.rows) {
            content += '| ' + section.table.headers.join(' | ') + ' |\n';
            content += '| ' + section.table.headers.map(() => '---').join(' | ') + ' |\n';
            section.table.rows.forEach(row => {
              content += '| ' + row.join(' | ') + ' |\n';
            });
            content += '\n';
          }
          
          if (section.items?.length) {
            section.items.forEach(item => {
              content += `- ${item}\n`;
            });
            content += '\n';
          }
        });

        await base44.entities.ManualSection.create({
          manual_id: manualId,
          title: sheet.title,
          content: content,
          order: nextOrder,
          section_type: 'general'
        });
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', manualId]);
      setSelectedSheets([]);
      setOpen(false);
      if (onAttached) onAttached();
    }
  });

  const filteredSheets = cheatSheets.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id) => {
    setSelectedSheets(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
          <FileText className="w-4 h-4 mr-2" />
          Attach Cheat Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Attach Cheat Sheets to Procedure</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search cheat sheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredSheets.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {cheatSheets.length === 0 ? 'No cheat sheets available' : 'No results found'}
              </div>
            ) : (
              filteredSheets.map(sheet => (
                <Card 
                  key={sheet.id}
                  className={`cursor-pointer transition-all ${
                    selectedSheets.includes(sheet.id)
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleSelection(sheet.id)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSheets.includes(sheet.id)}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{sheet.title}</h4>
                      {sheet.content?.summary && (
                        <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                          {sheet.content.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Cheat Sheet</Badge>
                        {sheet.products && sheet.products.length > 0 && (
                          <span className="text-xs text-slate-500">
                            {sheet.products.length} product{sheet.products.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedSheets.includes(sheet.id) && (
                      <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-slate-600">
              {selectedSheets.length} sheet{selectedSheets.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSheets([]);
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => attachMutation.mutate()}
                disabled={selectedSheets.length === 0 || attachMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {attachMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Attaching...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Attach {selectedSheets.length > 0 ? `(${selectedSheets.length})` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}