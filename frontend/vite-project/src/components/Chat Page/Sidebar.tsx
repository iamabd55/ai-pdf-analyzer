import type { PDFMetadata } from '../../types/pdf';
import { Sparkles, MessageCircle, Bookmark, CheckCircle } from 'lucide-react';
const Sidebar: React.FC<{ pdfData: PDFMetadata }> = ({ pdfData }) => {


    return (
        <aside className="hidden md:flex w-72 bg-white border-r border-[#e5e7eb] flex-col p-6 overflow-y-auto" style={{ height: 'calc(100vh - 65px)' }}>
            <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Document Metadata</h3>
                <div className="space-y-4">
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

            <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Navigation</h3>
                <nav className="space-y-1">
                    <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors" href="#">
                        <Sparkles className="w-5 h-5" />
                        Summary
                    </a>
                    <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-primary/10 text-bg-primary text-sm font-bold" href="">
                        <MessageCircle className="w-5 h-5" />
                        Interactive Chat
                    </a>
                    <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors" href="#">
                        <Bookmark className="w-5 h-5" />
                        Key Insights
                    </a>
                </nav>
            </div>

            <div className="mt-auto bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-bg-primary" />
                    <span className="text-xs font-bold text-gray-700 uppercase">Analysis Engine</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">Processing with deep context window for higher accuracy.</p>
            </div>
        </aside>
    );
};
export default Sidebar;