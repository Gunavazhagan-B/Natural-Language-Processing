from fastapi import APIRouter, BackgroundTasks, HTTPException
from services.sync_service import run_sync, get_dashboard_data, mark_task_done
from services.rag_service import get_indexed_count

router = APIRouter()

@router.post("/sync")
async def sync_emails(background_tasks: BackgroundTasks):
    """Trigger a manual sync (runs in background)."""
    background_tasks.add_task(run_sync)
    return {"message": "Sync started in background"}

@router.post("/sync/blocking")
def sync_emails_blocking():
    """Trigger sync and wait for it (used on first connect)."""
    result = run_sync()
    return result

@router.get("/dashboard")
def dashboard():
    return get_dashboard_data()

@router.get("/count")
def email_count():
    return {"count": get_indexed_count()}
