import type { PDFMetadata } from '../../types/pdf';
import { FileText, Clock, Zap, Database, Brain, Activity, Loader2 } from 'lucide-react';

interface SidebarProps {
    pdfData: PDFMetadata;
}

const Sidebar: React.FC<SidebarProps> = ({ pdfData }) => {
    // Get processing status from backend or default to loading state
    const status = pdfData.processingStatus || {
        text_extraction: false,
        vector_embedding: false,
        ai_ready: false,
    };

    const StatusIndicator = ({ isComplete }: { isComplete: boolean }) => {
        if (isComplete) {
            return <span className="text-xs font-semibold text-green-600">✓ Complete</span>;
        }
        return (
            <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing...
            </span>
        );
    };
    const wordCount = pdfData.wordCount ?? 0;
    return (
        <aside className="hidden md:flex w-72 bg-white border-r border-[#e5e7eb] flex-col p-6 overflow-y-auto" style={{ height: 'calc(100vh - 65px)' }}>
            {/* Document Metadata */}
            <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Document Metadata</h3>
                <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500">File Size</span>
                        <span className="text-sm font-semibold text-[#101318]">{pdfData.fileSize}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500">Total Pages</span>
                        <span className="text-sm font-semibold text-[#101318]">
                            {pdfData.totalPages > 0 ? `${pdfData.totalPages} Pages` : '—'}
                        </span>
                    </div>
                    {/* ✅ Use pdfData.wordCount directly from backend */}
                    
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-500">Word Count</span>
                            <span className="text-sm font-semibold text-[#101318]">
                                {wordCount.toLocaleString()} words
                            </span>
                        </div>
                    
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500">Language</span>
                        <span className="text-sm font-semibold text-[#101318]">
                            {pdfData.language && pdfData.language !== 'Detecting...'
                                ? pdfData.language
                                : 'Detecting...'}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500">Last Modified</span>
                        <span className="text-sm font-semibold text-[#101318]">{pdfData.lastModified}</span>
                    </div>
                </div>
            </div>

            {/* Processing Status - REAL-TIME */}
            <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Processing Status</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            Text Extraction
                        </span>
                        <StatusIndicator isComplete={status.text_extraction} />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-2">
                            <Database className="w-3.5 h-3.5" />
                            Vector Embedding
                        </span>
                        <StatusIndicator isComplete={status.vector_embedding} />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-2">
                            <Brain className="w-3.5 h-3.5" />
                            AI Ready
                        </span>
                        <StatusIndicator isComplete={status.ai_ready} />
                    </div>
                    
                </div>
            </div>

            {/* Analysis Engine Info */}
            <div className="bg-linear-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-bold text-gray-700 uppercase">Analysis Engine</span>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <p className="text-[11px] text-gray-600">Gemini 2.5 Flash</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <p className="text-[11px] text-gray-600">~2-3s response time</p>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed mt-2">
                        Deep context processing with conversation memory for accurate answers.
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;