from fastapi import FastAPI, File, UploadFile
from pypdf import PdfReader
from dotenv import load_dotenv
import os

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Backend is running!"}

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"error": "Only PDF files allowed"}

    content = await file.read()
    reader = PdfReader(content)
    extracted = ""

    for page in reader.pages:
        extracted += page.extract_text() or ""

    return {"text": extracted[:500]}
