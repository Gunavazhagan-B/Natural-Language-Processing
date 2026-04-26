from fastapi import APIRouter
from pydantic import BaseModel
from services.sync_service import mark_task_done

router = APIRouter()

class ToggleTask(BaseModel):
    email_id: str
    task_index: int

@router.post("/toggle")
def toggle_task(body: ToggleTask):
    success = mark_task_done(body.email_id, body.task_index)
    return {"success": success}
