import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, FileText, Trash2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Templates() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.Template.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Template.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['templates'])
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const manual = await base44.entities.Manual.create({
        title: `${template.name} - Copy`,
        description: template.description,
        cover_color: template.cover_color,
        status: 'draft'
      });

      if (template.sections && template.sections.length > 0) {
        const sections = template.sections.map((s, idx) => ({
          manual_id: manual.id,
          title: s.title,
          content: s.content,
          section_type: s.section_type || 'step',
          order: idx
        }));
        await base44.entities.ManualSection.bulkCreate(sections);
      }

      return manual;
    },
    onSuccess: (manual) => {
      navigate(createPageUrl('ManualEditor') + `?id=${manual.id}`);
    }
  });

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'training', label: 'Training' },
    { value: 'safety', label: 'Safety' },
    { value: 'operations', label: 'Operations' },
    { value: 'hr', label: 'HR' },
    { value: 'technical', label: 'Technical' },
    { value: 'general', label: 'General' }
  ];

  const categoryColors = {
    training: 'bg-blue-100 text-blue-700',
    safety: 'bg-red-100 text-red-700',
    operations: 'bg-emerald-100 text-emerald-700',
    hr: 'bg-purple-100 text-purple-700',
    technical: 'bg-slate-100 text-slate-700',
    general: 'bg-amber-100 text-amber-700'
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
            Template Library
          </h1>
          <p className="text-base sm:text-lg text-slate-600">Jumpstart your documentation with pre-built templates</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
                className={selectedCategory === cat.value ? 'bg-blue-600' : ''}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No templates found</h3>
              <p className="text-slate-600 text-center">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="group hover:shadow-xl transition-all duration-300">
                <div 
                  className="h-24 flex items-center justify-center"
                  style={{ backgroundColor: template.cover_color }}
                >
                  <FileText className="w-12 h-12 text-white/90" />
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={categoryColors[template.category]}>
                      {template.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2 text-xs text-slate-600">
                    <span className="capitalize">Tone: {template.tone}</span>
                    <span>•</span>
                    <span className="capitalize">Style: {template.style}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => useTemplateMutation.mutate(template)}
                      disabled={useTemplateMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Use Template
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this template?')) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600"
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