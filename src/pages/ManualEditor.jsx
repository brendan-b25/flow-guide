import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Eye, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AIGenerateDialog from '../components/manuals/AIGenerateDialog';
import VersionHistory from '../components/manuals/VersionHistory';
import UploadManualDialog from '../components/manuals/UploadManualDialog';
import SectionEditor from '../components/manuals/SectionEditor';
import AIRestructureDialog from '../components/manuals/AIRestructureDialog';
import StyleDialog from '../components/manuals/StyleDialog';
import ManualAIChatDialog from '../components/manuals/ManualAIChatDialog';

export default function ManualEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const manualId = urlParams.get('id');

  const [sections, setSections] = useState([]);
  const queryClient = useQueryClient();
  const pendingUpdates = useRef({});

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
    mutationFn: async (data) => {
      const newSection = await base44.entities.ManualSection.create(data);
      
      // Save version history for creation
      await base44.entities.ManualVersion.create({
        manual_id: manualId,
        section_id: newSection.id,
        version_type: 'section_create',
        snapshot_data: {
          title: data.title,
          content: data.content,
          section_type: data.section_type,
          order: data.order
        },
        change_description: 'Section created'
      });
      
      return newSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', manualId]);
      queryClient.invalidateQueries(['versions', manualId]);
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Get the section before updating to save version
      const currentSections = await base44.entities.ManualSection.filter({ id });
      const currentSection = currentSections[0];
      
      // Update the section
      await base44.entities.ManualSection.update(id, data);
      
      // Save version history
      await base44.entities.ManualVersion.create({
        manual_id: manualId,
        section_id: id,
        version_type: 'section_update',
        snapshot_data: {
          title: currentSection.title,
          content: currentSection.content,
          section_type: currentSection.section_type,
          order: currentSection.order
        },
        change_description: 'Section updated'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', manualId]);
      queryClient.invalidateQueries(['versions', manualId]);
    }
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id) => {
      // Get the section before deleting to save version
      const sectionsToDelete = await base44.entities.ManualSection.filter({ id });
      const sectionToDelete = sectionsToDelete[0];
      
      // Save version history for deletion
      await base44.entities.ManualVersion.create({
        manual_id: manualId,
        section_id: id,
        version_type: 'section_delete',
        snapshot_data: {
          title: sectionToDelete.title,
          content: sectionToDelete.content,
          section_type: sectionToDelete.section_type,
          order: sectionToDelete.order
        },
        change_description: 'Section deleted'
      });
      
      // Delete the section
      await base44.entities.ManualSection.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', manualId]);
      queryClient.invalidateQueries(['versions', manualId]);
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
    // Update local state immediately for responsive UI
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    
    // Batch updates to reduce API calls
    pendingUpdates.current[id] = { ...pendingUpdates.current[id], ...updates };
    
    // Debounce the actual mutation
    if (pendingUpdates.current[`${id}_timeout`]) {
      clearTimeout(pendingUpdates.current[`${id}_timeout`]);
    }
    pendingUpdates.current[`${id}_timeout`] = setTimeout(() => {
      const data = pendingUpdates.current[id];
      delete pendingUpdates.current[id];
      delete pendingUpdates.current[`${id}_timeout`];
      updateSectionMutation.mutate({ id, data });
    }, 1000);
  };

  const handleSectionsGenerated = async () => {
    queryClient.invalidateQueries(['sections', manualId]);
    
    // Create a full manual snapshot after AI generation
    const allSections = await base44.entities.ManualSection.filter({ manual_id: manualId }, 'order');
    await base44.entities.ManualVersion.create({
      manual_id: manualId,
      version_type: 'manual_snapshot',
      snapshot_data: {
        sections: allSections.map(s => ({
          title: s.title,
          content: s.content,
          section_type: s.section_type,
          order: s.order
        }))
      },
      change_description: 'Manual sections generated with AI'
    });
    
    queryClient.invalidateQueries(['versions', manualId]);
  };

  const deleteSection = (id) => {
    if (confirm('Delete this section?')) {
      deleteSectionMutation.mutate(id);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSections(items);

    // Update orders
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (item.order !== index) {
        await base44.entities.ManualSection.update(item.id, { order: index });
      }
    }

    // Create a snapshot after reordering
    await base44.entities.ManualVersion.create({
      manual_id: manualId,
      version_type: 'manual_snapshot',
      snapshot_data: {
        sections: items.map(s => ({
          title: s.title,
          content: s.content,
          section_type: s.section_type,
          order: s.order
        }))
      },
      change_description: 'Sections reordered'
    });

    queryClient.invalidateQueries(['sections', manualId]);
    queryClient.invalidateQueries(['versions', manualId]);
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
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
            <div className="flex gap-2 flex-wrap">
              <ManualAIChatDialog
                manualId={manualId}
                manual={manual}
                sections={sections}
                onApplyChanges={handleSectionsGenerated}
              />
              {sections.length > 0 && (
                <>
                  <AIRestructureDialog
                    manualId={manualId}
                    sections={sections}
                    onRestructured={handleSectionsGenerated}
                  />
                  <StyleDialog
                    manualId={manualId}
                    sections={sections}
                    onStyled={handleSectionsGenerated}
                  />
                </>
              )}
              <VersionHistory 
                manualId={manualId} 
                onRestore={() => {
                  queryClient.invalidateQueries(['sections', manualId]);
                }}
              />
              <Link to={createPageUrl('ManualView') + `?id=${manualId}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </Link>
            </div>
          </div>

          {/* AI Generation Section */}
          {sections.length === 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-slate-900">Start with AI</h3>
                  </div>
                  <p className="text-sm text-slate-700 mb-4">
                    Let AI generate comprehensive manual sections based on your topic, 
                    upload an existing document, or create sections manually from scratch.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <AIGenerateDialog 
                      manualId={manualId} 
                      onSectionsGenerated={handleSectionsGenerated}
                    />
                    <UploadManualDialog
                      manualId={manualId}
                      onSectionsCreated={handleSectionsGenerated}
                    />
                    <Button 
                      variant="outline" 
                      onClick={addSection}
                      className="border-slate-300"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manually
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                      <SectionEditor
                        section={section}
                        provided={provided}
                        snapshot={snapshot}
                        onUpdate={updateSection}
                        onDelete={deleteSection}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add Section Button */}
        <div className="flex gap-3">
          <Button
            onClick={addSection}
            variant="outline"
            className="flex-1 h-16 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all"
            disabled={createSectionMutation.isPending}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Section Manually
          </Button>
          {sections.length > 0 && (
            <>
              <AIGenerateDialog 
                manualId={manualId} 
                onSectionsGenerated={handleSectionsGenerated}
              />
              <UploadManualDialog
                manualId={manualId}
                onSectionsCreated={handleSectionsGenerated}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}