import chromadb
from chromadb.utils import embedding_functions
from config import settings
import json

# Use the default sentence-transformers embedding (runs locally, no API key needed)
ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
collection = client.get_or_create_collection(
    name="emails",
    embedding_function=ef,
    metadata={"hnsw:space": "cosine"},
)

def index_emails(emails: list[dict]):
    """Embed and store emails in ChromaDB."""
    if not emails:
        return 0

    ids = []
    documents = []
    metadatas = []

    existing = set(collection.get()["ids"])

    for email in emails:
        eid = email["id"]
        if eid in existing:
            continue  # skip already indexed

        # Build the text to embed: subject + sender + body snippet
        text = f"Subject: {email['subject']}\nFrom: {email['sender']}\nDate: {email['date']}\n\n{email['body']}"

        ids.append(eid)
        documents.append(text[:3000])
        metadatas.append({
            "subject": email["subject"][:200],
            "sender": email["sender"][:200],
            "date": email["date"][:100],
            "snippet": email["snippet"][:300],
            "thread_id": email.get("thread_id", ""),
            "labels": json.dumps(email.get("labels", [])),
        })

    if ids:
        collection.add(ids=ids, documents=documents, metadatas=metadatas)

    return len(ids)

def query_emails(query_text: str, n_results: int = 8) -> list[dict]:
    """Retrieve the most relevant emails for a query."""
    count = collection.count()
    if count == 0:
        return []

    results = collection.query(
        query_texts=[query_text],
        n_results=min(n_results, count),
    )

    emails = []
    for i in range(len(results["ids"][0])):
        emails.append({
            "id": results["ids"][0][i],
            "document": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })
    return emails

def get_all_for_analysis(limit: int = 100) -> list[dict]:
    """Get recent emails for dashboard analysis."""
    result = collection.get(limit=limit)
    emails = []
    for i in range(len(result["ids"])):
        emails.append({
            "id": result["ids"][i],
            "document": result["documents"][i],
            "metadata": result["metadatas"][i],
        })
    return emails

def get_indexed_count() -> int:
    return collection.count()
