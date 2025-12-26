import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, FileText, CheckCircle2, Clock } from 'lucide-react';

export default function UploadManualDialog({ manualId, onSectionsCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const progressIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('');
      setProgress(0);
      setCountdown(0);
    }
  };

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    // Clear any existing intervals
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setIsProcessing(true);
    setProgress(0);
    setStatus('Uploading file...');

    // Detect file type and estimate processing time
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isLargeFile = file.size > 10 * 1024 * 1024; // 10MB
    
    // Estimate time based on file type (in seconds)
    let estimatedSeconds = 30; // Base time for documents
    if (isVideo) estimatedSeconds = 90;
    else if (isAudio) estimatedSeconds = 60;
    else if (isLargeFile) estimatedSeconds = 45;

    setEstimatedTime(estimatedSeconds);
    setCountdown(estimatedSeconds);

    try {
      // Upload file
      setProgress(10);
      const uploadStart = Date.now();
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const uploadTime = (Date.now() - uploadStart) / 1000;
      
      setProgress(25);
      setStatus(isVideo || isAudio ? 'Transcribing and analyzing...' : 'Analyzing content with AI...');
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);

      // Adjust remaining time based on actual upload speed
      const adjustedTime = Math.max(estimatedSeconds - uploadTime, 15);
      
      // Progress simulation that matches countdown
      let currentProgress = 25;
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + (60 / adjustedTime), 85);
          currentProgress = newProgress;
          return newProgress;
        });
      }, 1000);

      // Optimized AI prompt
      const prompt = `Analyze this ${isVideo ? 'video' : isAudio ? 'audio' : 'document'} and create 5-8 actionable procedure sections. Each needs: title, markdown content, section_type (introduction/step/tip/warning/conclusion). Use metric units, Australian English. Focus on key steps only.`;

      const aiStart = Date.now();
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

      const aiTime = (Date.now() - aiStart) / 1000;
      console.log(`AI processing completed in ${aiTime.toFixed(1)}s`);

      // Clear intervals
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      setProgress(90);
      setCountdown(3);
      setStatus('Creating manual sections...');

      // Create sections
      if (result.sections && result.sections.length > 0) {
        const sectionsToCreate = result.sections.map((section, index) => ({
          manual_id: manualId,
          title: section.title,
          content: section.content,
          section_type: section.section_type,
          order: index
        }));

        await base44.entities.ManualSection.bulkCreate(sectionsToCreate);

        await base44.entities.ManualVersion.create({
          manual_id: manualId,
          version_type: 'manual_snapshot',
          snapshot_data: { sections: sectionsToCreate },
          change_description: `Sections created from uploaded ${isVideo ? 'video' : isAudio ? 'audio' : 'file'}: ${file.name}`
        });

        setProgress(100);
        setCountdown(0);
        setStatus('success');
        
        setTimeout(() => {
          onSectionsCreated();
          setIsOpen(false);
          setFile(null);
          setStatus('');
          setProgress(0);
          setCountdown(0);
        }, 1500);
      }
    } catch (error) {
      // Clean up intervals on error
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      console.error('Error processing file:', error);
      setStatus('error');
      setProgress(0);
      setCountdown(0);
      alert(`Failed to process ${file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document'}. Please try again.`);
    } finally {
      setIsProcessing(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Upload Manual Document
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label htmlFor="file" className="text-sm font-medium">
              Select Document
            </Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,video/*,audio/*"
                className="hidden"
              />
              <label htmlFor="file" className="cursor-pointer">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
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
                    <p className="text-sm text-slate-500 mt-1">
                      Documents, Videos, or Audio
                    </p>
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
              <p className="text-sm text-green-900 font-medium">Sections created successfully!</p>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-5 h-5 text-red-600 flex-shrink-0">✕</div>
              <p className="text-sm text-red-900 font-medium">Processing failed. Please try again.</p>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-700">
              <strong>📄 AI will:</strong> Analyze your document, extract all relevant content, 
              and automatically create organized manual sections with appropriate formatting.
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}