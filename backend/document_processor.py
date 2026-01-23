from langchain_community.document_loaders import PyPDFLoader, UnstructuredPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import unicodedata
import re
from io import BytesIO
from pathlib import Path
from typing import Union


class DocumentProcessor:
    def __init__(self, chunk_size=1200, chunk_overlap=250, use_ocr=False):
        """
        chunk_size: Smaller chunks improve retrieval precision
        chunk_overlap: Keeps context between chunks
        use_ocr: Enable if PDFs are scanned images
        """
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", "۔", " ", ""]
        )
        self.use_ocr = use_ocr

    # 🔹 Clean extracted text
    def _clean_text(self, text: str) -> str:
        if not text:
            return ""

        text = unicodedata.normalize("NFKC", text)
        # Remove invalid UTF-16 surrogate pairs
        text = re.sub(r'[\uD800-\uDFFF]', '', text)
        # Remove zero-width and invisible chars
        text = re.sub(r"[\u200b-\u200d\uFEFF]", "", text)
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    # 🔹 Process PDF into cleaned chunks
    def process(self, pdf_source: Union[str, bytes, BytesIO]):
        """
        pdf_source: can be
          - file path (str)
          - raw PDF bytes (bytes)
          - BytesIO object
        """
        # Determine loader
        if isinstance(pdf_source, (bytes, BytesIO)):
            stream = BytesIO(pdf_source) if isinstance(pdf_source, bytes) else pdf_source
            loader = UnstructuredPDFLoader(stream) if self.use_ocr else PyPDFLoader(stream)
        elif isinstance(pdf_source, str):
            if not Path(pdf_source).exists():
                raise FileNotFoundError(f"PDF not found: {pdf_source}")
            loader = UnstructuredPDFLoader(pdf_source) if self.use_ocr else PyPDFLoader(pdf_source)
        else:
            raise TypeError("pdf_source must be str, bytes, or BytesIO")

        print("📖 Loading PDF...")
        pages = loader.load()

        cleaned_pages = []
        for page_number, page in enumerate(pages, start=1):
            cleaned_text = self._clean_text(page.page_content)

            if not cleaned_text.strip():
                continue

            page.page_content = cleaned_text
            page.metadata["page"] = page_number
            cleaned_pages.append(page)

        print(f"🧹 Cleaned {len(cleaned_pages)} pages")

        print("🔪 Splitting into chunks...")
        chunks = self.splitter.split_documents(cleaned_pages)

        final_chunks = []
        for i, chunk in enumerate(chunks):
            text = chunk.page_content.strip()
            if len(text) < 30:
                continue
            chunk.metadata["chunk_index"] = i
            final_chunks.append(chunk)

        print(f"✅ Created {len(final_chunks)} clean chunks")
        return final_chunks
