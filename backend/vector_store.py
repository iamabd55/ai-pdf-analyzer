import os
from typing import List, Dict
from supabase import create_client
from langchain_google_genai.embeddings import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv()


class VectorStore:
    def __init__(self):
        print("🔧 Initializing VectorStore...")
        
        # Supabase setup
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

        # Google embeddings (768 dimensions)
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in .env")

        self.embedding_model = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=api_key
        )
        
        print("✅ VectorStore initialized with Google embeddings (768 dimensions)")

    def store_chunk(self, file_id: str, chunk_id: int, page: int, text: str):
        """Store a single chunk with its embedding"""
        try:
            # Generate 768-dimensional embedding
            embedding = self.embedding_model.embed_query(text)
            
            # Verify dimension
            if len(embedding) != 768:
                raise ValueError(f"Expected 768 dimensions, got {len(embedding)}")
            
            # Insert into Supabase
            self.supabase.table("embeddings").insert({
                "file_id": file_id,
                "chunk_id": chunk_id,
                "page": page,
                "content": text,
                "embedding": embedding
            }).execute()
            
        except Exception as e:
            print(f"❌ Error storing chunk {chunk_id}: {e}")
            raise

    def store_chunks_batch(self, file_id: str, chunks: List[Dict]):
        """
        Store multiple chunks in batch for better performance.
        
        Args:
            file_id: Document identifier
            chunks: List of dicts with keys: chunk_id, page, text
        """
        if not chunks:
            return
        
        print(f"📦 Batch processing {len(chunks)} chunks...")
        
        try:
            # Generate embeddings for all chunks
            texts = [chunk["text"] for chunk in chunks]
            embeddings = self.embedding_model.embed_documents(texts)
            
            # Prepare batch insert data
            batch_data = []
            for chunk, embedding in zip(chunks, embeddings):
                if len(embedding) != 768:
                    print(f"⚠️ Skipping chunk {chunk['chunk_id']} - wrong dimension: {len(embedding)}")
                    continue
                
                batch_data.append({
                    "file_id": file_id,
                    "chunk_id": chunk["chunk_id"],
                    "page": chunk["page"],
                    "content": chunk["text"],
                    "embedding": embedding
                })
            
            # Insert all at once
            if batch_data:
                self.supabase.table("embeddings").insert(batch_data).execute()
                print(f"✅ Stored {len(batch_data)} chunks")
            
        except Exception as e:
            print(f"❌ Batch storage error: {e}")
            # Fallback to individual inserts
            print("⚠️ Falling back to individual inserts...")
            for chunk in chunks:
                try:
                    self.store_chunk(
                        file_id=file_id,
                        chunk_id=chunk["chunk_id"],
                        page=chunk["page"],
                        text=chunk["text"]
                    )
                except Exception as chunk_error:
                    print(f"❌ Failed to store chunk {chunk['chunk_id']}: {chunk_error}")

    def search_similar(self, file_id: str, query: str, top_k: int = 5) -> List[Dict]:
        """
        Search for similar chunks using vector similarity.
        
        Args:
            file_id: Document identifier
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of similar chunks with metadata
        """
        try:
            print(f"🔍 Searching for: '{query[:50]}...'")
            
            # Generate query embedding
            query_embedding = self.embedding_model.embed_query(query)
            
            if len(query_embedding) != 768:
                raise ValueError(f"Query embedding has wrong dimension: {len(query_embedding)}")
            
            # Use Supabase RPC function for vector search
            result = self.supabase.rpc(
                "match_embeddings",
                {
                    "query_embedding": query_embedding,
                    "match_count": top_k,
                    "filter_file_id": file_id
                }
            ).execute()
            
            chunks = result.data if result.data else []
            print(f"✅ Found {len(chunks)} similar chunks")
            
            return chunks
            
        except Exception as e:
            print(f"❌ Search error: {e}")
            import traceback
            traceback.print_exc()
            return []

    def get_all_chunks(self, file_id: str) -> List[Dict]:
        """Get all chunks for a specific file"""
        try:
            result = self.supabase.table("embeddings")\
                .select("*")\
                .eq("file_id", file_id)\
                .order("chunk_id")\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            print(f"❌ Error getting chunks: {e}")
            return []

    def delete_file_embeddings(self, file_id: str):
        """Delete all embeddings for a specific file"""
        try:
            result = self.supabase.table("embeddings")\
                .delete()\
                .eq("file_id", file_id)\
                .execute()
            
            print(f"✅ Deleted embeddings for file {file_id}")
            return result
            
        except Exception as e:
            print(f"❌ Error deleting embeddings: {e}")
            raise

    def get_document_stats(self, file_id: str) -> Dict:
        """Get statistics about stored embeddings for a document"""
        try:
            result = self.supabase.table("embeddings")\
                .select("chunk_id, page")\
                .eq("file_id", file_id)\
                .execute()
            
            if not result.data:
                return {"total_chunks": 0, "pages": []}
            
            chunks = result.data
            pages = list(set(chunk["page"] for chunk in chunks))
            
            return {
                "total_chunks": len(chunks),
                "pages": sorted(pages),
                "page_count": len(pages)
            }
            
        except Exception as e:
            print(f"❌ Error getting stats: {e}")
            return {"total_chunks": 0, "pages": [], "error": str(e)}
