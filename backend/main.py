import asyncio
import traceback
from io import BytesIO
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
import pycountry
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import Dict
from langdetect import detect

from document_processor import DocumentProcessor
from qa_chain import QAChain
from vector_store import VectorStore

import tempfile
import os
from pathlib import Path
import shutil
from typing import Dict
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

# ------------------------
# Supabase client
# ------------------------
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# ------------------------
# CORS
# ------------------------
origins = [
    "https://ai-pdf-analyzer-theta.vercel.app",  # Vercel frontend
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------
# QA sessions
# ------------------------
def get_qa_chain(document_id: str) -> QAChain:
    return QAChain(document_id)


# ------------------------
# Request models
# ------------------------
class QuestionRequest(BaseModel):
    question: str
    document_id: str
    user_id: str = None  # optional


# ------------------------
# Helpers
# ------------------------
def get_language_name(code: str) -> str:
    try:
        lang = pycountry.languages.get(alpha_2=code)
        return lang.name if lang else "Unknown"
    except:
        return "Unknown"


# =========================================================
# 🔥 Background PDF processing
# =========================================================
async def process_pdf_background(file_name: str, document_id: str):
    processing_status = {
        "text_extraction": False,
        "vector_embedding": False,
        "ai_ready": False,
        "current_chunk": 0,
        "total_chunks": 0,
        "error": None
    }

    try:
        # ===== Download PDF bytes from Supabase =====
        res = supabase.storage.from_("pdfs").download(file_name)
        if res is None:
            raise ValueError("PDF not found in Supabase bucket")
        pdf_bytes = res

        # ===== Text extraction =====
        reader = PdfReader(BytesIO(pdf_bytes))
        total_pages = len(reader.pages)
        full_text = "".join(page.extract_text() or "" for page in reader.pages)
        total_words = len(full_text.split())

        try:
            sample = "".join(page.extract_text() or "" for page in reader.pages[:3])
            language = get_language_name(detect(sample)) if sample.strip() else "Unknown"
        except:
            language = "Unknown"

        processing_status["text_extraction"] = True
        supabase.table("files").update({
            "pages": total_pages,
            "language": language,
            "word_count": total_words,
            "processing_status": processing_status
        }).eq("id", document_id).execute()

        # ===== Chunking =====
        processor = DocumentProcessor()

        # Windows-safe temp file
        tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        try:
            tmp.write(pdf_bytes)
            tmp.close()
            documents = processor.process(tmp.name)
        finally:
            os.remove(tmp.name)

        if not documents:
            raise ValueError("No readable text in PDF")

        processing_status["total_chunks"] = len(documents)

        # ===== Embeddings =====
        vector_store = VectorStore()
        batch = []
        for idx, doc in enumerate(documents):
            batch.append({
                "chunk_id": idx,
                "page": doc.metadata.get("page", 0),
                "text": doc.page_content
            })

            if len(batch) == 20:
                vector_store.store_chunks_batch(document_id, batch)
                batch = []
                processing_status["current_chunk"] = idx
                supabase.table("files").update({
                    "processing_status": processing_status
                }).eq("id", document_id).execute()

        if batch:
            vector_store.store_chunks_batch(document_id, batch)

        processing_status["vector_embedding"] = True

        # ===== QA ready =====

        processing_status["ai_ready"] = True
        supabase.table("files").update({
            "processing_status": processing_status
        }).eq("id", document_id).execute()

        print("✅ PDF processing complete!")

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Processing failed: {error_msg}")
        traceback.print_exc()
        processing_status["error"] = error_msg
        processing_status["ai_ready"] = False
        supabase.table("files").update({
            "processing_status": processing_status
        }).eq("id", document_id).execute()


# =========================================================
# 📤 Upload PDF endpoint
# =========================================================
@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), file_id: str = Form(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDFs allowed")

    pdf_bytes = await file.read()
    file_name = f"{file_id}_{file.filename}"

    # Upload PDF to Supabase Storage
    supabase.storage.from_("pdfs").upload(file_name, pdf_bytes, {"cacheControl": "3600"})

    # Start background processing
    asyncio.create_task(process_pdf_background(file_name, file_id))

    return {"document_id": file_id, "message": "Processing started"}


# =========================================================
# ❓ Ask question endpoint
# =========================================================
@app.post("/ask-question")
async def ask_question(req: QuestionRequest):
    try:
        qa = get_qa_chain(req.document_id)
        return qa.ask(req.question)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, "Failed to get answer")



# =========================================================
# 🔍 Processing status endpoint
# =========================================================
@app.get("/processing-status/{document_id}")
def processing_status(document_id: str):
    result = supabase.table("files").select("*").eq("id", document_id).execute()
    if not result.data:
        raise HTTPException(404, "Document not found")
    return result.data[0]
# ------------------------Summary-----------

@app.post("/generate-summary")
async def generate_summary(payload: dict):
    document_id = payload.get("document_id")

    if not document_id:
        raise HTTPException(400, "document_id is required")

    try:
        qa = get_qa_chain(document_id)
        summary = qa.generate_summary()
        return summary

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, "Failed to generate summary")




# =========================================================
# Root
# =========================================================
@app.get("/")
def root():
    return {"message": "Backend running"}
