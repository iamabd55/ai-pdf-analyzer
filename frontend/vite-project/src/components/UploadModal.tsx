import React, { useState } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setSelectedFile(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSelectFile = () => {
    if (selectedFile) {
      setIsUploading(true);
      onUpload(selectedFile);
      // Note: Don't reset here - let parent component handle the redirect
    }
  };

  const handleCancel = () => {
    if (!isUploading) {
      setSelectedFile(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-md px-4">
      <div className="w-full max-w-xl bg-white dark:bg-[#1a1c22] rounded-2xl shadow-2xl p-8 border border-white/20">
        {!isUploading ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold display-font">Upload PDF</h3>
              <button 
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Choose a PDF file to begin your analysis.
            </p>
            
            <div className="relative group">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-primary bg-primary/10' 
                    : 'border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10'
                }`}
              >
                <div className="w-16 h-16 bg-white dark:bg-background-dark rounded-full shadow-md flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                </div>
                <div className="text-center px-4 w-full">
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 wrap-break-word overflow-hidden px-2">
                    {selectedFile ? (
                      <span className="block overflow-hidden text-ellipsis" style={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        wordBreak: 'break-all'
                      }}>
                        {selectedFile.name}
                      </span>
                    ) : (
                      'Drop your PDF here'
                    )}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    or click to browse from your device
                  </p>
                </div>
              </div>
              <input 
                accept=".pdf" 
                onChange={handleFileInput}
                className="absolute inset-0 opacity-0 cursor-pointer" 
                type="file"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-10">
              <button 
                onClick={handleSelectFile}
                disabled={!selectedFile}
                className={`flex-1 py-3.5 font-bold rounded-xl transition-all shadow-lg ${
                  selectedFile 
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/20' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Select File
              </button>
              <button 
                onClick={handleCancel}
                className="flex-1 py-3.5 bg-gray-50 dark:bg-[#2d303a] text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-[#3a3f4a] transition-all border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 uppercase tracking-widest font-bold">
              <span className="material-symbols-outlined text-sm">lock</span>
              Secure &amp; Encrypted Processing
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            {/* Animated Upload Icon */}
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-linear-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-5xl text-primary animate-bounce">
                  cloud_upload
                </span>
              </div>
              {/* Spinning Ring */}
              <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
            </div>

            {/* Loading Text */}
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Uploading Your PDF
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
              Please wait while we securely process your document...
            </p>

            {/* Progress Dots */}
            <div className="flex gap-2 mb-8">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>

            {/* File Info */}
            {selectedFile && (
              <div className="bg-gray-50 dark:bg-[#2d303a] rounded-xl p-4 w-full border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    description
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            )}

            {/* Status Message */}
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest font-bold">
              <span className="material-symbols-outlined text-sm">security</span>
              Encrypting & Processing
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;