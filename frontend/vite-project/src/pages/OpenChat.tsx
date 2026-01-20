import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Paperclip, Trash2, User, Search, Book} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Chat Page/Sidebar';
import type { PDFMetadata } from '../types/pdf';

// Types
interface Message {
    id: number;
    type: 'user' | 'ai';
    text: string;
    timestamp: string;
    isAnalyzing?: boolean;
}

// Header Component
const Header: React.FC<{ pdfData: PDFMetadata; onClearChat: () => void }> = ({ pdfData, onClearChat }) => {
    return (
        <header className="h-14 md:h-16 shrink-0 z-50 w-full border-b border-[#e5e7eb] bg-white px-4 md:px-6 py-2 md:py-3">
            <div className="flex items-center justify-between h-full">
                <div className="flex items-center gap-2">
                    <div className="text-bg-primary flex items-center justify-center">
                        <Book className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-[#101318]">DeepRead</h2>
                    <div className="hidden md:flex ml-6 px-3 py-1 bg-gray-100 rounded-lg items-center gap-2 text-sm font-medium text-gray-600">
                        <FileText className="w-4 h-4" />
                        {pdfData.fileName}
                    </div>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                    <button
                        onClick={onClearChat}
                        className="p-2 md:flex md:items-center md:gap-2 md:px-4 md:py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors md:border md:border-gray-200"
                    >
                        <Trash2 className="w-5 h-5 md:w-4.5 md:h-4.5" />
                        <span className="hidden md:inline">Clear Chat</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-bg-primary flex items-center justify-center text-white text-xs font-bold">
                        JD
                    </div>
                </div>
            </div>
        </header>
    );
};

// Mobile Document Info Bar
const MobileDocumentBar: React.FC<{ pdfData: PDFMetadata }> = ({ pdfData }) => {
    return (
        <div className="md:hidden px-4 py-3 bg-white border-b border-gray-100 shadow-sm z-40">
            <div className="flex items-center justify-between gap-4 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4.5 h-4.5 text-gray-400 shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 truncate">{pdfData.fileName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Size</span>
                        <span className="text-xs font-medium text-[#101318]">{pdfData.fileSize}</span>
                    </div>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Pages</span>
                        <span className="text-xs font-medium text-[#101318]">{pdfData.totalPages}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


// Chat Message Component
const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.type === 'user';

    return (
        <div className={`flex gap-3 md:gap-4 ${isUser ? 'max-w-[90%] md:max-w-4xl ml-auto flex-row-reverse' : 'max-w-[90%] md:max-w-4xl'}`}>
            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${isUser ? 'bg-gray-200 text-gray-600' : 'bg-bg-primary text-white'
                }`}>
                {isUser ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Book className="w-4 h-4 md:w-5 md:h-5" />}
            </div>
            <div className={`flex flex-col gap-1.5 md:gap-2 ${isUser ? 'items-end' : ''}`}>
                <div className={`p-3.5 md:p-4 rounded-2xl shadow-sm text-sm md:text-[15px] text-gray-800 ${isUser
                        ? 'bg-[#e3efff] rounded-tr-none'
                        : 'bg-white border border-gray-100 rounded-tl-none'
                    }`}>
                    {message.isAnalyzing ? (
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 italic">
                            <Search className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />
                            Analyzing document...
                        </div>
                    ) : (
                        <div 
                            className="ai-response-content"
                            style={{
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                            }}
                            dangerouslySetInnerHTML={{ __html: message.text }} 
                        />
                    )}
                </div>
                <span className={`text-[9px] md:text-[10px] text-gray-400 font-medium ${isUser ? 'mr-1' : 'ml-1'}`}>
                    {message.timestamp}
                </span>
            </div>
        </div>
    );
};

// Chat Input Component
const ChatInput: React.FC<{ onSendMessage: (text: string) => void; disabled?: boolean }> = ({ onSendMessage, disabled }) => {
    const [input, setInput] = useState('');

    const handleSubmit = () => {
        if (input.trim() && !disabled) {
            onSendMessage(input);
            setInput('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-linear-to-t from-[#f8f9fc] via-[#f8f9fc]/95 to-transparent">
            <div className="max-w-full md:max-w-4xl mx-auto relative group">
                <div className="absolute inset-0 bg-bg-primary/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <div className="relative bg-white border border-gray-200 rounded-2xl shadow-lg focus-within:border-bg-primary transition-all flex items-center p-1.5 md:p-2">
                    <button className="p-2 text-gray-400 hover:text-bg-primary transition-colors">
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={disabled}
                        className="flex-1 border-none focus:ring-0 text-sm md:text-[15px] px-1 md:px-2 py-2 md:py-3 placeholder:text-gray-400 bg-transparent"
                        placeholder={disabled ? "Please wait..." : "Ask a question about your PDF..."}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={disabled || !input.trim()}
                        className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center shadow-md shadow-bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-center text-[9px] md:text-[11px] text-gray-400 mt-2 md:mt-3">
                    DeepRead AI can make mistakes. Please verify important financial data.
                </p>
            </div>
        </div>
    );
};

// Main OpenChat Component
const OpenChat: React.FC = () => {

    const location = useLocation();
    const navigate = useNavigate();

    const file = location.state?.file as File | undefined;
    useEffect(() => {
  if (!file) {
    navigate('/'); // or upload page
  }
}, [file, navigate]);


    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            type: 'ai',
            text: "Hello! I've finished analyzing the document. You can ask me anything about the quarterly report. I can help summarize financial results, explain market trends, or find specific data points for you.",
            timestamp: '10:45 AM'
        }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    //File size calculator
    const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};


// Add documentId to PDFMetadata state
const [pdfData, setPdfData] = useState<PDFMetadata>({
  fileName: file?.name ?? 'Unknown.pdf',
  fileSize: file ? formatFileSize(file.size) : '--',
  totalPages: 0,
  language: 'Detecting...',
  lastModified: file ? new Date(file.lastModified).toLocaleDateString() : '--',
  documentId: ''
});
const hasUploadedRef = useRef(false);
  useEffect(() => {
  if (!file || hasUploadedRef.current) return;

  hasUploadedRef.current = true;

  const uploadPDF = async () => {
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      setPdfData(prev => ({
        ...prev,
        totalPages: data.pages,
        language: data.language,
        documentId: data.document_id,
      }));
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  uploadPDF();
}, [file]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    
// Updated handleSendMessage function
const handleSendMessage = async (text: string) => {
    const newUserMessage: Message = {
        id: messages.length + 1,
        type: 'user',
        text,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsProcessing(true);

    try {
        const response = await fetch('http://localhost:8000/ask-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: text,
                document_id: pdfData.documentId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const aiResponse: Message = {
            id: messages.length + 2,
            type: 'ai',
            text: formatAIResponse(data.answer, data.sources),
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Show error message to user
        const errorMessage: Message = {
            id: messages.length + 2,
            type: 'ai',
            text: 'Sorry, I encountered an error processing your question. Please try again.',
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsProcessing(false);
    }
};

// Helper function to format AI response with sources - COMPLETELY REDESIGNED
const formatAIResponse = (answer: string, sources?: Array<{ page: number; content: string }>) => {
    // Clean and format the main answer text
    let formattedAnswer = answer.trim();
    
    // Convert line breaks to paragraphs
    const paragraphs = formattedAnswer.split('\n\n').filter(p => p.trim());
    
    let htmlResponse = '<div class="ai-formatted-response">';
    
    paragraphs.forEach(para => {
        const trimmedPara = para.trim();
        
        // Check for bullet points
        if (trimmedPara.startsWith('* ') || trimmedPara.startsWith('- ')) {
            const items = trimmedPara.split('\n').filter(item => item.trim());
            htmlResponse += '<ul style="margin: 0.75rem 0; padding-left: 1.25rem; list-style-type: disc;">';
            items.forEach(item => {
                const cleanItem = item.replace(/^[*\-]\s*/, '').trim();
                htmlResponse += `<li style="margin-bottom: 0.5rem; line-height: 1.6; color: #374151;">${cleanItem}</li>`;
            });
            htmlResponse += '</ul>';
        }
        // Check for numbered lists
        else if (/^\d+\.\s/.test(trimmedPara)) {
            const items = trimmedPara.split('\n').filter(item => item.trim());
            htmlResponse += '<ol style="margin: 0.75rem 0; padding-left: 1.25rem; list-style-type: decimal;">';
            items.forEach(item => {
                const cleanItem = item.replace(/^\d+\.\s*/, '').trim();
                htmlResponse += `<li style="margin-bottom: 0.5rem; line-height: 1.6; color: #374151;">${cleanItem}</li>`;
            });
            htmlResponse += '</ol>';
        }
        // Regular paragraph
        else {
            // Apply bold formatting
            let formattedPara = trimmedPara.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: #111827;">$1</strong>');
            htmlResponse += `<p style="margin-bottom: 1rem; line-height: 1.7; color: #374151;">${formattedPara}</p>`;
        }
    });
    
    htmlResponse += '</div>';

    // Add sources section if available
    if (sources && sources.length > 0) {
        htmlResponse += `
            <div style="margin-top: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%); border-left: 4px solid #3b82f6; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.875rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <span style="font-size: 0.8125rem; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">Document References</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        `;
        
        sources.forEach((source) => {
            const excerpt = source.content.length > 150 
                ? source.content.substring(0, 150).trim() + '...' 
                : source.content.trim();
            
            htmlResponse += `
                <div style="padding: 0.875rem; background: #ffffff; border-radius: 0.5rem; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: all 0.2s;">
                    <div style="display: flex; align-items: center; gap: 0.625rem; margin-bottom: 0.5rem;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 1.75rem; height: 1.75rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 700; box-shadow: 0 2px 4px rgba(59,130,246,0.3);">${source.page}</span>
                        <span style="font-size: 0.8125rem; font-weight: 600; color: #1f2937;">Page ${source.page}</span>
                    </div>
                    <p style="font-size: 0.8125rem; color: #6b7280; line-height: 1.6; margin: 0; padding-left: 0.25rem; border-left: 2px solid #e5e7eb; padding-left: 0.625rem;">${excerpt}</p>
                </div>
            `;
        });
        
        htmlResponse += `
                </div>
            </div>
        `;
    }

    return htmlResponse;
};

    const handleClearChat = () => {
        setMessages([
            {
                id: 1,
                type: 'ai',
                text: "Hello! I've finished analyzing the document. You can ask me anything about the quarterly report.",
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            }
        ]);
    };

    return (
        <div className="flex flex-col h-screen bg-[#f8f9fc] text-[#101318] overflow-hidden">
            <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        @media (max-width: 768px) {
          ::-webkit-scrollbar {
            width: 4px;
          }
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        
        /* AI Response Content Styling */
        .ai-response-content p:last-child {
          margin-bottom: 0;
        }
        .ai-response-content ul,
        .ai-response-content ol {
          margin-top: 0;
        }
        .ai-response-content li {
          color: #374151;
        }
      `}</style>

            <Header pdfData={pdfData} onClearChat={handleClearChat} />
            <MobileDocumentBar pdfData={pdfData} />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar pdfData={pdfData} />

                <main className="flex-1 flex flex-col relative overflow-hidden bg-[#f8f9fc]">
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-12 py-6 md:py-8 space-y-6 md:space-y-8 pb-32 md:pb-40">
                        <div className="flex justify-center">
                            <span className="px-3 py-1 bg-gray-200/50 rounded-full text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                Today, 10:45 AM
                            </span>
                        </div>

                        {messages.map(message => (
                            <ChatMessage key={message.id} message={message} />
                        ))}

                        {isProcessing && (
                            <ChatMessage
                                message={{
                                    id: messages.length + 1,
                                    type: 'ai',
                                    text: '',
                                    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                                    isAnalyzing: true
                                }}
                            />
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <ChatInput onSendMessage={handleSendMessage} disabled={isProcessing} />
                </main>
            </div>
        </div>
    );
};

export default OpenChat;