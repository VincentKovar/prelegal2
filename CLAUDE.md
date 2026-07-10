# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The goal is to support all document types listed in catalog.json via AI chat with full user authentication and document persistence. (V1 technical foundation and a first document prototype are built — see Implementation Status below.)

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b:free` model (free-tier variant, diverging from the instructor's paid Cerebras-pinned routing). You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

Note: the free-tier model does not accept the `reasoning_effort` parameter (OpenRouter raises `litellm.UnsupportedParamsError` if it's passed) and is subject to free-tier rate limits (roughly 20 requests/minute, 200/day, subject to change). `ai_service.py` catches `litellm.exceptions.RateLimitError` and returns a friendly in-chat message rather than a 500 when the limit is hit.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
Consider statically building the frontend and serving it via FastAPI, if that will work.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

- **Completed (PREL-3, 2026-07-10)**: Mutual NDA Creator prototype — Next.js form (`frontend/src/app/NdaForm.tsx`) that fills the mutual-nda template and produces a downloadable PDF.
- **Completed (PREL-4, 2026-07-10)**: V1 technical foundation, built alongside PREL-3. FastAPI backend (`backend/`, uv-managed) with SQLite database created fresh on container startup, users table with signup/signin, JWT auth, and document persistence routes. Next.js frontend statically exported (`output: "export"`) and served by FastAPI. Whole app packaged into a single Docker image (multi-stage `Dockerfile` + `docker-compose.yml`) exposing the backend at `http://localhost:8000`. Start/stop scripts for Mac, Linux, and Windows in `scripts/`.
- **Completed (PREL-5, 2026-07-10)**: AI chat interface for mutual NDA creation, replacing manual form entry. `backend/services/ai_service.py` calls the free-tier OpenRouter model via LiteLLM with Structured Outputs (`ChatResponse` Pydantic model) to extract field values from natural conversation and drive `isComplete`. Field requirements are read from `catalog.json`'s mutual-nda entry so the prompt stays in sync with the template. New chat UI (`frontend/src/app/NdaChat.tsx`) shows the conversation alongside a live-updating document preview and a PDF download button once all fields are gathered. Fixed post-launch: the free model rejects the `reasoning_effort` parameter (`litellm.UnsupportedParamsError`) — added `drop_params=True` to the `completion()` call so LiteLLM silently drops unsupported params instead of erroring — and the chat route now logs the real exception server-side (`logger.exception`) instead of only returning `str(e)` to the client.
- **Completed (PREL-6, 2026-07-10)**: Expanded the chat from mutual-nda-only to all 8 document types in `catalog.json`. `backend/services/ai_service.py` now runs in a pinned mode (system prompt scoped to a known `documentType`, sent back by the frontend each turn via `ChatRequest.documentType` so it doesn't have to be re-guessed from the transcript) or a discovery mode (no document type yet — the AI matches the user's described need to a catalog entry, or explains the mismatch and sets `suggestedDocument` to the closest supported type). Frontend gained a document-type dropdown (`frontend/src/app/page.tsx`, populated from `GET /api/catalog`) with a "Something else / not sure" option that starts discovery mode; the chat UI (renamed `NdaChat.tsx` → `frontend/src/app/DocumentChat.tsx`) and live preview/PDF generation (`frontend/src/lib/template.ts`, `frontend/src/lib/PdfDocument.tsx`, replacing the NDA-only `nda.ts`/`NdaPdfDocument.tsx`) now render generically from each template's `{{key}}`-token markdown body via a new `GET /api/catalog/{id}/template` endpoint, instead of hardcoded NDA paragraphs. Also fixed: chat input focus wasn't returning after sending a message because `.focus()` was called while the input still had the `disabled` attribute (before React's re-render cleared it) — moved to a `useEffect` keyed on the sending state so focus is set once the input is actually re-enabled.

### Current API Endpoints

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in and receive JWT cookie
- `POST /api/auth/signout` - Clear auth cookie
- `GET /api/auth/me` - Get current user info
- `GET /api/documents` - List user's saved documents (auth required)
- `POST /api/documents` - Save new document (auth required)
- `GET /api/documents/{id}` - Get specific document (auth required)
- `PUT /api/documents/{id}` - Update document (auth required)
- `DELETE /api/documents/{id}` - Delete document (auth required)
- `GET /api/chat/greeting` - Get AI greeting (optional `document_type` query param to scope it; omitted starts discovery mode)
- `POST /api/chat/message` - Send chat message and get AI response (optional `documentType` in the body to pin the conversation to a catalog id)
- `GET /api/catalog` - List available document templates
- `GET /api/catalog/{id}/template` - Get the raw `{{key}}`-token markdown body for a document type
- `GET /api/health` - Health check