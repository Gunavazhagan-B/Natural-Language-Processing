# MailMind — Complete Project Documentation

> An AI-powered email intelligence dashboard that reads your Gmail, scores priority, extracts tasks and deadlines, and lets you chat with your inbox using RAG (Retrieval-Augmented Generation) and Groq's LLaMA 3.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [How It All Works Together](#2-how-it-all-works-together)
3. [Core Concepts Explained](#3-core-concepts-explained)
4. [Backend — Complete File Reference](#4-backend--complete-file-reference)
5. [API Endpoints](#5-api-endpoints)
6. [Data Flow — Step by Step](#6-data-flow--step-by-step)
7. [Configuration Reference](#7-configuration-reference)
8. [Rate Limits and Groq Free Tier](#8-rate-limits-and-groq-free-tier)
9. [Local Data Files](#9-local-data-files)
10. [Common Errors and Fixes](#10-common-errors-and-fixes)
11. [How to Reset Everything](#11-how-to-reset-everything)

---

## 1. Project Overview

MailMind is a **fully local, privacy-first** email assistant. Nothing is sent to any external server except:
- Gmail API (to read your emails — read-only)
- Groq API (to analyze email content with AI)

All processed data — the vector database, the analysis cache, the AI briefing — lives on your machine inside the `backend/` folder.

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend API | FastAPI (Python) | Serves all data to the frontend |
| Email source | Gmail API (Google) | Reads emails via OAuth 2.0 |
| AI model | Groq — LLaMA 3 | Priority scoring, task extraction, chat |
| Vector database | ChromaDB | Stores email embeddings for RAG search |
| Embeddings | sentence-transformers | Converts email text to vectors locally |
| Task scheduler | APScheduler | Auto-syncs emails every N minutes |
| Frontend | React + Vite | The UI (not covered in this document) |

---

## 2. How It All Works Together

```
Gmail API
    │
    ▼
gmail_service.py        ← Fetches raw emails from Gmail
    │
    ▼
rag_service.py          ← Embeds emails → stores in ChromaDB
    │
    ▼
ai_service.py           ← Sends each email to Groq for analysis
    │                      (priority score, tasks, deadlines)
    ▼
sync_service.py         ← Orchestrates all of the above,
    │                      saves results to analyzed_emails.json
    ▼
routers/                ← FastAPI endpoints serve this data
    │                      to the React frontend
    ▼
Frontend Dashboard      ← Displays priority inbox, tasks,
                           deadlines, briefing, analytics

User asks a question in chat
    │
    ▼
rag_service.py          ← Searches ChromaDB for relevant emails
    │                      (semantic similarity search)
    ▼
ai_service.py           ← Sends question + retrieved emails
                           to Groq → returns answer with sources
```

---

## 3. Core Concepts Explained

### What is RAG?

RAG stands for **Retrieval-Augmented Generation**. Instead of asking the AI to remember all your emails (impossible — too many tokens), we:

1. **Store** all emails as mathematical vectors (embeddings) in ChromaDB
2. When you ask a question, **retrieve** the most semantically similar emails
3. **Send** only those relevant emails + your question to the AI
4. The AI **generates** an answer grounded in your actual email content

This is why the chat can answer "what did Maya say about the proposal?" — it finds Maya's email via vector similarity, not keyword search.

### What are Embeddings?

An embedding is a list of numbers (a vector) that represents the meaning of a piece of text. Two emails about the same topic will have vectors that are mathematically close to each other, even if they use different words. We use the `all-MiniLM-L6-v2` model from sentence-transformers to generate these — it runs entirely on your CPU, no API needed.

### What is ChromaDB?

ChromaDB is a vector database — it stores embeddings and lets you search them by similarity. When you ask "any emails about deadlines?", ChromaDB finds the emails whose embeddings are closest to the embedding of your question. It persists to disk in the `chroma_db/` folder.

### What is OAuth 2.0?

OAuth 2.0 is the secure login standard Google uses. Instead of giving MailMind your Gmail password, you authorize it through Google's own login page. Google then gives MailMind a temporary access token. This token is saved in `token.json` and used for all Gmail API calls. MailMind only requests **read-only** access — it cannot send, delete, or modify any emails.

---

## 4. Backend — Complete File Reference

### `main.py`
**The entry point of the entire backend.**

This is the FastAPI application file. It does four things:
- Creates the FastAPI app instance
- Adds CORS middleware so the React frontend (on port 5173) can talk to the backend (on port 8000)
- Registers all the routers (auth, emails, tasks, chat) with their URL prefixes
- Starts and stops the APScheduler background job when the server starts/stops

```
uvicorn main:app --reload --port 8000
```
This command tells uvicorn to run the `app` object inside `main.py`. The `--reload` flag makes it restart automatically when you edit any Python file.

---

### `config.py`
**Loads all environment variables from `.env` into a typed settings object.**

Uses `pydantic-settings` to read the `.env` file and expose all configuration as a Python object (`settings`). Any file in the backend can do `from config import settings` and access `settings.GROQ_API_KEY`, `settings.EMAIL_SYNC_DAYS`, etc.

If a required variable (like `GOOGLE_CLIENT_ID`) is missing from `.env`, the app will refuse to start and tell you exactly which variable is missing.

---

### `.env`
**The secrets and configuration file. Never commit this to Git.**

Contains:

| Variable | What it is | Where to get it |
|----------|-----------|----------------|
| `GOOGLE_CLIENT_ID` | OAuth client identifier | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Google Cloud Console → Credentials |
| `GOOGLE_REDIRECT_URI` | Where Google sends users after login | Always `http://localhost:8000/auth/callback` |
| `GROQ_API_KEY` | API key for Groq LLM | console.groq.com |
| `EMAIL_SYNC_DAYS` | How many days of emails to fetch | Set yourself (recommend: 7) |
| `SYNC_INTERVAL_MINUTES` | How often auto-sync runs | Set yourself (default: 5) |
| `CHROMA_DB_PATH` | Where ChromaDB stores its files | Default: `./chroma_db` |
| `SECRET_KEY` | For signing sessions | Any random string |

---

### `scheduler.py`
**Runs the email sync automatically in the background every N minutes.**

Uses `APScheduler`'s `BackgroundScheduler` — a library that runs jobs on a timer without blocking the main server. When FastAPI starts (`startup` event in `main.py`), it calls `start_scheduler()` which registers `run_sync` to execute every `SYNC_INTERVAL_MINUTES` minutes.

This means even if you never click "Sync now", new emails will be fetched and analyzed automatically. Only **new** emails (not already in `analyzed_emails.json`) get processed on each auto-sync, so it's fast after the first run.

---

### `routers/auth.py`
**Handles all Google OAuth 2.0 login, callback, and session management.**

#### How the OAuth flow works:

```
User clicks "Connect Gmail"
    │
    ▼
Frontend calls GET /auth/login
    │
    ▼
auth.py builds a Google authorization URL using the client ID,
requested scopes, and redirect URI
    │
    ▼
Frontend redirects user to Google's login page
    │
    ▼
User logs in and approves access on Google's page
    │
    ▼
Google redirects to GET /auth/callback?code=xxxxx
    │
    ▼
auth.py exchanges the code for access + refresh tokens
Saves tokens to token.json
    │
    ▼
Redirects user back to http://localhost:5173/?connected=true
```

#### Scopes requested:
- `gmail.readonly` — read emails
- `openid` — basic identity
- `userinfo.email` — user's email address
- `userinfo.profile` — user's name and picture

#### Key functions:

`get_flow()` — Creates a Google OAuth flow object configured with your client ID, secret, and redirect URI.

`get_credentials()` — Reads `token.json` and returns a `Credentials` object that can be used to make authenticated Gmail API calls.

`save_credentials()` — Writes the access and refresh tokens to `token.json` after successful login.

`GET /auth/login` — Returns the Google authorization URL. The frontend redirects to this URL.

`GET /auth/callback` — Google calls this after the user approves. Exchanges the auth code for tokens and saves them.

`GET /auth/status` — Checks if `token.json` exists and is valid. Returns the user's name, email, and profile picture if connected.

`POST /auth/logout` — Deletes `token.json`, effectively disconnecting the Gmail account.

---

### `routers/emails.py`
**Exposes HTTP endpoints for triggering syncs and fetching dashboard data.**

`POST /emails/sync` — Triggers a sync in the background (non-blocking). The frontend doesn't wait for it to finish.

`POST /emails/sync/blocking` — Triggers a sync and waits for it to complete before responding. Used on first connect so the frontend can show a loading modal until data is ready.

`GET /emails/dashboard` — Returns all dashboard data in one response: briefing text, stats, priority inbox list, tasks list, deadlines list. The frontend calls this on load and every 5 minutes.

`GET /emails/count` — Returns just the count of indexed emails in ChromaDB.

---

### `routers/tasks.py`
**Handles marking tasks as done or undone.**

`POST /tasks/toggle` — Accepts `email_id` and `task_index`. Finds that specific task inside `analyzed_emails.json` and flips its `done` field between `true` and `false`. This is how the checkbox in the UI works.

---

### `routers/chat.py`
**The RAG chat endpoint — the core intelligence feature.**

`POST /chat/` — Accepts a `question` (string) and `history` (list of previous messages). Does the following:
1. Calls `query_emails()` to find the 8 most semantically relevant emails from ChromaDB
2. Passes those emails + the question + conversation history to `chat_with_emails()` in `ai_service.py`
3. Returns the AI's answer along with source citations (which emails it used)

If no emails are indexed yet, it returns a friendly message asking the user to sync first.

---

### `services/gmail_service.py`
**Fetches and parses emails from the Gmail API.**

#### `get_gmail_service()`
Loads credentials from `token.json` and builds an authenticated Gmail API client using Google's `googleapiclient` library.

#### `decode_body(payload)`
Gmail returns email bodies in a complex nested structure (`MIME` format). This function recursively walks the payload tree to extract the plain text content. It handles:
- `text/plain` — direct plain text, base64 decoded
- `text/html` — strips HTML tags with regex to get readable text
- Multipart emails — recursively checks each part

#### `get_header(headers, name)`
Gmail returns headers as a list of `{name, value}` dicts. This helper finds a specific header (like `Subject`, `From`, `Date`) by name.

#### `fetch_emails(days)`
The main function. It:
1. Calculates a date `N` days ago and builds a Gmail search query: `after:YYYY/MM/DD -category:promotions -category:social`
2. Calls `users().messages().list()` to get up to 200 message IDs
3. For each message ID, calls `users().messages().get()` to fetch the full email
4. Extracts subject, sender, date, body (capped at 2000 chars), snippet, and labels
5. Returns a list of email dicts

The body is capped at 2000 characters to stay within Groq's token limits during analysis.

---

### `services/rag_service.py`
**The vector database layer — stores and retrieves emails by semantic meaning.**

#### Embedding model
Uses `SentenceTransformerEmbeddingFunction` with `all-MiniLM-L6-v2`. This model:
- Runs entirely locally on your CPU
- Converts text into 384-dimensional vectors
- Downloads automatically on first run (~90MB)
- Is fast and accurate enough for email similarity search

#### ChromaDB setup
Creates a persistent ChromaDB client that saves data to `./chroma_db/`. Uses cosine similarity (`hnsw:space: cosine`) which measures the angle between vectors — better for text than Euclidean distance.

#### `index_emails(emails)`
Takes a list of email dicts and adds new ones to ChromaDB. For each email:
- Builds a text document: `Subject + From + Date + Body`
- Stores the document + metadata (subject, sender, date, snippet, thread_id)
- Skips emails already in the collection (checks existing IDs)
- Returns the count of newly indexed emails

#### `query_emails(query_text, n_results)`
The retrieval step of RAG. Takes a natural language query, embeds it using the same model, and finds the `n_results` most similar emails in ChromaDB. Returns them sorted by relevance (distance score).

#### `get_all_for_analysis(limit)`
Returns up to `limit` emails from ChromaDB without any similarity search. Used to get emails for dashboard analysis.

#### `get_indexed_count()`
Returns the total number of emails stored in ChromaDB.

---

### `services/ai_service.py`
**All Groq AI interactions — priority scoring, task extraction, briefing generation, and chat.**

#### `_chat(messages, temperature, max_tokens)`
The base function that calls the Groq API. All other functions in this file use it. Takes a list of messages in OpenAI-compatible format (`[{role, content}]`) and returns the model's response as a string.

#### `analyze_email_priority(email)`
The most called function — runs once per email during sync. Sends a structured prompt to Groq asking it to analyze one email and return a JSON object with:

- `priority_score` — 1 to 10 (10 = most urgent)
- `priority_label` — `urgent`, `high`, `medium`, or `low`
- `priority_reason` — one sentence explaining why
- `tasks` — list of action items extracted from the email
- `has_deadline` — true/false
- `deadline_date` — ISO date string or null
- `deadline_label` — human-readable like "Today 5 PM" or "Apr 28"
- `category` — `action_required`, `deadline`, `meeting`, `invoice`, `informational`, or `other`
- `sender_importance` — `boss`, `client`, `colleague`, `vendor`, `newsletter`, or `unknown`

The prompt explicitly asks for JSON only (no markdown). The response is parsed with `json.loads()`. If parsing fails, a default low-priority result is returned so one bad email doesn't break the whole sync.

**Why this is expensive on tokens:** Each email analysis sends the full subject + body (up to 1000 chars) + the JSON schema prompt to Groq. With the free tier's 100,000 token/day limit, you can analyze roughly 80–120 emails per day depending on email length.

#### `generate_daily_briefing(emails_summary)`
Takes the top 15 highest-priority analyzed emails and asks Groq to write a 2–3 sentence natural language briefing. The briefing is specific — it mentions names, deadlines, and counts. Runs once at the end of each sync and cached in `briefing_cache.json`.

#### `chat_with_emails(question, relevant_emails, history)`
The generation step of RAG. Builds a system prompt that includes:
- The retrieved email context (up to 8 emails, 600 chars each)
- Today's date
- Instructions to only answer from the provided context

Then appends the last 6 turns of conversation history and the user's question. Sends the full message chain to Groq and returns the answer along with source citations.

The conversation history is included so the AI can handle follow-up questions like "tell me more about that" correctly.

---

### `services/sync_service.py`
**The orchestrator — coordinates the full fetch → index → analyze pipeline.**

#### `run_sync()`
The main sync function called by both the scheduler and the `/emails/sync` endpoints. Steps:

1. **Fetch** — calls `fetch_emails()` to get raw emails from Gmail
2. **Index** — calls `index_emails()` to embed and store new emails in ChromaDB
3. **Analyze** — loops through emails, calls `analyze_email_priority()` for any not yet in `analyzed_emails.json`, saves every 10 emails (so progress isn't lost if it crashes), and pauses 1 second every 10 emails to respect Groq's rate limits
4. **Briefing** — takes the top 15 by priority score, calls `generate_daily_briefing()`, saves result to `briefing_cache.json`
5. Returns stats: how many emails fetched, indexed, analyzed

#### `get_dashboard_data()`
Assembles the complete dashboard response from local cache files. Reads `analyzed_emails.json` and `briefing_cache.json` and builds:
- **Briefing** — from `briefing_cache.json`
- **Stats** — counts of urgent, high, pending tasks, deadlines
- **Priority inbox** — all emails sorted by `priority_score` descending, top 20
- **Tasks** — all tasks extracted across all emails, top 30
- **Deadlines** — emails where `has_deadline=true`, sorted by `deadline_date`

This function never calls Gmail or Groq — it only reads local JSON. That's why the dashboard loads instantly.

#### `mark_task_done(email_id, task_index)`
Finds a specific task by email ID and index position in `analyzed_emails.json`, toggles its `done` field, and saves the file.

---

## 5. API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/auth/login` | Returns Google OAuth URL |
| GET | `/auth/callback` | OAuth callback, saves token |
| GET | `/auth/status` | Returns connected user info |
| POST | `/auth/logout` | Deletes token.json |
| POST | `/emails/sync` | Background sync (non-blocking) |
| POST | `/emails/sync/blocking` | Sync and wait (used on first connect) |
| GET | `/emails/dashboard` | All dashboard data |
| GET | `/emails/count` | Number of indexed emails |
| POST | `/tasks/toggle` | Toggle task done/undone |
| POST | `/chat/` | RAG chat question |

You can explore all endpoints interactively at:
```
http://localhost:8000/docs
```
FastAPI generates this Swagger UI automatically.

---

## 6. Data Flow — Step by Step

### First-time connect

```
1. User clicks "Connect Gmail"
2. Frontend → GET /auth/login → gets Google URL
3. User approves on Google → redirected to /auth/callback
4. token.json created with access + refresh tokens
5. Frontend detects ?connected=true → calls POST /emails/sync/blocking
6. gmail_service fetches last N days of emails from Gmail API
7. rag_service embeds each email → stored in chroma_db/
8. ai_service analyzes each email with Groq (rate-limited, ~1s pause per 10)
9. Results saved to analyzed_emails.json
10. ai_service generates daily briefing → saved to briefing_cache.json
11. Frontend calls GET /emails/dashboard → displays everything
```

### Auto-sync (every N minutes)

```
1. APScheduler triggers run_sync()
2. Gmail API fetched for new emails since last sync
3. Only NEW emails (not in analyzed_emails.json) get embedded + analyzed
4. briefing_cache.json regenerated with latest data
5. Next time frontend polls GET /emails/dashboard, it gets fresh data
```

### Chat question

```
1. User types "What did Ravi say about the budget?"
2. Frontend → POST /chat/ {question, history}
3. rag_service.query_emails() embeds the question → searches ChromaDB
4. Returns 8 most relevant emails (by cosine similarity)
5. ai_service.chat_with_emails() builds prompt with those emails as context
6. Groq generates answer referencing actual email content
7. Returns answer + source citations (sender, date)
8. Frontend displays answer with source tags
```

---

## 7. Configuration Reference

All settings live in `backend/.env`:

```env
# Google OAuth — from console.cloud.google.com
GOOGLE_CLIENT_ID=123456-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback

# Groq AI — from console.groq.com
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx

# Email settings
EMAIL_SYNC_DAYS=7          # Days of history to fetch on first sync
SYNC_INTERVAL_MINUTES=5    # How often auto-sync runs

# Storage
CHROMA_DB_PATH=./chroma_db # Where vector DB files are saved

# Security
SECRET_KEY=any_random_string_here
```

### Changing the AI model

In `services/ai_service.py`, line 4:

```python
MODEL = "llama-3.3-70b-versatile"   # Smarter, uses more tokens
MODEL = "llama3-8b-8192"            # Faster, uses ~4x fewer tokens
MODEL = "mixtral-8x7b-32768"        # Good balance, large context window
```

Use `llama3-8b-8192` if you keep hitting the daily token limit.

---

## 8. Rate Limits and Groq Free Tier

The Groq free tier has these limits:

| Limit | Value |
|-------|-------|
| Tokens per day | 100,000 |
| Requests per minute | 30 |

### Token budget calculation

Each email analysis uses roughly:
- Prompt template: ~300 tokens
- Email body (capped at 1000 chars): ~250 tokens
- Response JSON: ~200 tokens
- **Total per email: ~750 tokens**

With 100,000 tokens/day: `100,000 ÷ 750 ≈ 133 emails` max per day.

With `EMAIL_SYNC_DAYS=7` and ~20 emails/day = ~140 emails → right at the limit.
With `EMAIL_SYNC_DAYS=3` and ~20 emails/day = ~60 emails → safe with tokens to spare for chat.

### How the rate limit pause works

In `sync_service.py`, every 10 emails analyzed:
```python
if new_analyses % 10 == 0:
    save_analyzed(analyzed)  # Save progress
    time.sleep(1)            # 1 second pause
```
This prevents hitting the per-minute request limit (30 RPM). After the first sync, only new emails get analyzed so this pause rarely triggers.

---

## 9. Local Data Files

These files are created automatically in `backend/` during runtime:

### `token.json`
Stores your Gmail OAuth access and refresh tokens. Delete this to log out / disconnect Gmail. Google's refresh token means you don't need to re-approve every time — only delete this intentionally.

### `analyzed_emails.json`
A JSON dictionary keyed by email ID. Each entry contains the raw email data merged with the AI analysis result:
```json
{
  "email_id_abc": {
    "id": "email_id_abc",
    "subject": "Project proposal",
    "sender": "Maya Chen <maya@acme.com>",
    "body": "...",
    "priority_score": 9,
    "priority_label": "urgent",
    "priority_reason": "Sign-off required by EOD",
    "tasks": [{"task": "Sign proposal", "deadline": "2026-04-26", "done": false}],
    "has_deadline": true,
    "deadline_date": "2026-04-26",
    "category": "action_required",
    "analyzed_at": "2026-04-26T10:32:00"
  }
}
```
Delete this to force re-analysis of all emails on next sync.

### `briefing_cache.json`
Stores the last generated AI briefing text and when it was generated. Regenerated at the end of every sync.

### `chroma_db/`
The ChromaDB vector store directory. Contains binary files with all email embeddings. Delete this folder to clear the vector index — emails will be re-embedded on next sync (fast, no API calls needed).

---

## 10. Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `np.float_ was removed` | NumPy 2.0 incompatible with ChromaDB | `pip install numpy==1.26.4 chromadb==0.4.24` |
| `model_decommissioned` | Groq retired llama3-70b | Change MODEL to `llama-3.3-70b-versatile` in ai_service.py |
| `Rate limit reached` (429) | Hit Groq daily token limit | Wait 24h, reduce EMAIL_SYNC_DAYS, or switch to llama3-8b-8192 |
| `Could not analyze` on emails | AI failed during sync (bad model/rate limit) | Delete analyzed_emails.json + chroma_db/, re-sync |
| `Not authenticated` | token.json missing or expired | Re-login via Connect Gmail |
| CORS error in browser | Frontend/backend port mismatch | Ensure frontend is on 5173, backend on 8000 |
| `Failed to resolve import StatsRow` | Wrong import in DashboardPage | Import from `../components/Briefing`, not a separate file |

---

## 11. How to Reset Everything

### Soft reset (re-analyze emails, keep login)
Delete:
- `backend/analyzed_emails.json`
- `backend/briefing_cache.json`
- `backend/chroma_db/`

Then click Sync now. Gmail token is preserved — no need to re-login.

### Full reset (start completely fresh)
Delete:
- `backend/analyzed_emails.json`
- `backend/briefing_cache.json`
- `backend/chroma_db/`
- `backend/token.json`

Then refresh the app — you'll see the Connect Gmail screen again.

---

## Running the Project

### Backend
```bash
cd mailmind/backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd mailmind/frontend
npm install
npm run dev
```

Open **http://localhost:5173**

API docs available at **http://localhost:8000/docs**
