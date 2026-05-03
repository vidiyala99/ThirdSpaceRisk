# Third Space Risk

Third Space Risk is a local demo of an underwriting and claims-defensibility workflow for venues. The current product slice turns a synthetic venue brawl incident into a cited underwriting packet with risk signal, customer actions, claims timeline, and underwriter memo.

The backend is deterministic today. It now routes the underwriting packet through runtime agent orchestration, but those agent steps execute Python logic rather than live LLM calls.

## Project Structure

- `backend/`: FastAPI, SQLModel, SQLite, deterministic retrieval, and agent orchestration.
- `frontend/`: Next.js underwriter console and venue dashboard.
- `docs/`: requirements and design notes.

## Local Verification

Backend:

```powershell
cd backend
pytest -q -p no:flaky
```

Frontend:

```powershell
cd frontend
npm.cmd run test
npm.cmd run build
```

## Local Development

Backend:

```powershell
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://localhost:3000/underwriter`.
