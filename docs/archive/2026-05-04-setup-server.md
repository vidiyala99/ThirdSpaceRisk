# Server Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up and start both the backend (FastAPI) and frontend (Next.js) servers.

**Architecture:** Install dependencies for both backend and frontend, create a virtual environment for the backend, and start both servers in the background.

**Tech Stack:** Python (FastAPI, Uvicorn), Node.js (Next.js), npm.

---

### Task 1: Backend Dependencies Setup

**Files:**
- Modify: `backend/requirements.txt` (if needed, but currently looks good)

- [ ] **Step 1: Create a virtual environment**

Run: `python -m venv backend/venv`

- [ ] **Step 2: Install backend dependencies**

Run: `.\backend\venv\Scripts\python.exe -m pip install -r backend/requirements.txt`

### Task 2: Frontend Dependencies Setup

- [ ] **Step 1: Install frontend dependencies**

Run: `cd frontend; npm install`

### Task 3: Start the Servers

- [ ] **Step 1: Start the backend server**

Run: `.\backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload` (Run in background)

- [ ] **Step 2: Start the frontend server**

Run: `cd frontend; npm run dev` (Run in background)

- [ ] **Step 3: Verify health check**

Run: `curl http://localhost:8000/api/health`
Expected: `{"status": "ok"}`
