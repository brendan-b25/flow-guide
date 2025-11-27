import React, { useState, useMemo, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, BookOpen, FileText, Edit, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';

export default function Manuals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3">Procedures & Documentation</h1>
                                  <p className="text-lg text-slate-600">Create step-by-step guides, how-to manuals, and standard operating procedures</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 h-12 px-6">
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
        </div>

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
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No procedures yet</h3>
                                  <p className="text-slate-600 mb-6 text-center max-w-sm">
                                    Create your first procedure or how-to guide by clicking the button above
                                  </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manuals.map((manual) => (
              <Card
                key={manual.id}
                className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-white border-0 shadow-lg"
              >
                <div
                  className="h-32 relative flex items-center justify-center"
                  style={{ backgroundColor: manual.cover_color }}
                >
                  <BookOpen className="w-12 h-12 text-white/90" />
                  <Badge
                    className={`absolute top-3 right-3 ${
                      manual.status === 'published'
                        ? 'bg-emerald-500'
                        : 'bg-slate-500'
                    }`}
                  >
                    {manual.status}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl line-clamp-1">{manual.title}</CardTitle>
                  <CardDescription className="line-clamp-2 h-10">
                    {manual.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Link to={createPageUrl('ManualEditor') + `?id=${manual.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Link to={createPageUrl('ManualView') + `?id=${manual.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-slate-600 hover:text-blue-600"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: manual.id,
                          status: manual.status === 'draft' ? 'published' : 'draft'
                        })
                      }
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {manual.status === 'draft' ? 'Publish' : 'Unpublish'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Delete this manual? This cannot be undone.')) {
                          deleteMutation.mutate(manual.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}