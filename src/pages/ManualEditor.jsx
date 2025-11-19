import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, ArrowLeft, Save, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ManualEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const manualId = urlParams.get('id');

  const [sections, setSections] = useState([]);
  const queryClient = useQueryClient();

  const { data: manual } = useQuery({
    queryKey: ['manual', manualId],
    queryFn: () => base44.entities.Manual.filter({ id: manualId }),
    enabled: !!manualId,
    select: (data) => data[0]
  });

  const { data: sectionsData = [], isLoading } = useQuery({
    queryKey: ['sections', manualId],
    queryFn: () => base44.entities.ManualSection.filter({ manual_id: manualId }, 'order'),
    enabled: !!manualId
  });

  useEffect(() => {
    setSections(sectionsData);
  }, [sectionsData]);

  const createSectionMutation = useMutation({
    mutationFn: (data) => base44.entities.ManualSection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', manualId]);
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ManualSection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', manualId]);
    }
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id) => base44.entities.ManualSection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', manualId]);
    }
  });

  const addSection = () => {
    const newSection = {
      manual_id: manualId,
      title: '',
      content: '',
      order: sections.length,
      section_type: 'step'
    };
    createSectionMutation.mutate(newSection);
  };

  const updateSection = (id, updates) => {
    updateSectionMutation.mutate({ id, data: updates });
  };

  const deleteSection = (id) => {
    if (confirm('Delete this section?')) {
      deleteSectionMutation.mutate(id);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSections(items);

    items.forEach((item, index) => {
      if (item.order !== index) {
        updateSectionMutation.mutate({ id: item.id, data: { order: index } });
      }
    });
  };

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

  if (!manual) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading manual...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Manuals')}>
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{manual.title}</h1>
              <p className="text-slate-600 mt-1">{manual.description}</p>
            </div>
          </div>
          <Link to={createPageUrl('ManualView') + `?id=${manualId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </Link>
        </div>

        {/* Sections */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4 mb-6"
              >
                {sections.map((section, index) => (
                  <Draggable key={section.id} draggableId={section.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${
                          sectionTypeColors[section.section_type]
                        } border-2 transition-all ${
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
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">
                                  {sectionTypeIcons[section.section_type]}
                                </span>
                                <Select
                                  value={section.section_type}
                                  onValueChange={(value) =>
                                    updateSection(section.id, { section_type: value })
                                  }
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-auto text-red-600 hover:bg-red-50"
                                  onClick={() => deleteSection(section.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <Input
                                placeholder="Section title..."
                                value={section.title}
                                onChange={(e) =>
                                  updateSection(section.id, { title: e.target.value })
                                }
                                className="text-lg font-semibold bg-white"
                              />
                              <Textarea
                                placeholder="Write your instructions here..."
                                value={section.content}
                                onChange={(e) =>
                                  updateSection(section.id, { content: e.target.value })
                                }
                                className="min-h-32 bg-white"
                              />
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add Section Button */}
        <Button
          onClick={addSection}
          variant="outline"
          className="w-full h-16 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all"
          disabled={createSectionMutation.isPending}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Section
        </Button>
      </div>
    </div>
  );
}