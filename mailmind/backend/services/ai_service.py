from groq import Groq
from config import settings
import json, re
from datetime import datetime

client = Groq(api_key=settings.GROQ_API_KEY)
MODEL="llama-3.3-70b-versatile"

def _chat(messages: list, temperature: float = 0.2, max_tokens: int = 1024) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()

def analyze_email_priority(email: dict) -> dict:
    """Score an email for priority, extract tasks and deadlines."""
    today = datetime.now().strftime("%Y-%m-%d")
    prompt = f"""You are an email assistant. Analyze this email and return ONLY valid JSON, no markdown.

Today's date: {today}

Email:
Subject: {email.get('subject', '')}
From: {email.get('sender', '')}
Date: {email.get('date', '')}
Body: {email.get('body', '')[:1000]}

Return this exact JSON structure:
{{
  "priority_score": <1-10, where 10 is most urgent>,
  "priority_label": "<urgent|high|medium|low>",
  "priority_reason": "<one sentence why>",
  "tasks": [
    {{"task": "<action item>", "deadline": "<YYYY-MM-DD or null>", "deadline_label": "<human readable or null>"}}
  ],
  "has_deadline": <true|false>,
  "deadline_date": "<YYYY-MM-DD or null>",
  "deadline_label": "<e.g. 'Today 5 PM', 'Apr 28' or null>",
  "category": "<action_required|deadline|informational|meeting|invoice|other>",
  "sender_importance": "<boss|client|colleague|vendor|newsletter|unknown>"
}}"""

    try:
        raw = _chat([{"role": "user", "content": prompt}])
        print(f"[AI RAW] {email.get('subject','')[:40]} → {raw[:200]}")
        raw = re.sub(r"```json|```", "", raw).strip()
        result = json.loads(raw)
        print(f"[AI OK] priority={result.get('priority_label')} score={result.get('priority_score')}")
        return result
    except Exception as e:
        print(f"[AI ERROR] {email.get('subject','')[:40]} → {e} | raw={raw[:100] if 'raw' in dir() else 'none'}")
        return {
            "priority_score": 3,
            "priority_label": "low",
            "priority_reason": "Could not analyze",
            "tasks": [],
            "has_deadline": False,
            "deadline_date": None,
            "deadline_label": None,
            "category": "other",
            "sender_importance": "unknown",
        }

def generate_daily_briefing(emails_summary: list[dict]) -> str:
    """Generate the AI daily briefing card text."""
    today = datetime.now().strftime("%A, %B %d %Y")
    summary_text = "\n".join([
        f"- [{e.get('priority_label','?').upper()}] {e.get('subject','?')} from {e.get('sender','?')} | {e.get('deadline_label') or 'no deadline'}"
        for e in emails_summary[:20]
    ])

    prompt = f"""Today is {today}. Based on these emails, write a short 2-3 sentence daily briefing for the user.
Be specific — mention names, deadlines, and counts. Keep it under 60 words. No bullet points. No markdown.

Emails:
{summary_text}"""

    return _chat([{"role": "user", "content": prompt}], temperature=0.4, max_tokens=150)

def chat_with_emails(
    question: str,
    relevant_emails: list[dict],
    history: list[dict],
) -> dict:
    """Answer a user question using RAG-retrieved email context."""
    context = "\n\n---\n\n".join([
        f"Subject: {e['metadata']['subject']}\nFrom: {e['metadata']['sender']}\nDate: {e['metadata']['date']}\n\n{e['document'][:600]}"
        for e in relevant_emails
    ])

    system = f"""You are MailMind, an AI assistant that answers questions about the user's emails.
You have access to retrieved email context below. Answer based ONLY on this context.
If the answer is not in the emails, say so clearly. Be concise and specific.
Always mention the sender name and date when referencing an email.

EMAIL CONTEXT:
{context}

Today: {datetime.now().strftime("%A, %B %d %Y")}"""

    messages = [{"role": "system", "content": system}]
    # Include last 6 turns of history
    for h in history[-6:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": question})

    answer = _chat(messages, temperature=0.3, max_tokens=512)

    sources = [
        {"subject": e["metadata"]["subject"], "sender": e["metadata"]["sender"], "date": e["metadata"]["date"]}
        for e in relevant_emails[:3]
    ]

    return {"answer": answer, "sources": sources}
