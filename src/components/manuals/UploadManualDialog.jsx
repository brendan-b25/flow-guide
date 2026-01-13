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
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [failedFiles, setFailedFiles] = useState([]);
  const progressIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      setStatus('');
      setProgress(0);
      setCountdown(0);
      setCurrentFileIndex(0);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, idx) => idx !== indexToRemove));
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
    if (files.length === 0) return;

    // Clear any existing intervals
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setIsProcessing(true);
    setProgress(0);
    setCurrentFileIndex(0);
    setFailedFiles([]);
    
    const allSections = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIndex(i);
      setStatus(`Processing file ${i + 1} of ${files.length}: ${file.name}...`);
      setProgress((i / files.length) * 100);

      // Detect file type and estimate processing time
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isLargeFile = file.size > 10 * 1024 * 1024; // 10MB
    
      // Estimate time based on file type (in seconds)
      let estimatedSeconds = 30;
      if (isVideo) estimatedSeconds = 90;
      else if (isAudio) estimatedSeconds = 60;
      else if (isLargeFile) estimatedSeconds = 45;

      const timeoutMs = estimatedSeconds * 3 * 1000;
      let timeoutId = null;
      let timedOut = false;

      setEstimatedTime(estimatedSeconds);
      setCountdown(estimatedSeconds);

      try {
      // Set up timeout
      timeoutId = setTimeout(() => {
        timedOut = true;
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        throw new Error('TIMEOUT');
      }, timeoutMs);

      // Upload file
      setProgress(10);
      const uploadStart = Date.now();
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const uploadTime = (Date.now() - uploadStart) / 1000;
      
      if (timedOut) return;
      
      setProgress(25);
      setStatus(isVideo || isAudio ? 'Transcribing and analyzing...' : 'Analyzing content with AI...');
      
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

      // Adjust remaining time based on actual upload speed
      const adjustedTime = Math.max(estimatedSeconds - uploadTime, 15);
      
      // Progress simulation that matches countdown
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + (60 / adjustedTime), 85);
          return newProgress;
        });
      }, 1000);

      // Optimized AI prompt with image extraction
      const prompt = `Analyze this ${isVideo ? 'video' : isAudio ? 'audio' : 'document'} and create 5-8 actionable procedure sections. 

IMPORTANT: If the document contains any images, photos, diagrams, or visual content:
1. Extract the image URLs from the document
2. Include them in the relevant section's images array
3. Reference the images in the content with descriptions like "See image" or "Refer to diagram"

Each section needs:
- title: Clear, descriptive title
- content: Detailed markdown content with step-by-step instructions
- section_type: introduction/step/tip/warning/conclusion
- images: Array of image URLs from the document (if any exist in that section)

Use metric units, Australian English. Focus on key steps and preserve all visual content.`;

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
                  },
                  images: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["title", "content", "section_type"]
              }
            }
          },
          required: ["sections"]
        }
      });

        if (timedOut) continue;

        // Clear timeout and intervals
        if (timeoutId) clearTimeout(timeoutId);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        setCountdown(0);

        // Store sections with images
        if (result.sections && result.sections.length > 0) {
          allSections.push(...result.sections.map((section) => ({
            title: section.title,
            content: section.content,
            section_type: section.section_type,
            images: section.images || []
          })));
        }
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        
        console.error(`Error processing file ${file.name}:`, error);
        
        let errorReason = 'Unknown error';
        if (error.message === 'TIMEOUT') {
          errorReason = 'Processing timed out - file may be too large or complex';
        } else if (error.message?.includes('format')) {
          errorReason = 'Unsupported file format';
        } else if (error.message?.includes('size')) {
          errorReason = 'File too large';
        } else {
          errorReason = error.message || 'Processing failed';
        }
        
        setFailedFiles(prev => [...prev, { name: file.name, reason: errorReason }]);
      }
    }

    // Create all sections
    try {
      setStatus('Creating manual sections...');
      setProgress(95);

      if (allSections.length > 0) {
        const sectionsToCreate = allSections.map((section, index) => ({
          manual_id: manualId,
          title: section.title,
          content: section.content,
          section_type: section.section_type,
          images: section.images || [],
          order: index
        }));

        await base44.entities.ManualSection.bulkCreate(sectionsToCreate);

        await base44.entities.ManualVersion.create({
          manual_id: manualId,
          version_type: 'manual_snapshot',
          snapshot_data: { sections: sectionsToCreate },
          change_description: `Sections created from ${files.length} uploaded file(s)`
        });

        setProgress(100);
        setStatus('success');
        
        setTimeout(() => {
          onSectionsCreated();
          setIsOpen(false);
          setFiles([]);
          setStatus('');
          setProgress(0);
          setCountdown(0);
          setFailedFiles([]);
        }, 1500);
      } else {
        throw new Error('NO_SECTIONS');
      }
    } catch (error) {
      console.error('Error creating sections:', error);
      let errorMessage = 'Failed to create sections. Please try again.';
      
      if (error.message === 'NO_SECTIONS') {
        errorMessage = 'No content could be extracted from the files.';
      }
      
      setStatus('error');
      setProgress(0);
      alert(`❌ ${errorMessage}`);
      setIsProcessing(false);
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
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,video/*,audio/*"
                className="hidden"
                multiple
              />
              <label htmlFor="file" className="cursor-pointer">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                {files.length > 0 ? (
                  <div>
                    <p className="font-medium text-slate-900">{files.length} file(s) selected</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-900">Click to upload</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Multiple files supported
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg p-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{f.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

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

          {failedFiles.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-900">
                ⚠️ {failedFiles.length} file(s) failed to process:
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {failedFiles.map((f, idx) => (
                  <div key={idx} className="text-xs text-amber-800 bg-amber-100 rounded px-2 py-1">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-amber-700">{f.reason}</div>
                  </div>
                ))}
              </div>
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
            disabled={files.length === 0 || isProcessing}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing {files.length} file(s)...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload & Process {files.length > 0 && `(${files.length})`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}