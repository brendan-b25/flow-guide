import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import AIStepBuilder from '../components/manuals/AIStepBuilder';
import BrandingDialog from '../components/manuals/BrandingDialog';
import StyleToneDialog from '../components/manuals/StyleToneDialog';

export default function ManualEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const manualId = urlParams.get('id');

  const [sections, setSections] = useState([]);
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const queryClient = useQueryClient();
  const pendingUpdates = useRef({});
  const titleTimeoutRef = useRef(null);
  const descTimeoutRef = useRef(null);

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

  const updateManualMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Manual.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['manual', manualId]);
    }
  });

  const handleStyleToneChange = ({ tone, style }) => {
    updateManualMutation.mutate({
      id: manualId,
      data: { tone, style }
    });
  };

  const handleTitleChange = (value) => {
    setLocalTitle(value);
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      updateManualMutation.mutate({ id: manualId, data: { title: value } });
    }, 800);
  };

  const handleDescriptionChange = (value) => {
    setLocalDescription(value);
    if (descTimeoutRef.current) clearTimeout(descTimeoutRef.current);
    descTimeoutRef.current = setTimeout(() => {
      updateManualMutation.mutate({ id: manualId, data: { description: value } });
    }, 800);
  };

  useEffect(() => {
    setSections(sectionsData);
  }, [sectionsData]);

  useEffect(() => {
    if (manual) {
      setLocalTitle(manual.title);
      setLocalDescription(manual.description || '');
    }
  }, [manual]);

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

  const addSection = useCallback(() => {
    const newSection = {
      manual_id: manualId,
      title: '',
      content: '',
      order: sections.length,
      section_type: 'step'
    };
    createSectionMutation.mutate(newSection);
  }, [manualId, sections.length, createSectionMutation]);

  const updateSection = useCallback((id, updates) => {
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
    }, 1500); // Increased debounce for better performance
  }, [updateSectionMutation]);

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

  const deleteSection = useCallback((id) => {
    deleteSectionMutation.mutate(id);
  }, [deleteSectionMutation]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state with new order values
    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setSections(updatedItems);

    // Update orders in database
    const updatePromises = updatedItems.map((item, index) => 
      base44.entities.ManualSection.update(item.id, { order: index })
    );
    
    await Promise.all(updatePromises);

    // Create a snapshot after reordering
    await base44.entities.ManualVersion.create({
      manual_id: manualId,
      version_type: 'manual_snapshot',
      snapshot_data: {
        sections: updatedItems.map(s => ({
          title: s.title,
          content: s.content,
          section_type: s.section_type,
          order: s.order
        }))
      },
      change_description: 'Sections reordered'
    });

    queryClient.invalidateQueries(['versions', manualId]);
  };

  if (!manual) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading manual...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
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
              <div className="flex-1">
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-3xl font-bold text-slate-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 -ml-2 w-full"
                  placeholder="Procedure Title"
                />
                <input
                  type="text"
                  value={localDescription}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="text-slate-600 mt-1 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 -ml-2 w-full"
                  placeholder="Add description..."
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <StyleToneDialog 
                currentTone={manual?.tone}
                currentStyle={manual?.style}
                onApply={handleStyleToneChange}
              />
              <BrandingDialog manualId={manualId} />
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
                    Use AI-powered tools to generate comprehensive sections, upload existing documents, 
                    or build your procedure manually from scratch.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <AIStepBuilder 
                      manualId={manualId} 
                      onComplete={handleSectionsGenerated}
                    />
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
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={addSection}
            variant="outline"
            className="flex-1 min-w-[200px] h-14 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all group"
            disabled={createSectionMutation.isPending}
          >
            <Plus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Add Section
          </Button>
          {sections.length > 0 && (
            <div className="flex gap-2">
              <AIStepBuilder 
                manualId={manualId} 
                onComplete={handleSectionsGenerated}
              />
              <AIGenerateDialog 
                manualId={manualId} 
                onSectionsGenerated={handleSectionsGenerated}
              />
              <UploadManualDialog
                manualId={manualId}
                onSectionsCreated={handleSectionsGenerated}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}