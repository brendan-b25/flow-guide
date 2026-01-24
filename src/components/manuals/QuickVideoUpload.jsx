import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Loader2, CheckCircle2, Clock } from 'lucide-react';

export default function QuickVideoUpload({ onProcedureCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const progressIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleCreate = async () => {
    if (!file || !title.trim()) return;

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setIsProcessing(true);
    setProgress(0);
    setStatus('Creating procedure...');

    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const fileSizeMB = file.size / 1024 / 1024;
    
    // Dynamic timeout based on file size - support for 1+ hour videos
    let estimatedSeconds = 60;
    if (isVideo) {
      if (fileSizeMB > 500) estimatedSeconds = 900; // 15 min for very large videos (1+ hours)
      else if (fileSizeMB > 300) estimatedSeconds = 720; // 12 min
      else if (fileSizeMB > 200) estimatedSeconds = 600; // 10 min
      else if (fileSizeMB > 100) estimatedSeconds = 420; // 7 min
      else if (fileSizeMB > 50) estimatedSeconds = 240; // 4 min
      else estimatedSeconds = 150; // 2.5 min
    } else if (isAudio) {
      if (fileSizeMB > 100) estimatedSeconds = 480; // 8 min for long audio
      else if (fileSizeMB > 50) estimatedSeconds = 300; // 5 min
      else if (fileSizeMB > 20) estimatedSeconds = 180; // 3 min
      else estimatedSeconds = 120; // 2 min
    }
    
    // Generous timeout: 5x estimated time (min 10 minutes for large files, up to 30 min for huge files)
    const timeoutMs = Math.max(
      estimatedSeconds * 5 * 1000, 
      fileSizeMB > 300 ? 1800000 : // 30 min for 300MB+
      fileSizeMB > 100 ? 1200000 : // 20 min for 100MB+
      fileSizeMB > 50 ? 600000 : // 10 min for 50MB+
      300000 // 5 min minimum
    );

    let timeoutId = null;

    try {

      // Create manual first
      const manual = await base44.entities.Manual.create({
        title: title.trim(),
        description: `Generated from ${file.name}`,
        status: 'draft'
      });

      setProgress(10);
      setStatus('Uploading file...');
      setCountdown(estimatedSeconds);

      const uploadStart = Date.now();
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const uploadTime = (Date.now() - uploadStart) / 1000;

      setProgress(25);
      setStatus(isVideo || isAudio ? 'Transcribing and analyzing...' : 'Analyzing content...');

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          const newVal = prev - 1;
          if (newVal <= 0) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return newVal;
        });
      }, 1000);

      // Start progress animation
      const adjustedTime = Math.max(estimatedSeconds - uploadTime, 15);
      const progressIncrement = 60 / adjustedTime; // Total 60% progress (from 25% to 85%)
      
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const next = prev + progressIncrement;
          return next >= 85 ? 85 : next;
        });
      }, 1000);

      const prompt = `Transcribe and analyze this ${isVideo ? 'video' : isAudio ? 'audio recording' : 'document'} thoroughly. This may be a long ${isVideo ? 'video' : 'recording'} (${fileSizeMB.toFixed(0)}MB) - extract ALL spoken instructions, demonstrations, and explanations from the entire duration.

Create 6-15 comprehensive procedure sections covering everything demonstrated. For each section provide:
- title: Clear, specific title
- content: Detailed markdown content with step-by-step instructions from the transcribed audio/video
- section_type: introduction/step/tip/warning/conclusion

IMPORTANT: 
- Transcribe all spoken content first, then structure it into logical sections
- Include all details mentioned in the audio/narration
- For videos, describe what's being shown AND what's being said
- Use metric units, Australian English
- Focus on actionable steps with complete details`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  section_type: {
                    type: "string",
                    enum: ["introduction", "step", "tip", "warning", "conclusion"]
                  }
                },
                required: ["title", "content", "section_type"]
              }
            }
          },
          required: ["sections"]
        }
      });

      // Clear intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      setProgress(90);
      setCountdown(0);
      setStatus('Creating sections...');

      // Defensive parsing: extract sections from multiple possible response shapes
      let sections = null;
      
      // Try result.sections first (direct)
      if (result.sections && Array.isArray(result.sections) && result.sections.length > 0) {
        sections = result.sections;
      }
      // Try result.output (string JSON)
      else if (result.output && typeof result.output === 'string') {
        try {
          const parsed = JSON.parse(result.output);
          if (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            sections = parsed.sections;
          }
        } catch (e) {
          console.warn('Failed to parse result.output as JSON:', e);
        }
      }
      // Try result.output (object)
      else if (result.output && typeof result.output === 'object' && result.output.sections) {
        if (Array.isArray(result.output.sections) && result.output.sections.length > 0) {
          sections = result.output.sections;
        }
      }

      if (sections && sections.length > 0) {
        const sectionsToCreate = sections.map((section, index) => ({
          manual_id: manual.id,
          title: section.title,
          content: section.content,
          section_type: section.section_type,
          order: index
        }));

        await base44.entities.ManualSection.bulkCreate(sectionsToCreate);

        await base44.entities.ManualVersion.create({
          manual_id: manual.id,
          version_type: 'manual_snapshot',
          snapshot_data: { sections: sectionsToCreate },
          change_description: `Procedure created from ${isVideo ? 'video' : isAudio ? 'audio' : 'file'}: ${file.name}`
        });

        setProgress(100);
        setStatus('success');
        
        setTimeout(() => {
          onProcedureCreated(manual.id);
          setIsOpen(false);
          setFile(null);
          setTitle('');
          setStatus('');
          setProgress(0);
          setCountdown(0);
        }, 1500);
      } else {
        throw new Error('NO_SECTIONS');
      }
    } catch (error) {
      // Clean up intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      console.error('Video upload error:', error);
      
      let errorMessage = 'Failed to create procedure. Please try again.';
      
      if (error.message === 'NO_SECTIONS') {
        errorMessage = 'AI could not extract content from the file. Ensure the file contains clear spoken audio or narration.';
      } else if (error.message?.includes('upload')) {
        errorMessage = 'File upload failed. Large files may take longer - check your connection and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error during processing. Check your internet connection.';
      } else if (error.message?.includes('size') || error.message?.includes('too large')) {
        errorMessage = 'File is too large. Compress the video or split into smaller parts.';
      } else {
        errorMessage = `Processing failed: ${error.message}. Please try again.`;
      }
      
      setStatus('error');
      setProgress(0);
      setCountdown(0);
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open && !isProcessing) {
        setFile(null);
        setTitle('');
        setStatus('');
        setProgress(0);
        setCountdown(0);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 h-12 px-6">
          <Video className="w-5 h-5 mr-2" />
          From Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => isProcessing && e.preventDefault()} onEscapeKeyDown={(e) => isProcessing && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            New Procedure from Video
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label htmlFor="proc-title" className="text-sm font-medium">
              Procedure Title
            </Label>
            <Input
              id="proc-title"
              placeholder="e.g., Pool Maintenance, Equipment Setup..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-file" className="text-sm font-medium">
              Select Video/Audio
            </Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Input
                id="video-file"
                type="file"
                onChange={handleFileChange}
                accept="video/*,audio/*"
                className="hidden"
              />
              <label htmlFor="video-file" className="cursor-pointer">
                <Video className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                {file ? (
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-900">Click to upload</p>
                    <p className="text-sm text-slate-500 mt-1">Video or Audio file</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {status && status !== 'success' && status !== 'error' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                  <p className="text-sm text-blue-900 font-medium">{status}</p>
                </div>
                {countdown > 0 && (
                  <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-sm font-mono text-blue-700">
                      ~{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}
                {file && (file.size / 1024 / 1024) > 200 && (
                  <span className="text-xs text-blue-600 font-medium">Large file - please wait</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-blue-700">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-900 font-medium">Procedure created successfully!</p>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-5 h-5 text-red-600 flex-shrink-0">✕</div>
              <p className="text-sm text-red-900 font-medium">Creation failed. Please try again.</p>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-slate-700">
              <strong>🎥 AI will:</strong> Transcribe all audio, analyze demonstrations, and create a complete procedure with detailed sections automatically.
            </p>
            <p className="text-xs text-slate-600">
              <strong>Long videos supported:</strong> 1+ hour videos up to 500MB. Processing time: ~5-20 minutes depending on length. Ensure clear audio for best results.
            </p>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!file || !title.trim() || isProcessing}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Video className="w-5 h-5 mr-2" />
                Create Procedure
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}