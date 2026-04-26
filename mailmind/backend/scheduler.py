from apscheduler.schedulers.background import BackgroundScheduler
from config import settings

scheduler = BackgroundScheduler()

def start_scheduler():
    from services.sync_service import run_sync
    scheduler.add_job(
        run_sync,
        "interval",
        minutes=settings.SYNC_INTERVAL_MINUTES,
        id="email_sync",
        replace_existing=True,
    )
    scheduler.start()
    print(f"[Scheduler] Auto-sync every {settings.SYNC_INTERVAL_MINUTES} minutes")

def stop_scheduler():
    scheduler.shutdown()
