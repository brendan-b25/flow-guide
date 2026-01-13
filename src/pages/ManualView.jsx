import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Download, Sparkles, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import ReactMarkdown from 'react-markdown';

export default function ManualView() {
  const urlParams = new URLSearchParams(window.location.search);
  const manualId = urlParams.get('id');
  const [showSummaries, setShowSummaries] = React.useState(false);
  const [summaries, setSummaries] = React.useState({});
  const [isGeneratingSummaries, setIsGeneratingSummaries] = React.useState(false);

  const { data: manual } = useQuery({
    queryKey: ['manual', manualId],
    queryFn: () => base44.entities.Manual.filter({ id: manualId }),
    enabled: !!manualId,
    select: (data) => data[0]
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', manualId],
    queryFn: () => base44.entities.ManualSection.filter({ manual_id: manualId }, 'order'),
    enabled: !!manualId
  });

  const { data: branding } = useQuery({
    queryKey: ['branding', manualId],
    queryFn: async () => {
      const results = await base44.entities.ManualBranding.filter({ manual_id: manualId });
      return results[0] || null;
    },
    enabled: !!manualId
  });

  const sectionTypeStyles = {
    introduction: {
      bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
      border: 'border-l-4 border-blue-500',
      icon: '📘',
      label: 'Introduction',
      decoration: '◈'
    },
    step: {
      bg: 'bg-white',
      border: 'border-l-4 border-slate-400',
      icon: '📝',
      label: 'Step',
      decoration: '▸'
    },
    tip: {
      bg: 'bg-gradient-to-r from-emerald-50 to-emerald-100',
      border: 'border-l-4 border-emerald-500',
      icon: '💡',
      label: 'Tip',
      decoration: '✦'
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-50 to-amber-100',
      border: 'border-l-4 border-amber-500',
      icon: '⚠️',
      label: 'Warning',
      decoration: '◆'
    },
    conclusion: {
      bg: 'bg-gradient-to-r from-purple-50 to-purple-100',
      border: 'border-l-4 border-purple-500',
      icon: '✅',
      label: 'Conclusion',
      decoration: '★'
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Trigger browser print which can save as PDF
    window.print();
  };

  const fontFamilyMap = {
    inter: 'Inter, system-ui, sans-serif',
    roboto: 'Roboto, sans-serif',
    playfair: '"Playfair Display", serif',
    lato: 'Lato, sans-serif',
    merriweather: 'Merriweather, serif'
  };

  const handleGenerateSummaries = async () => {
    if (sections.length === 0) return;
    
    setIsGeneratingSummaries(true);
    try {
      const prompt = `Generate concise one-sentence summaries for each section of this manual. Each summary should capture the main point or action.

Sections:
${sections.map((s, idx) => `${idx + 1}. ${s.title}\n${s.content.substring(0, 300)}...\n`).join('\n')}

Return a summary for each section that is clear, actionable, and under 20 words.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summaries: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_index: { type: "number" },
                  summary: { type: "string" }
                },
                required: ["section_index", "summary"]
              }
            }
          },
          required: ["summaries"]
        }
      });

      const summariesMap = {};
      result.summaries.forEach(item => {
        summariesMap[item.section_index] = item.summary;
      });
      setSummaries(summariesMap);
      setShowSummaries(true);
    } catch (error) {
      console.error('Error generating summaries:', error);
      alert('Failed to generate summaries. Please try again.');
    } finally {
      setIsGeneratingSummaries(false);
    }
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
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: branding ? fontFamilyMap[branding.font_family] : 'inherit' }}>
      {/* Header - Hidden in print */}
      <div className="bg-white border-b border-slate-200 print:hidden sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Manuals')}>
                <Button variant="outline" size="icon" className="rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h2 className="font-semibold text-slate-900">{manual.title}</h2>
                <p className="text-sm text-slate-600">Preview Mode</p>
              </div>
            </div>
            <div className="flex gap-2">
              {Object.keys(summaries).length === 0 ? (
                <Button 
                  variant="outline" 
                  onClick={handleGenerateSummaries}
                  disabled={isGeneratingSummaries || sections.length === 0}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGeneratingSummaries ? 'Generating...' : 'AI Summaries'}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setShowSummaries(!showSummaries)}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {showSummaries ? 'Hide' : 'Show'} Summaries
                </Button>
              )}
              <Button variant="outline" onClick={handleDownloadPDF}>
                <FileDown className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Download className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Link to={createPageUrl('ManualEditor') + `?id=${manualId}`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Header - Print Only */}
      {branding?.header_text && (
        <div className="hidden print:block text-center py-4 border-b border-slate-300 text-sm text-slate-600" style={{ color: branding.secondary_color }}>
          {branding.header_text}
        </div>
      )}

      {/* Manual Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 print:py-0">
        {/* Cover Page */}
        <div
          className="rounded-2xl p-16 mb-12 text-center shadow-2xl print:shadow-none print:rounded-none relative overflow-hidden"
          style={{ backgroundColor: branding?.primary_color || manual.cover_color }}
        >
          {/* Logo */}
          {branding?.logo_url && (
            <div className="mb-6">
              <img src={branding.logo_url} alt="Logo" className="h-20 w-auto mx-auto" />
            </div>
          )}

          {/* Decorative elements */}
          <div className="absolute top-4 left-4 text-white/20 text-4xl">◈</div>
          <div className="absolute top-4 right-4 text-white/20 text-4xl">◈</div>
          <div className="absolute bottom-4 left-4 text-white/20 text-4xl">◈</div>
          <div className="absolute bottom-4 right-4 text-white/20 text-4xl">◈</div>
          <div className="absolute top-1/2 left-8 -translate-y-1/2 text-white/10 text-6xl">✦</div>
          <div className="absolute top-1/2 right-8 -translate-y-1/2 text-white/10 text-6xl">✦</div>

          <div className="space-y-6 relative">
            <div className="text-6xl mb-6">📖</div>
            <div className="flex justify-center gap-2 text-white/40 text-2xl">
              <span>★</span><span>◆</span><span>★</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">{manual.title}</h1>
            {manual.description && (
              <p className="text-xl text-white/90 max-w-2xl mx-auto">{manual.description}</p>
            )}
            <div className="flex justify-center gap-2 text-white/40 text-xl pt-4">
              <span>◇</span><span>◇</span><span>◇</span>
            </div>
            {(branding?.show_date ?? true) && (
              <div className="pt-4 text-white/80 text-sm">
                Created on {new Date(manual.created_date).toLocaleDateString('en-AU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>
        </div>

        {/* Table of Contents - Auto-generated */}
        {sections.length > 0 && (
          <div className="bg-white rounded-xl p-8 mb-12 shadow-lg print:shadow-none print:break-after-page relative overflow-hidden">
            <div className="absolute top-0 right-0 text-slate-100 text-9xl font-bold opacity-30 select-none">
              §
            </div>
            <div className="flex items-center gap-2 mb-6 relative">
              <span className="text-slate-300 text-xl">❧</span>
              <h2 className="text-2xl font-bold text-slate-900">Table of Contents</h2>
              <span className="text-slate-300 text-xl">❧</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium ml-2">
                Auto-generated
              </span>
            </div>
            <div className="space-y-3">
              {sections.map((section, index) => {
                const tocStyle = sectionTypeStyles[section.section_type] || sectionTypeStyles.step;
                return (
                  <div key={section.id} className="py-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-medium text-slate-500 w-8">{index + 1}.</span>
                      <span className="text-2xl">{tocStyle.icon}</span>
                      <span className="flex-1 font-medium text-slate-900">{section.title}</span>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">
                        {tocStyle.label}
                      </span>
                    </div>
                    {showSummaries && summaries[index] && (
                      <div className="ml-16 mt-1 text-sm text-slate-600 italic">
                        {summaries[index]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => {
            const style = sectionTypeStyles[section.section_type] || sectionTypeStyles.step;
            return (
              <div
                key={section.id}
                className={`${style.bg} ${style.border} rounded-xl p-8 shadow-lg print:shadow-none print:break-inside-avoid`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-3xl">{style.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                          <span className="text-slate-300">{style.decoration}</span>
                          {style.label}
                          <span className="text-slate-300">{style.decoration}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">{section.title}</h3>
                  </div>
                </div>
                <div className="pl-16">
                  <ReactMarkdown
                    className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700"
                  >
                    {section.content}
                  </ReactMarkdown>
                  
                  {/* Section Images */}
                  {section.images && section.images.length > 0 && (
                    <div className="mt-6 space-y-4">
                      {section.images.map((imageUrl, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                          <img 
                            src={imageUrl} 
                            alt={`Section ${index + 1} - Image ${idx + 1}`}
                            className="w-full h-auto"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sections.length === 0 && (
          <div className="bg-white rounded-xl p-16 text-center shadow-lg">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">No content yet</h3>
            <p className="text-slate-600 mb-6">
              Start adding sections to build your onboarding manual
            </p>
            <Link to={createPageUrl('ManualEditor') + `?id=${manualId}`}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Edit className="w-4 h-4 mr-2" />
                Start Editing
              </Button>
            </Link>
          </div>
        )}

        {/* Footer */}
        {sections.length > 0 && (
          <div className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-500 print:break-before-page">
            <p>End of {manual.title}</p>
            {branding?.footer_text ? (
              <p className="mt-2 whitespace-pre-line">{branding.footer_text}</p>
            ) : (
              <p className="mt-2">Created with FlowGuide</p>
            )}
          </div>
        )}
      </div>

      {/* Custom Footer - Print Only */}
      {branding?.footer_text && (
        <div className="hidden print:block text-center py-4 border-t border-slate-300 text-xs text-slate-500 mt-8">
          {branding.footer_text}
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: ${branding?.show_page_numbers ? '25mm 15mm' : '20mm 15mm'};
            ${branding?.show_page_numbers ? `
              @bottom-right {
                content: counter(page);
                font-size: 10pt;
                color: #64748b;
              }
            ` : ''}
          }

          body {
            background: white;
            font-size: 11pt;
            line-height: 1.4;
          }

          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:break-after-page {
            break-after: page;
            page-break-after: always;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print\\:break-before-page {
            break-before: page;
            page-break-before: always;
          }

          /* Optimize text for A4 printing */
          h1 { font-size: 22pt; margin-bottom: 8pt; }
          h2 { font-size: 16pt; margin-bottom: 6pt; }
          h3 { font-size: 14pt; margin-bottom: 4pt; }
          p { margin-bottom: 8pt; orphans: 3; widows: 3; }
          ul, ol { margin-bottom: 8pt; }
          li { orphans: 3; widows: 3; }

          /* Prevent awkward breaks */
          h1, h2, h3 {
            page-break-after: avoid;
            break-after: avoid;
          }

          /* Ensure images fit on A4 */
          img {
            max-width: 100%;
            max-height: 250mm;
            object-fit: contain;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}