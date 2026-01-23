import React from 'react';
import { FileText, Trash2, Upload, LogOut } from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import type { PDFMetadata } from '../../types/pdf';

interface HeaderProps {
  pdfData: PDFMetadata;
  onClearChat: () => void;
  onUploadClick: () => void;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  pdfData,
  onClearChat,
  onUploadClick
}) => {
  const clerk = useClerk();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await clerk.signOut();
    navigate('/');
  };

  return (
    <header className="h-14 md:h-16 shrink-0 z-50 w-full border-b border-[#e5e7eb] bg-white px-4 md:px-6 py-2 md:py-3">
      <div className="flex items-center justify-between h-full">
        {/* Left */}
        <div className="flex items-center gap-2">
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
          {/* Upload new PDF */}
          <button
            onClick={onUploadClick}
            className="p-2 md:flex md:items-center md:gap-2 md:px-4 md:py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors md:border md:border-primary/30"
          >
            <Upload className="w-5 h-5 md:w-4.5 md:h-4.5" />
            <span className="hidden md:inline">Upload PDF</span>
          </button>

          {/* Clear chat */}
          <button
            onClick={onClearChat}
            className="p-2 md:flex md:items-center md:gap-2 md:px-4 md:py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors md:border md:border-gray-200"
          >
            <Trash2 className="w-5 h-5 md:w-4.5 md:h-4.5" />
            <span className="hidden md:inline">Clear Chat</span>
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
  );
};

export default Header;
