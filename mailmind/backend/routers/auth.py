from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import json, os
from config import settings

router = APIRouter()

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

TOKEN_FILE = "./token.json"

def get_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )

def get_credentials():
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE) as f:
        data = json.load(f)
    return Credentials(
        token=data.get("token"),
        refresh_token=data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )

def save_credentials(creds: Credentials):
    with open(TOKEN_FILE, "w") as f:
        json.dump({
            "token": creds.token,
            "refresh_token": creds.refresh_token,
        }, f)

@router.get("/login")
def login():
    flow = get_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return {"auth_url": auth_url}

@router.get("/callback")
def callback(code: str, state: str = None):
    flow = get_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    save_credentials(creds)
    # Redirect to frontend after successful login
    return RedirectResponse("http://localhost:5173/?connected=true")

@router.get("/status")
def status():
    creds = get_credentials()
    if not creds:
        return {"connected": False, "user": None}
    try:
        service = build("oauth2", "v2", credentials=creds)
        info = service.userinfo().get().execute()
        return {"connected": True, "user": {"name": info.get("name"), "email": info.get("email"), "picture": info.get("picture")}}
    except Exception:
        return {"connected": False, "user": None}

@router.post("/logout")
def logout():
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
    return {"success": True}
