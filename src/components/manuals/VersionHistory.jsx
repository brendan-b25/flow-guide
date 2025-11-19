import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, RotateCcw, Clock, User, FileText, Trash2, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function VersionHistory({ manualId, onRestore }) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState(null);

  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['versions', manualId],
    queryFn: () => base44.entities.ManualVersion.filter({ manual_id: manualId }, '-created_date'),
    enabled: isOpen && !!manualId
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const handleRestore = async (version) => {
    setVersionToRestore(version);
    setIsRestoreDialogOpen(true);
  };

  const confirmRestore = async () => {
    if (!versionToRestore) return;

    try {
      const snapshot = versionToRestore.snapshot_data;

      if (versionToRestore.section_id) {
        // Restore individual section
        await base44.entities.ManualSection.update(versionToRestore.section_id, {
          title: snapshot.title,
          content: snapshot.content,
          section_type: snapshot.section_type,
          order: snapshot.order
        });

        // Create a new version entry for the restore action
        await base44.entities.ManualVersion.create({
          manual_id: manualId,
          section_id: versionToRestore.section_id,
          version_type: 'section_update',
          snapshot_data: snapshot,
          change_description: `Restored to version from ${format(new Date(versionToRestore.created_date), 'MMM d, yyyy h:mm a')}`
        });
      } else {
        // Restore full manual snapshot - restore all sections
        const sectionsSnapshot = snapshot.sections;
        
        // Get current sections
        const currentSections = await base44.entities.ManualSection.filter({ manual_id: manualId });
        
        // Delete all current sections
        for (const section of currentSections) {
          await base44.entities.ManualSection.delete(section.id);
        }

        // Recreate sections from snapshot
        for (const sectionData of sectionsSnapshot) {
          await base44.entities.ManualSection.create({
            manual_id: manualId,
            title: sectionData.title,
            content: sectionData.content,
            section_type: sectionData.section_type,
            order: sectionData.order
          });
        }

        // Create version entry for full restore
        await base44.entities.ManualVersion.create({
          manual_id: manualId,
          version_type: 'manual_snapshot',
          snapshot_data: snapshot,
          change_description: `Full manual restored to version from ${format(new Date(versionToRestore.created_date), 'MMM d, yyyy h:mm a')}`
        });
      }

      queryClient.invalidateQueries(['sections', manualId]);
      queryClient.invalidateQueries(['versions', manualId]);
      
      if (onRestore) onRestore();
      
      setIsRestoreDialogOpen(false);
      setVersionToRestore(null);
      setIsOpen(false);
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version. Please try again.');
    }
  };

  const versionTypeConfig = {
    section_update: { icon: Edit, color: 'bg-blue-100 text-blue-700', label: 'Updated' },
    section_create: { icon: Plus, color: 'bg-green-100 text-green-700', label: 'Created' },
    section_delete: { icon: Trash2, color: 'bg-red-100 text-red-700', label: 'Deleted' },
    manual_snapshot: { icon: FileText, color: 'bg-purple-100 text-purple-700', label: 'Snapshot' }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2">
            <History className="w-4 h-4" />
            Version History
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <History className="w-6 h-6" />
              Version History
            </SheetTitle>
            <SheetDescription>
              View and restore previous versions of your manual
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-24" />
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No version history yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Changes will be tracked automatically
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {versions.map((version) => {
                  const config = versionTypeConfig[version.version_type];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={version.id}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${config.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className={config.color}>
                                {config.label}
                              </Badge>
                              {version.section_id && (
                                <span className="text-sm font-medium text-slate-700">
                                  {version.snapshot_data.title || 'Section'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(version.created_date), 'MMM d, yyyy h:mm a')}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {version.created_by}
                              </div>
                            </div>
                            {version.change_description && (
                              <p className="text-sm text-slate-600 mt-2">
                                {version.change_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewVersion(version)}
                          className="flex-1"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version)}
                          className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Version Preview</DialogTitle>
            <DialogDescription>
              {previewVersion && format(new Date(previewVersion.created_date), 'MMM d, yyyy h:mm a')}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4">
            {previewVersion && (
              <div className="space-y-4">
                {previewVersion.section_id ? (
                  // Single section preview
                  <div className="bg-slate-50 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">
                      {previewVersion.snapshot_data.title}
                    </h3>
                    <Badge className="mb-4">
                      {previewVersion.snapshot_data.section_type}
                    </Badge>
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-slate-700">
                        {previewVersion.snapshot_data.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Full manual snapshot preview
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Full Manual Snapshot ({previewVersion.snapshot_data.sections?.length || 0} sections)
                    </h3>
                    {previewVersion.snapshot_data.sections?.map((section, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-slate-500">#{idx + 1}</span>
                          <h4 className="font-semibold text-slate-900">{section.title}</h4>
                          <Badge variant="secondary" className="ml-auto">
                            {section.section_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-3">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version?</DialogTitle>
            <DialogDescription>
              {versionToRestore?.section_id
                ? 'This will restore the selected section to this version. Current content will be replaced.'
                : 'This will restore the entire manual to this version. All current sections will be replaced.'}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <p className="text-sm text-amber-900">
              <strong>⚠️ Warning:</strong> This action will create a new version entry, 
              so you can always revert back if needed.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRestoreDialogOpen(false);
                setVersionToRestore(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmRestore} className="bg-blue-600 hover:bg-blue-700">
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}