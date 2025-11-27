import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, BookOpen, FileText, Edit, Trash2, Eye, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Manuals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newManual, setNewManual] = useState({
    title: '',
    description: '',
    cover_color: '#1e40af',
    status: 'draft'
  });

  const queryClient = useQueryClient();

  const { data: manuals = [], isLoading } = useQuery({
    queryKey: ['manuals'],
    queryFn: () => base44.entities.Manual.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Manual.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['manuals']);
      setIsCreateOpen(false);
      setNewManual({ title: '', description: '', cover_color: '#1e40af', status: 'draft' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Manual.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['manuals']);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Manual.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['manuals']);
    }
  });

  const handleCreate = () => {
    if (newManual.title.trim()) {
      createMutation.mutate(newManual);
    }
  };

  const colors = [
    { name: 'Deep Blue', value: '#1e40af' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Amber', value: '#d97706' },
    { name: 'Slate', value: '#475569' }
  ];

  const filteredManuals = manuals.filter(manual => 
    manual.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (manual.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Procedures & Documentation</h1>
              <p className="text-base sm:text-lg text-slate-600">Create step-by-step guides and how-to manuals</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 h-12 px-6 w-full sm:w-auto">
                  <Plus className="w-5 h-5 mr-2" />
                  New Procedure
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Create New Procedure</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">Procedure Title</Label>
                                              <Input
                                                id="title"
                                                placeholder="e.g., Water Chemistry Guide, Equipment Setup..."
                      value={newManual.title}
                      onChange={(e) => setNewManual({ ...newManual, title: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                                              <Textarea
                                                id="description"
                                                placeholder="What does this procedure cover..."
                      value={newManual.description}
                      onChange={(e) => setNewManual({ ...newManual, description: e.target.value })}
                      className="h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cover Color</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {colors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setNewManual({ ...newManual, cover_color: color.value })}
                          className={`h-10 rounded-lg transition-all ${
                            newManual.cover_color === color.value
                              ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={!newManual.title.trim() || createMutation.isPending}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Procedure'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search Bar */}
          {manuals.length > 0 && (
            <div className="mt-6 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search procedures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white border-slate-200 focus:border-blue-400"
              />
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {manuals.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-2xl font-bold text-slate-900">{manuals.length}</div>
              <div className="text-sm text-slate-600">Total Procedures</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-2xl font-bold text-emerald-600">{manuals.filter(m => m.status === 'published').length}</div>
              <div className="text-sm text-slate-600">Published</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 col-span-2 sm:col-span-1">
              <div className="text-2xl font-bold text-amber-600">{manuals.filter(m => m.status === 'draft').length}</div>
              <div className="text-sm text-slate-600">Drafts</div>
            </div>
          </div>
        )}

        {/* Manuals Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
                <CardContent className="pt-6 space-y-3">
                  <div className="h-5 bg-slate-200 rounded-full w-3/4 animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded-full w-full animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : manuals.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300 bg-white/50">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">Create Your First Procedure</h3>
              <p className="text-slate-600 mb-8 text-center max-w-md">
                Build step-by-step guides, how-to manuals, and standard operating procedures with AI assistance.
              </p>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8"
              >
                <Plus className="w-5 h-5 mr-2" />
                Get Started
              </Button>
            </CardContent>
          </Card>
        ) : filteredManuals.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300 bg-white/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No results found</h3>
              <p className="text-slate-600 text-center">Try a different search term</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredManuals.map((manual) => (
              <Card
                key={manual.id}
                className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-white border-0 shadow-lg"
              >
                <Link to={createPageUrl('ManualEditor') + `?id=${manual.id}`}>
                  <div
                    className="h-28 sm:h-32 relative flex items-center justify-center cursor-pointer group-hover:brightness-105 transition-all"
                    style={{ backgroundColor: manual.cover_color }}
                  >
                    <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-white/90" />
                    <Badge
                      className={`absolute top-3 right-3 ${
                        manual.status === 'published'
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : 'bg-slate-500 hover:bg-slate-600'
                      }`}
                    >
                      {manual.status === 'published' ? '✓ Published' : 'Draft'}
                    </Badge>
                  </div>
                </Link>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg sm:text-xl line-clamp-1">{manual.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-sm">
                    {manual.description || 'No description added'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Primary Actions */}
                  <div className="flex gap-2">
                    <Link to={createPageUrl('ManualEditor') + `?id=${manual.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 h-10"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Link to={createPageUrl('ManualView') + `?id=${manual.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-10"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Secondary Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-sm ${manual.status === 'draft' ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'}`}
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: manual.id,
                              status: manual.status === 'draft' ? 'published' : 'draft'
                            })
                          }
                        >
                          <FileText className="w-4 h-4 mr-1.5" />
                          {manual.status === 'draft' ? 'Publish' : 'Unpublish'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {manual.status === 'draft' ? 'Mark as ready for use' : 'Move back to draft'}
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                          onClick={() => {
                            if (confirm('Delete this procedure? This cannot be undone.')) {
                              deleteMutation.mutate(manual.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete procedure</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}