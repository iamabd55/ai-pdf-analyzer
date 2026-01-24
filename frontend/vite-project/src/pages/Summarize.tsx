import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { FileText, Upload, LogOut, Download, ArrowLeft } from 'lucide-react';
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
  const clerk = useClerk();
  
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

  const handleSignOut = async () => {
    await clerk.signOut();
    navigate('/');
  };

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

  // Download summary as PDF file
  const downloadSummary = async () => {
    try {
      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (neededHeight: number) => {
        if (yPosition + neededHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
      };

      // Helper function to wrap text
      const addWrappedText = (text: string, fontSize: number, fontStyle: string = 'normal', lineHeight: number = 7) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        
        const lines = doc.splitTextToSize(text, maxWidth);
        
        lines.forEach((line: string) => {
          checkPageBreak(lineHeight);
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
      };

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('DOCUMENT SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Document metadata
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      
      const metadata = [
        `Document: ${pdfData.fileName}`,
        `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        `Pages: ${pdfData.totalPages}`,
        `Words: ${pdfData.wordCount.toLocaleString()}`,
        `Language: ${pdfData.language}`
      ];

      metadata.forEach(line => {
        checkPageBreak(6);
        doc.text(line, margin, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Divider line
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Reset text color for content
      doc.setTextColor(0, 0, 0);

      // Summary sections
      summaryData.forEach((section) => {
        // Section title
        checkPageBreak(15);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${section.icon} ${section.title}`, margin, yPosition);
        yPosition += 10;

        // Section content
        const paragraphs = section.content.split('\n').filter(p => p.trim());
        
        paragraphs.forEach(paragraph => {
          addWrappedText(paragraph.trim(), 10, 'normal', 6);
          yPosition += 3; // Space between paragraphs
        });

        yPosition += 5; // Space between sections
      });

      // Save the PDF
      doc.save(`${pdfData.fileName.replace('.pdf', '')}_summary.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      // Fallback to text file if PDF generation fails
      downloadSummaryAsText();
    }
  };

  // Fallback text download
  const downloadSummaryAsText = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fc] to-[#e8eaf0] flex flex-col">
      {/* Unified Header */}
      <header className="h-14 md:h-16 shrink-0 z-50 w-full border-b border-[#e5e7eb] bg-white px-4 md:px-6 py-2 md:py-3">
        <div className="flex items-center justify-between h-full">
          {/* Left */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">description</span>
            </div>

            <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-[#101318]">
              DeepRead
            </h2>

            <div className="hidden md:flex ml-6 px-3 py-1 bg-gray-100 rounded-lg items-center gap-2 text-sm font-medium text-gray-600">
              <FileText className="w-4 h-4" />
              {pdfData.fileName}
            </div>
          </div>
          
          {/* Right */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Download Summary */}
            {!isPdfProcessing && !isGeneratingSummary && summaryData.length > 0 && (
              <button
                onClick={downloadSummary}
                className="p-2 md:flex md:items-center md:gap-2 md:px-4 md:py-2 text-sm font-semibold text-green-600 hover:bg-green-50 rounded-lg transition-colors md:border md:border-green-200"
              >
                <Download className="w-5 h-5 md:w-4.5 md:h-4.5" />
                <span className="hidden md:inline">Download</span>
              </button>
            )}

            {/* Upload new PDF */}
            <button
              onClick={() => navigate('/')}
              className="p-2 md:flex md:items-center md:gap-2 md:px-4 md:py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors md:border md:border-primary/30"
            >
              <Upload className="w-5 h-5 md:w-4.5 md:h-4.5" />
              <span className="hidden md:inline">Upload PDF</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="p-2 md:flex md:items-center md:gap-2 md:px-4 md:py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors md:border md:border-red-200"
            >
              <LogOut className="w-5 h-5 md:w-4.5 md:h-4.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-start">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="text-base font-semibold text-red-900 mb-1">Processing Error</h3>
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline font-medium"
                >
                  ← Return to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Loader */}
        {isPdfProcessing && !error && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary"></div>
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
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{processingProgress}% complete</p>
            </div>
          </div>
        )}

        {/* Summary Generation Loader */}
        {!isPdfProcessing && isGeneratingSummary && !error && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Generating Summary
            </h3>
            <p className="text-sm text-gray-600">
              AI is analyzing your document...
            </p>
          </div>
        )}

        {/* Summary Content */}
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
