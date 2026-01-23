import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import Sidebar from '../components/ChatPage/Sidebar';
import Header from '../components/ChatPage/Header';
import MobileDocumentBar from '../components/ChatPage/MobileDocumentBar';
import ChatMessage from '../components/ChatPage/ChatMessage';
import ChatInput from '../components/ChatPage/ChatInput';
import UploadModal from '../components/UploadModal';
import { useChatMessages } from '../hooks/useChatMessages';
import supabase from '../utils/supabase';
import type { PDFMetadata } from '../types/pdf';
import '../styles/chatResponse.css';

const OpenChat: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  
  const initialFile = location.state?.file as any;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if accessed directly or no user
  useEffect(() => {
    if (!initialFile || !user) navigate('/');
  }, [initialFile, user, navigate]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const [fileMetadata, setFileMetadata] = useState<any>(initialFile);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPdfProcessing, setIsPdfProcessing] = useState(true);

  const [pdfData, setPdfData] = useState<PDFMetadata>({
    fileName: fileMetadata?.file_name ?? 'Unknown.pdf',
    fileSize: fileMetadata?.file_size ? formatFileSize(fileMetadata.file_size) : '--',
    totalPages: 0,
    language: 'Detecting...',
    lastModified: fileMetadata?.uploaded_at 
      ? new Date(fileMetadata.uploaded_at).toLocaleDateString() 
      : '--',
    documentId: fileMetadata?.id ?? ''
  });

  const {
    messages,
    isProcessing,
    handleSendMessage,
    handleClearChat
  } = useChatMessages({ documentId: pdfData.documentId });

  // ✅ OPTIMIZED: Use Supabase Realtime instead of polling
// ✅ REALTIME FILE STATUS LISTENER
useEffect(() => {
  if (!pdfData.documentId) return;

  console.log('🔔 Subscribing to realtime updates for file:', pdfData.documentId);

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

      setPdfData(prev => ({
        ...prev,
        totalPages: newData.pages ?? prev.totalPages,
        language: newData.language ?? prev.language,
        wordCount: newData.word_count ?? prev.wordCount,
        processingStatus: newData.processing_status
      }));

      if (newData.processing_status?.ai_ready) {
        console.log('✅ AI Ready — stopping loader');
        setIsPdfProcessing(false);
      }

      if (newData.processing_status?.error) {
        console.error('❌ Processing failed:', newData.processing_status.error);
        setIsPdfProcessing(false);
      }
    }
  );

  channel.subscribe();

  return () => {
    console.log('🔕 Removing realtime channel');
    supabase.removeChannel(channel);
  };
}, [pdfData.documentId]);


  // Handle new PDF upload from chat page
  const handleNewUpload = async (newFile: File) => {
    if (!user) {
      alert('Please sign in to upload PDFs');
      return;
    }

    try {
      // Upload to Supabase
      const fileName = `${Date.now()}_${newFile.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, newFile);

      if (uploadError) throw uploadError;

      const { data: fileRecord, error: fileError } = await supabase
        .from('files')
        .insert([{
          user_id: user.id,
          file_name: newFile.name,
          storage_path: filePath,
          file_size: newFile.size
        }])
        .select()
        .single();

      if (fileError) throw fileError;

      // Send to backend (don't await - fire and forget)
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('file_id', fileRecord.id);

      fetch('http://localhost:8000/upload-pdf', {
        method: 'POST',
        body: formData
      }).catch(err => console.error('Backend upload error:', err));

      setIsUploadOpen(false);
      handleClearChat();
      
      // Update state
      setFileMetadata(fileRecord);
      setIsPdfProcessing(true);
      
      setPdfData({
        fileName: fileRecord.file_name,
        fileSize: formatFileSize(fileRecord.file_size),
        totalPages: 0,
        language: 'Detecting...',
        lastModified: new Date(fileRecord.uploaded_at).toLocaleDateString(),
        documentId: fileRecord.id
      });
    } catch (err) {
      console.error('❌ Upload failed:', err);
      alert('Failed to upload PDF. Please try again.');
    }
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fc] text-[#101318] overflow-hidden">
      {/* Header with SignOut */}
      <Header
        pdfData={pdfData}
        onClearChat={handleClearChat}
        onUploadClick={() => setIsUploadOpen(true)}
      >
        <div className="ml-4">
          <SignOutButton>
            <button className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </Header>

      <MobileDocumentBar pdfData={pdfData} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar pdfData={pdfData} />

        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#f8f9fc]">
          {/* PDF LOADER with Real-time Progress */}
          {isPdfProcessing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
              <div className="relative">
                {/* Spinning loader */}
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-primary"></div>
                
                {/* Pulsing inner circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse rounded-full h-8 w-8 bg-primary/20"></div>
                </div>
              </div>
              
              <div className="mt-6 text-center max-w-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Processing Your Document
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  AI is analyzing the content in real-time
                </p>
                
              </div>
            </div>
          )}

          {/* CHAT */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-12 py-6 pb-32 space-y-6">
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {isProcessing && (
              <ChatMessage
                message={{
                  id: `proc-${Date.now()}`,
                  type: 'ai',
                  text: '',
                  timestamp: new Date().toLocaleTimeString(),
                  isAnalyzing: true
                }}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isProcessing || isPdfProcessing}
          />
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleNewUpload}
      />
    </div>
  );
};

export default OpenChat;