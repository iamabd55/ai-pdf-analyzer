import os
import json
import re
from langchain_google_genai.chat_models import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
from vector_store import VectorStore

load_dotenv()


def extract_json_strict(text: str):
    """
    Safely extract first valid JSON object from model output.
    Gemini often adds stray text even when instructed not to.
    """
    # Try to find JSON object
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON object found in response")
    
    try:
        return json.loads(match.group())
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        print(f"Raw text: {text[:500]}")
        raise


class QAChain:
    def __init__(self, document_id: str):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in .env")

        print(f"🤖 Initializing QA chain for document: {document_id}")

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.2,
        )

        self.vector_store = VectorStore()
        self.document_id = document_id

        # Question-answering prompt
        self.prompt_template = PromptTemplate.from_template("""
You are an AI assistant answering questions strictly and exclusively using the provided document context.

ABSOLUTE RULES:
- Use ONLY information explicitly stated in the context.
- Do NOT use outside knowledge, assumptions, or prior understanding.
- You may extract directly stated labels (e.g., Name, Email, Phone)
even if phrased as headers or standalone text.
- If the information is not clearly present in the context, say exactly:
  "The document does not contain this information."

QUESTION HANDLING RULES:
- Answer ONLY what is asked. Do not add background or explanations unless requested.
- If the question asks for a specific number of items (e.g., "three reasons", "four steps"):
  - Extract EXACTLY that number.
  - Use the SAME wording or terminology as used in the document.
  - Do NOT merge, rename, rephrase, or replace items.
- If the document does not explicitly enumerate the requested items, say the document does not contain this information.

ANSWER FORMAT RULES:
- Respond in plain text only.
- Use short paragraphs or line-separated points.
- Use **bold** only for key terms exactly as written in the document.
- Do NOT use tables, code blocks, emojis, or special formatting.
- Do NOT summarize or conclude unless asked.

CONTEXT:
{context}

QUESTION:
{question}

ANSWER:
""")

        print("✅ QA chain initialized successfully")

    # ==========================
    # ❓ QUESTION ANSWERING
    # ==========================
    def ask(self, question: str):
        """Answer a question using vector similarity search and LLM"""
        print(f"❓ Question: {question[:100]}")
        
        try:
            # Search for relevant chunks
            raw_chunks = self.vector_store.search_similar(
                file_id=self.document_id,
                query=question,
                top_k=12
            )

            if not raw_chunks:
                print("⚠️ No relevant chunks found")
                return {
                    "answer": "The document does not contain this information.",
                    "sources": []
                }

            # Build context from chunks
            seen_pages = set()
            context_blocks = []

            for chunk in raw_chunks:
                page = chunk.get("page", 0)
                text = chunk.get("content") or chunk.get("text") or ""
                
                if not text.strip():
                    continue


                seen_pages.add(page)
                context_blocks.append(f"(Page {page}) {text[:1000]}")

                if len(context_blocks) >= 6:
                    break

            if not context_blocks:
                return {
                    "answer": "The document does not contain this information.",
                }

            context = "\n\n".join(context_blocks)
            print(f"📚 Using {len(context_blocks)} chunks from pages: {sorted(seen_pages)}")

            # Generate answer
            prompt = self.prompt_template.format(
                context=context,
                question=question
            )

            response = self.llm.invoke(prompt)
            answer = response.content.strip()

            print(f"✅ Generated answer ({len(answer)} chars)")

            return {
                "answer": answer
            }

        except Exception as e:
            print(f"❌ Error in ask(): {e}")
            return {
                "answer": f"Error processing question: {str(e)}",
            }

    # ==========================
    # 📄 SUMMARY GENERATION
    # ==========================
    def generate_summary(self):
        """Generate a comprehensive structured summary of the document"""
        print(f"📝 Generating summary for document: {self.document_id}")
        
        SUMMARY_PROMPT = PromptTemplate.from_template("""
You are an expert document analyst creating a comprehensive summary using ONLY the provided context.

YOUR TASK:
Create a detailed, well-structured summary with 4-6 major sections that thoroughly cover the document's content.

SECTION REQUIREMENTS:
- Each section should be substantial and informative
- Content should be 150-300 words per section (3-5 paragraphs)
- Cover different aspects: overview, key concepts, methodology, findings, conclusions, implications, etc.
- Be thorough and detailed - extract all important information
- Use clear, professional language

CONTENT RULES:
- Use ONLY information from the provided context
- Be comprehensive - don't skip important details
- Synthesize information across multiple pages
- Maintain accuracy - do not invent facts
- Write in complete, well-structured paragraphs
- Provide specific details, numbers, names, and concepts from the document

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no code blocks, no extra text):

{{
  "summary": [
    {{
      "title": "Section Title (concise, 3-6 words)",
      "content": "Detailed summary content in paragraph form. Include specific details, key concepts, important findings, and relevant information from the document. Write 3-5 substantial paragraphs covering all important aspects of this section.",
      "icon": "📄"
    }},
    {{
      "title": "Next Section",
      "content": "Another comprehensive section with detailed information...",
      "icon": "🔍"
    }}
  ]
}}

SUGGESTED SECTIONS (adapt based on document type):
- Document Overview / Introduction
- Main Concepts / Key Topics
- Methodology / Approach
- Findings / Results / Content
- Conclusions / Implications
- Additional Details / Context

ICON SELECTION:
Choose appropriate emojis: 📄📊🎯🔍💡🏢📈🔬⚙️📚🌐💼🎓🔧📋

CONTEXT:
{context}

Generate a comprehensive, detailed summary now:
""")

        try:
            # Get more chunks for better coverage
            raw_chunks = self.vector_store.search_similar(
                file_id=self.document_id,
                query="introduction abstract overview summary main content key points findings results conclusion methodology discussion objectives purpose background",
                top_k=30  
            )

            if not raw_chunks:
                print("⚠️ No chunks found for summary")
                return {
                    "summary": [
                        {
                            "title": "Document Overview",
                            "content": "Unable to generate summary - no text content found.",
                            "icon": "📄"
                        }
                    ]
                }

            # Build comprehensive context
            seen_pages = set()
            context_blocks = []

            for chunk in raw_chunks:
                page = chunk.get("page", 0)
                text = chunk.get("content") or chunk.get("text") or ""

                if not text.strip() or page in seen_pages:
                    continue

                seen_pages.add(page)
                # Include more text per chunk for better context
                context_blocks.append(f"(Page {page}) {text[:1500]}")

                # Increase the number of chunks used
                if len(context_blocks) >= 20:  # Increased from 10
                    break

            context = "\n\n".join(context_blocks)
            print(f"📚 Using {len(context_blocks)} chunks for summary (total: {len(context)} chars)")

            # Generate summary with higher temperature for more detailed output
            llm_for_summary = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash-exp",
                google_api_key=os.getenv("GOOGLE_API_KEY"),
                temperature=0.4,  # Slightly higher for more creative/detailed summaries
                max_output_tokens=4096  # Allow longer responses
            )

            response = llm_for_summary.invoke(
                SUMMARY_PROMPT.format(context=context)
            )

            print(f"🤖 Raw response length: {len(response.content)}")

            # Extract and parse JSON
            try:
                result = extract_json_strict(response.content)
                
                # Validate structure
                if "summary" not in result or not isinstance(result["summary"], list):
                    raise ValueError("Invalid summary structure")
                
                # Validate each section
                for section in result["summary"]:
                    if not all(k in section for k in ["title", "content", "icon"]):
                        raise ValueError("Missing required fields in summary section")
                
                # Check if sections are too short
                avg_length = sum(len(s["content"]) for s in result["summary"]) / len(result["summary"])
                print(f"📊 Generated {len(result['summary'])} sections, avg length: {avg_length:.0f} chars")
                
                if avg_length < 200:
                    print("⚠️ Warning: Sections are short. Consider providing more context.")
                
                return result

            except Exception as parse_error:
                print(f"❌ JSON parsing failed: {parse_error}")
                print(f"Raw response: {response.content[:500]}")
                
                # Fallback: return raw content as single section
                return {
                    "summary": [
                        {
                            "title": "Document Summary",
                            "content": response.content.strip()[:1000] + "...",
                            "icon": "📄"
                        }
                    ]
                }

        except Exception as e:
            print(f"❌ Error generating summary: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                "summary": [
                    {
                        "title": "Error",
                        "content": f"Failed to generate summary: {str(e)}",
                        "icon": "⚠️"
                    }
                ]
            }
