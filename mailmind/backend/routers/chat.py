from fastapi import APIRouter
from pydantic import BaseModel
from services.rag_service import query_emails
from services.ai_service import chat_with_emails

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    history: list[ChatMessage] = []

@router.post("/")
def chat(body: ChatRequest):
    # RAG: retrieve relevant emails
    relevant = query_emails(body.question, n_results=8)

    if not relevant:
        return {
            "answer": "I don't have any emails indexed yet. Please connect your Gmail and wait for the sync to complete.",
            "sources": [],
        }

    history = [{"role": m.role, "content": m.content} for m in body.history]
    result = chat_with_emails(body.question, relevant, history)
    return result
