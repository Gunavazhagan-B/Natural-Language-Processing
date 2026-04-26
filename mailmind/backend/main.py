from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, emails, tasks, chat
from scheduler import start_scheduler, stop_scheduler
import uvicorn

app = FastAPI(title="MailMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(emails.router, prefix="/emails", tags=["emails"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])

@app.on_event("startup")
def startup():
    start_scheduler()

@app.on_event("shutdown")
def shutdown():
    stop_scheduler()

@app.get("/")
def root():
    return {"status": "MailMind API running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
