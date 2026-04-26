from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from datetime import datetime, timedelta
import base64, re, json, os
from config import settings
from routers.auth import get_credentials

def get_gmail_service():
    creds = get_credentials()
    if not creds:
        raise Exception("Not authenticated")
    return build("gmail", "v1", credentials=creds)

def decode_body(payload):
    """Recursively extract plain text from email payload."""
    if payload.get("mimeType") == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
    if payload.get("mimeType") == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            html = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
            return re.sub(r"<[^>]+>", " ", html)
    for part in payload.get("parts", []):
        result = decode_body(part)
        if result:
            return result
    return ""

def get_header(headers, name):
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""

def fetch_emails(days: int = None):
    days = days or settings.EMAIL_SYNC_DAYS
    service = get_gmail_service()
    after = (datetime.now() - timedelta(days=days)).strftime("%Y/%m/%d")
    query = f"after:{after} -category:promotions -category:social"

    results = service.users().messages().list(
        userId="me", q=query, maxResults=200
    ).execute()

    messages = results.get("messages", [])
    emails = []

    for msg in messages:
        try:
            full = service.users().messages().get(
                userId="me", id=msg["id"], format="full"
            ).execute()
            headers = full["payload"].get("headers", [])
            body = decode_body(full["payload"])[:2000]  # cap at 2000 chars

            email = {
                "id": full["id"],
                "thread_id": full.get("threadId", ""),
                "subject": get_header(headers, "Subject") or "(no subject)",
                "sender": get_header(headers, "From"),
                "to": get_header(headers, "To"),
                "date": get_header(headers, "Date"),
                "snippet": full.get("snippet", ""),
                "body": body,
                "labels": full.get("labelIds", []),
            }
            emails.append(email)
        except Exception as e:
            print(f"Error fetching message {msg['id']}: {e}")
            continue

    return emails
