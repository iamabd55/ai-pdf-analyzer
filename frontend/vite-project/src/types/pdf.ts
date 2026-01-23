export interface PDFMetadata {
  fileName: string;
  fileSize: string;
  totalPages: number;
  language: string;
  lastModified: string;
  documentId: string;
  wordCount?: number;
  processingStatus?: {
    text_extraction: boolean;
    vector_embedding: boolean;
    ai_ready: boolean;
  };
}
