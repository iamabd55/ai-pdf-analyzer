import os
from langchain.chains import RetrievalQA
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

class QAChain:
    def __init__(self, vectorstore, k=3):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.2
        )

        self.chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=vectorstore.as_retriever(search_kwargs={"k": k}),
            return_source_documents=True
        )

    def ask(self, question: str):
        result = self.chain.invoke({"query": question})

        return {
            "answer": result["result"],
            "sources": [
                {
                    "page": doc.metadata.get("page"),
                    "content": doc.page_content[:200]
                }
                for doc in result.get("source_documents", [])
            ]
        }