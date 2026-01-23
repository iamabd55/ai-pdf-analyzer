import React from 'react';
import { FileText, Database, Brain } from 'lucide-react';
import type { PDFMetadata } from '../../types/pdf';

interface MobileDocumentBarProps {
    pdfData: PDFMetadata;
}

const MobileDocumentBar: React.FC<MobileDocumentBarProps> = ({ pdfData }) => {
    const status = pdfData.processingStatus || {
        text_extraction: false,
        vector_embedding: false,
        ai_ready: false,
    };

    const StatusDot = ({ complete }: { complete: boolean }) => (
        <span
            className={`w-2.5 h-2.5 rounded-full ${
                complete ? 'bg-green-600' : 'bg-amber-500 animate-pulse'
            }`}
        />
    );

    return (
        <div className="md:hidden px-4 py-3 bg-white border-b border-gray-100 shadow-sm z-40">
            <div className="flex items-center justify-between gap-4 overflow-x-auto">
                {/* File Info */}
                <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4.5 h-4.5 text-gray-400 shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 truncate">
                        {pdfData.fileName}
                    </span>
                </div>

                {/* File Size & Pages */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                            Size
                        </span>
                        <span className="text-xs font-medium text-[#101318]">
                            {pdfData.fileSize}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                            Pages
                        </span>
                        <span className="text-xs font-medium text-[#101318]">
                            {pdfData.totalPages}
                        </span>
                    </div>
                </div>
            </div>

            {/* Processing Status Bar */}
            <div className="mt-2 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                    <StatusDot complete={status.text_extraction} />
                    <span>Text</span>
                </div>
                <div className="flex items-center gap-1">
                    <StatusDot complete={status.vector_embedding} />
                    <span>Embedding</span>
                </div>
                <div className="flex items-center gap-1">
                    <StatusDot complete={status.ai_ready} />
                    <span>AI</span>
                </div>
            </div>
        </div>
    );
};

export default MobileDocumentBar;
