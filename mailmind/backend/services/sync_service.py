import json, os
from datetime import datetime
from services.gmail_service import fetch_emails
from services.rag_service import index_emails, get_all_for_analysis, get_indexed_count
from services.ai_service import analyze_email_priority, generate_daily_briefing

ANALYZED_CACHE = "./analyzed_emails.json"
BRIEFING_CACHE = "./briefing_cache.json"

def load_analyzed() -> dict:
    if os.path.exists(ANALYZED_CACHE):
        with open(ANALYZED_CACHE) as f:
            return json.load(f)
    return {}

def save_analyzed(data: dict):
    with open(ANALYZED_CACHE, "w") as f:
        json.dump(data, f)

def run_sync() -> dict:
    """Full sync: fetch → index → analyze. Returns stats."""
    print(f"[Sync] Starting at {datetime.now().isoformat()}")

    # 1. Fetch from Gmail
    emails = fetch_emails()
    print(f"[Sync] Fetched {len(emails)} emails")

    # 2. Index into ChromaDB (skips already-indexed)
    new_count = index_emails(emails)
    print(f"[Sync] Indexed {new_count} new emails")

    # 3. AI-analyze emails not yet analyzed
    analyzed = load_analyzed()
    new_analyses = 0
    import time
    for email in emails:
        eid = email["id"]
        if eid not in analyzed:
            analysis = analyze_email_priority(email)
            analyzed[eid] = {**email, **analysis, "analyzed_at": datetime.now().isoformat()}
            new_analyses += 1
            # Save every 10 emails and pause to avoid Groq rate limits
            if new_analyses % 10 == 0:
                save_analyzed(analyzed)
                time.sleep(1)
    save_analyzed(analyzed)
    print(f"[Sync] Analyzed {new_analyses} new emails")

    # 4. Regenerate daily briefing if we have data
    if analyzed:
        top = sorted(
            analyzed.values(),
            key=lambda x: x.get("priority_score", 0),
            reverse=True
        )[:15]
        briefing = generate_daily_briefing(top)
        with open(BRIEFING_CACHE, "w") as f:
            json.dump({"briefing": briefing, "generated_at": datetime.now().isoformat()}, f)

    return {
        "fetched": len(emails),
        "new_indexed": new_count,
        "new_analyzed": new_analyses,
        "total_indexed": get_indexed_count(),
    }

def get_dashboard_data() -> dict:
    """Assemble all data for the dashboard."""
    analyzed = load_analyzed()

    # Load briefing
    briefing = "No briefing yet. Sync your emails to get started."
    if os.path.exists(BRIEFING_CACHE):
        with open(BRIEFING_CACHE) as f:
            data = json.load(f)
            briefing = data.get("briefing", briefing)

    emails_list = list(analyzed.values())

    # Priority inbox — sort by score desc
    priority_inbox = sorted(
        emails_list, key=lambda x: x.get("priority_score", 0), reverse=True
    )[:50]

    # All tasks
    all_tasks = []
    for e in emails_list:
        for task in e.get("tasks", []):
            all_tasks.append({
                "email_id": e["id"],
                "email_subject": e["subject"],
                "sender": e["sender"],
                **task,
                "done": task.get("done", False),
            })

    # Deadlines
    deadlines = [e for e in emails_list if e.get("has_deadline") and e.get("deadline_date")]
    deadlines = sorted(deadlines, key=lambda x: x.get("deadline_date", ""))[:20]

    # Stats
    urgent = sum(1 for e in emails_list if e.get("priority_label") == "urgent")
    high = sum(1 for e in emails_list if e.get("priority_label") == "high")
    tasks_pending = sum(1 for t in all_tasks if not t.get("done"))

    return {
        "briefing": briefing,
        "stats": {
            "total_emails": len(emails_list),
            "urgent": urgent,
            "high": high,
            "tasks_total": len(all_tasks),
            "tasks_pending": tasks_pending,
            "deadlines_count": len(deadlines),
        },
        "priority_inbox": priority_inbox[:20],
        "tasks": all_tasks[:30],
        "deadlines": deadlines[:10],
    }

def mark_task_done(email_id: str, task_index: int) -> bool:
    analyzed = load_analyzed()
    if email_id in analyzed:
        tasks = analyzed[email_id].get("tasks", [])
        if 0 <= task_index < len(tasks):
            tasks[task_index]["done"] = not tasks[task_index].get("done", False)
            analyzed[email_id]["tasks"] = tasks
            save_analyzed(analyzed)
            return True
    return False
