
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from io import BytesIO
from langdetect import detect, LangDetectException
import pycountry
import hashlib
import os
from pathlib import Path
import shutil
from typing import Dict
from dotenv import load_dotenv

# Import your LangChain classes
from document_processor import DocumentProcessor
from vector_store import VectorStoreManager
from qa_chain import QAChain

load_dotenv()
app = FastAPI()

# ✅ CORS (REQUIRED for React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session storage - maps document_id to QA chain
sessions: Dict[str, QAChain] = {}
UPLOAD_DIR = Path("./uploaded_pdfs")
UPLOAD_DIR.mkdir(exist_ok=True)

class QuestionRequest(BaseModel):
    question: str
    document_id: str

def get_language_name(lang_code: str) -> str:
    """Convert ISO language code to full language name"""
    try:
        language = pycountry.languages.get(alpha_2=lang_code)
        return language.name if language else "Unknown"
    except:
        return "Unknown"

def generate_document_id(filename: str) -> str:
    """Generate unique ID for document"""
    return hashlib.md5(f"{filename}_{os.urandom(8).hex()}".encode()).hexdigest()

@app.get("/")
async def root():
    return {"message": "Backend is running!"}


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    pdf_bytes = await file.read()

    document_id = generate_document_id(file.filename)
    file_path = UPLOAD_DIR / f"{document_id}_{file.filename}"

    try:
        # Save file
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        # Read PDF
        reader = PdfReader(BytesIO(pdf_bytes))
        total_pages = len(reader.pages)

        # Extract text sample
        text_sample = ""
        for page in reader.pages[:3]:
            text_sample += page.extract_text() or ""

        # Language detection
        try:
            lang_code = detect(text_sample) if text_sample.strip() else "unknown"
            language = get_language_name(lang_code)
        except LangDetectException:
            language = "unknown"

        print(f"📄 Uploaded PDF {file.filename} ({total_pages} pages)")

    except Exception as e:
        print("❌ BASIC PDF FAILED:", repr(e))
        raise HTTPException(status_code=500, detail="Invalid or corrupted PDF")

    # 🔥 AI processing isolated
    try:
        print("🤖 Starting AI processing...")
        print("GOOGLE_API_KEY =", os.getenv("GOOGLE_API_KEY"))
        doc_processor = DocumentProcessor(chunk_size=1500, chunk_overlap=300)
        documents = doc_processor.process(str(file_path))

        if not documents:
            raise Exception("No text extracted")

        vector_manager = VectorStoreManager(
            persist_directory=f"./chroma_db/{document_id}"
        )
        vectorstore = vector_manager.create(documents)

        qa_chain = QAChain(vectorstore, k=15)
        sessions[document_id] = qa_chain

        print("✅ AI processing completed")

    except Exception as e:
        print("⚠️ AI PROCESSING FAILED:", repr(e))
        # DO NOT FAIL UPLOAD

    return {
        "fileName": file.filename,
        "pages": total_pages,
        "language": language,
        "document_id": document_id
    }

@app.post("/ask-question")
async def ask_question(request: QuestionRequest):
    """Ask a question about a specific uploaded PDF using LangChain"""
    
    # Check if session exists for this document
    if request.document_id not in sessions:
        raise HTTPException(
            status_code=404, 
            detail="Document session not found. Please upload the PDF again."
        )
    
    try:
        # Get the QA chain for this specific document
        qa_chain = sessions[request.document_id]
        
        # Use LangChain to answer the question
        result = qa_chain.ask(request.question)
        
        print(f"✅ Question answered using LangChain for doc: {request.document_id}")
        
        return {
            "answer": result["answer"],
            "sources": result["sources"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "active_sessions": len(sessions),
        "session_ids": list(sessions.keys())
    }

@app.delete("/reset/{document_id}")
async def reset_session(document_id: str):
    """Reset a specific document session"""
    if document_id in sessions:
        del sessions[document_id]
        # Optionally delete the vector store directory
        vector_dir = Path(f"./chroma_db/{document_id}")
        if vector_dir.exists():
            shutil.rmtree(vector_dir)
        return {"message": f"Session {document_id} reset successfully"}
    
    raise HTTPException(status_code=404, detail="Session not found")