import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import supabase from '../utils/supabase';

interface SummarySection {
  title: string;
  content: string;
  icon: string;
}

interface ProcessingStatus {
  text_extraction: boolean;
  vector_embedding: boolean;
  ai_ready: boolean;
  current_chunk: number;
  total_chunks: number;
  error: string | null;
}

const API_URL = 'https://ai-pdf-analyzer-production.up.railway.app';

const Summarize: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  
  const initialFile = location.state?.file as any;

  useEffect(() => {
    if (!initialFile || !user) {
      console.log('❌ No file or user, redirecting to home');
      navigate('/');
    }
  }, [initialFile, user, navigate]);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const [pdfData, setPdfData] = useState({
    fileName: initialFile?.file_name ?? 'Unknown.pdf',
    fileSize: formatFileSize(initialFile?.file_size),
    totalPages: 0,
    language: 'Detecting...',
    wordCount: 0,
    lastModified: initialFile?.uploaded_at 
      ? new Date(initialFile.uploaded_at).toLocaleDateString() 
      : '--',
    documentId: initialFile?.id ?? '',
    processingStatus: null as ProcessingStatus | null
  });

  const [isPdfProcessing, setIsPdfProcessing] = useState(true);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummarySection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Realtime listener
  useEffect(() => {
    if (!pdfData.documentId) return;

    console.log('🔔 Subscribing to realtime updates for:', pdfData.documentId);

    const channel = supabase.channel(`file:${pdfData.documentId}`);

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'files',
        filter: `id=eq.${pdfData.documentId}`,
      },
      (payload) => {
        const newData = payload.new;
        console.log('📡 Realtime update:', newData.processing_status);

        const status = newData.processing_status;

        setPdfData(prev => ({
          ...prev,
          totalPages: newData.pages ?? prev.totalPages,
          language: newData.language ?? prev.language,
          wordCount: newData.word_count ?? prev.wordCount,
          processingStatus: status
        }));

        if (status) {
          if (status.ai_ready) {
            setProcessingProgress(100);
            setIsPdfProcessing(false);
            console.log('✅ Document fully processed');
          } else if (status.error) {
            setError(status.error);
            setIsPdfProcessing(false);
            console.error('❌ Processing error:', status.error);
          } else {
            const progress = status.total_chunks > 0
              ? Math.floor((status.current_chunk / status.total_chunks) * 100)
              : status.text_extraction ? 30 : 10;
            setProcessingProgress(progress);
          }
        }
      }
    );

    channel.subscribe();

    return () => {
      console.log('🔕 Unsubscribing from realtime channel');
      supabase.removeChannel(channel);
    };
  }, [pdfData.documentId]);

  // Poll status as fallback
  useEffect(() => {
    if (!pdfData.documentId || !isPdfProcessing) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/processing-status/${pdfData.documentId}`);
        if (!response.ok) return;

        const data = await response.json();
        
        if (data.processing_status?.ai_ready) {
          setPdfData(prev => ({
            ...prev,
            totalPages: data.pages,
            language: data.language,
            wordCount: data.word_count,
            processingStatus: data.processing_status
          }));
          setProcessingProgress(100);
          setIsPdfProcessing(false);
        } else if (data.processing_status?.error) {
          setError(data.processing_status.error);
          setIsPdfProcessing(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    const interval = setInterval(pollStatus, 2000);
    pollStatus();

    return () => clearInterval(interval);
  }, [pdfData.documentId, isPdfProcessing]);

  // Generate summary
  const generateSummary = async () => {
    if (!pdfData.documentId) {
      setError('No document ID available');
      return;
    }

    setIsGeneratingSummary(true);
    setError(null);
    
    try {
      console.log('📝 Generating summary for:', pdfData.documentId);

      const response = await fetch(`${API_URL}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: pdfData.documentId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Summary generated:', data);

      if (data.summary && Array.isArray(data.summary)) {
        setSummaryData(data.summary);
      } else {
        throw new Error('Invalid summary format received');
      }

    } catch (err: any) {
      console.error('❌ Summary generation failed:', err);
      setError(err.message || 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Auto-generate summary when processing completes
  useEffect(() => {
    if (!isPdfProcessing && summaryData.length === 0 && !error && !isGeneratingSummary) {
      console.log('🤖 Auto-generating summary...');
      generateSummary();
    }
  }, [isPdfProcessing]);

  // Download summary as text file
  const downloadSummary = () => {
    let content = `DOCUMENT SUMMARY\n`;
    content += `${'='.repeat(60)}\n\n`;
    content += `Document: ${pdfData.fileName}\n`;
    content += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    content += `Pages: ${pdfData.totalPages}\n`;
    content += `Words: ${pdfData.wordCount.toLocaleString()}\n\n`;
    content += `${'='.repeat(60)}\n\n`;

    summaryData.forEach((section) => {
      content += `${section.icon} ${section.title}\n`;
      content += `${'-'.repeat(60)}\n`;
      content += `${section.content}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pdfData.fileName.replace('.pdf', '')}_summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fc] to-[#e8eaf0]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Mobile Layout */}
          <div className="flex items-center justify-between md:hidden">
            <button 
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <h1 className="text-base font-semibold text-gray-900">Summary</h1>
            
            <div className="flex items-center gap-2">
              {!isPdfProcessing && !isGeneratingSummary && summaryData.length > 0 && (
                <button
                  onClick={downloadSummary}
                  className="text-green-600 hover:text-green-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}
              <SignOutButton>
                <button className="text-red-600 hover:text-red-800">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                  </svg>
                </button>
              </SignOutButton>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Document Summary</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {!isPdfProcessing && !isGeneratingSummary && summaryData.length > 0 && (
                <button
                  onClick={downloadSummary}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              )}
              <SignOutButton>
                <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                  </svg>
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex items-start">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="text-base font-semibold text-red-900 mb-1">Processing Error</h3>
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  ← Return to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Loader */}
        {isPdfProcessing && !error && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Processing Document
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {pdfData.processingStatus?.text_extraction 
                ? 'Generating embeddings...' 
                : 'Extracting text...'}
            </p>
            
            <div className="max-w-md mx-auto">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{processingProgress}% complete</p>
            </div>
          </div>
        )}

        {/* Summary Generation Loader */}
        {!isPdfProcessing && isGeneratingSummary && !error && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Generating Summary
            </h3>
            <p className="text-sm text-gray-600">
              AI is analyzing your document...
            </p>
          </div>
        )}

        {/* Summary Content - Clean Text Layout */}
        {!isPdfProcessing && !isGeneratingSummary && summaryData.length > 0 && !error && (
          <article className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 lg:p-12">
            {/* Document Header */}
            <div className="border-b border-gray-200 pb-6 mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 break-words">
                {pdfData.fileName}
              </h1>
              <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <span>📑 {pdfData.totalPages} pages</span>
                <span>💾 {pdfData.fileSize}</span>
                <span>🌐 {pdfData.language}</span>
                {pdfData.wordCount > 0 && (
                  <span>📝 {pdfData.wordCount.toLocaleString()} words</span>
                )}
              </div>
            </div>

            {/* Summary Sections */}
            <div className="prose prose-sm sm:prose-base max-w-none">
              {summaryData.map((section, index) => (
                <div key={index} className="mb-8 last:mb-0">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>{section.icon}</span>
                    <span>{section.title}</span>
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    {section.content.split('\n').map((paragraph, idx) => (
                      paragraph.trim() && (
                        <p key={idx} className="text-sm sm:text-base">
                          {paragraph}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}
      </main>
    </div>
  );
};

export default Summarize;
