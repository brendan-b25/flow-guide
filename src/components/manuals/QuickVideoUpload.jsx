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
    const estimatedSeconds = isVideo ? 90 : isAudio ? 60 : 45;
    
    // Timeout: 3x the estimated time
    const timeoutMs = estimatedSeconds * 3 * 1000;
    let timeoutId = null;
    let timedOut = false;

    try {
      // Set up timeout
      timeoutId = setTimeout(() => {
        timedOut = true;
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        throw new Error('TIMEOUT');
      }, timeoutMs);

      // Create manual first
      const manual = await base44.entities.Manual.create({
        title: title.trim(),
        description: `Generated from ${file.name}`,
        status: 'draft'
      });

      if (timedOut) return;

      setProgress(10);
      setStatus('Uploading video...');
      setCountdown(estimatedSeconds);

      const uploadStart = Date.now();
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const uploadTime = (Date.now() - uploadStart) / 1000;

      if (timedOut) return;

      setProgress(25);
      setStatus(isVideo || isAudio ? 'Transcribing and analyzing...' : 'Analyzing content...');

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

      const adjustedTime = Math.max(estimatedSeconds - uploadTime, 15);
      
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => Math.min(prev + (60 / adjustedTime), 85));
      }, 1000);

      const prompt = `Analyze this ${isVideo ? 'video' : isAudio ? 'audio' : 'document'} and create 5-8 actionable procedure sections. Each needs: title, markdown content, section_type (introduction/step/tip/warning/conclusion). Use metric units, Australian English. Focus on key steps only.`;

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

      if (timedOut) return;

      // Clear timeout and intervals
      if (timeoutId) clearTimeout(timeoutId);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      setProgress(90);
      setCountdown(0);
      setStatus('Creating sections...');

      if (result.sections && result.sections.length > 0) {
        const sectionsToCreate = result.sections.map((section, index) => ({
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
      // Clean up
      if (timeoutId) clearTimeout(timeoutId);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      console.error('Error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message === 'TIMEOUT') {
        errorMessage = `Processing timeout - ${isVideo ? 'video' : isAudio ? 'audio' : 'file'} took too long. Try a shorter file or check your connection.`;
      } else if (error.message === 'NO_SECTIONS') {
        errorMessage = 'AI could not extract content from the file. Please ensure the file contains clear spoken content or text.';
      } else if (error.message?.includes('upload')) {
        errorMessage = 'File upload failed. Check your internet connection and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error - please check your internet connection and try again.';
      }
      
      setStatus('error');
      setProgress(0);
      setCountdown(0);
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      if (timeoutId) clearTimeout(timeoutId);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 h-12 px-6">
          <Video className="w-5 h-5 mr-2" />
          From Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                    </span>
                  </div>
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

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-700">
              <strong>🎥 AI will:</strong> Analyze your video, transcribe content, and create a complete procedure with organized sections automatically.
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