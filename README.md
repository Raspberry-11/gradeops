# ⚡ GradeOps — AI-Powered Exam Grading Pipeline

> **Human-in-the-Loop (HITL)** grading system that processes scanned handwritten exams at scale using AI, then lets Teaching Assistants rapidly review and finalize grades.

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start (Docker)](#-quick-start--docker)
- [Local Development](#-local-development)
- [Configuration](#%EF%B8%8F-configuration)
- [Usage Workflow](#-usage-workflow)
- [API Reference](#-api-reference)
- [Folder Structure](#-folder-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 Overview

GradeOps automates the most time-consuming parts of exam grading:

1. **Upload** scanned PDF answer sheets and a grading rubric (or let AI auto-generate one).
2. **AI Pipeline** crops individual questions, runs OCR to transcribe handwriting, and evaluates answers against the rubric using LLMs.
3. **Plagiarism Detection** flags semantically similar answers across students using TF-IDF cosine similarity.
4. **Human Review** — TAs use a keyboard-driven dashboard to approve or override AI-proposed grades in seconds.
5. **Student Portal** — Students can view their graded exams, scores, feedback, and submit regrade requests.
6. **Export** finalized grades as CSV for LMS integration.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Grading Pipeline** | OCR via Groq/Gemini Vision → LLM rubric evaluation via Groq/Gemini → structured JSON output |
| 📝 **Smart Rubric Generation** | Upload a question paper PDF and let the AI auto-generate a structured JSON grading rubric |
| 👩‍🏫 **Instructor Portal** | Drag-and-drop exam uploads, rubric editor, stats dashboard, one-click CSV grade export |
| 👨‍💻 **TA Review Dashboard** | Split-screen dark-mode UI with keyboard shortcuts (`A` approve, `O` override, `↑↓` navigate) |
| 🎓 **Student Portal** | Students view graded exams with scores, AI feedback, and can submit regrade requests |
| 🔍 **Plagiarism Detection** | TF-IDF cosine similarity with configurable thresholds; visual similarity bars (Red >90%, Amber >75%) |
| 🔐 **Role-Based Access (RBAC)** | JWT authentication with three roles: Instructor, TA, and Student |
| 📦 **One-Command Deploy** | Full stack (PostgreSQL + FastAPI + React) runs via `docker compose up` |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Frontend (React 18 + Vite)                     │
│                                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  Login /  │  │  Instructor  │  │     TA     │  │    Student    │  │
│  │ Register │  │    Portal    │  │  Dashboard │  │    Portal     │  │
│  └──────────┘  └──────────────┘  └────────────┘  └───────────────┘  │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ REST API (JSON + JWT)
┌────────────────────────▼─────────────────────────────────────────────┐
│                    Backend (FastAPI + Uvicorn)                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Auth Layer (JWT + RBAC)                      │ │
│  │           Instructor  │  TA  │  Student role enforcement       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────┐ ┌──────────────────┐ ┌───────────────────────┐ │
│  │  Instructor API  │ │     TA API       │ │    Student API        │ │
│  │  • Upload Exams  │ │  • Review Grades │ │  • View Results       │ │
│  │  • Rubric Gen    │ │  • Bulk Approve  │ │  • View Feedback      │ │
│  │  • Export CSV    │ │  • Plagiarism    │ │  • Regrade Requests   │ │
│  └────────┬────────┘ └────────┬─────────┘ └───────────┬───────────┘ │
│           │                   │                       │              │
│  ┌────────▼───────────────────▼───────────────────────▼───────────┐ │
│  │                    GradeOps Pipeline                            │ │
│  │  1. PDF → Crop Questions (PyMuPDF)                             │ │
│  │  2. Crop → OCR Text (Groq / Gemini Vision)                    │ │
│  │  3. Text → Grade + Justification (LLM)                        │ │
│  │  4. Plagiarism Scan (TF-IDF + Cosine Similarity)              │ │
│  └────────────────────────────┬───────────────────────────────────┘ │
│                               │                                      │
│  ┌────────────────────────────▼───────────────────────────────────┐ │
│  │   Storage (Local FS / S3)          PostgreSQL (Async)          │ │
│  │   • PDFs, Crops, Grades JSON       • Users, Auth, Sessions    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                  Background Job Queue (Thread-based)           │ │
│  │          Async pipeline execution with status polling          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy (async), Uvicorn, Pydantic v2 |
| **Frontend** | React 18, Vite, Tailwind CSS v4, React Router v6 |
| **Database** | PostgreSQL 16 (via Docker) |
| **AI / ML** | Groq (Llama 3.3 70B), Google Gemini (Vision + Text), LangChain, PyMuPDF, scikit-learn |
| **Auth** | JWT (python-jose), bcrypt (passlib), OAuth2 Bearer |
| **Infrastructure** | Docker Compose, Nginx (production frontend serving) |

---

## 🚀 Quick Start — Docker

> **Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
# 1. Clone the repository
git clone https://github.com/Raspberry-11/gradeops
cd gradeops

# 2. Set up environment variables
cp .env.example .env
# Edit .env and add your API keys (Groq and/or Gemini)

# 3. Launch the full stack
docker compose up --build
```

Wait ~60 seconds for the build, then open:

| Service | URL |
|---------|-----|
| **Frontend** | [http://localhost:5173](http://localhost:5173) |
| **API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **API Docs (ReDoc)** | [http://localhost:8000/redoc](http://localhost:8000/redoc) |

### Demo Accounts (auto-seeded on first startup)

| Role | Email | Password |
|------|-------|----------|
| Instructor | `instructor@gradeops.dev` | `instructor123` |
| TA | `ta@gradeops.dev` | `ta123` |
| Student | `student@gradeops.dev` | `student123` |

---

## 💻 Local Development

If you prefer running services individually without Docker:

### Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys and database URL

# Start a local PostgreSQL (via Docker)
docker run -d \
  -e POSTGRES_USER=gradeops \
  -e POSTGRES_PASSWORD=gradeops \
  -e POSTGRES_DB=gradeops \
  -p 5432:5432 postgres:16-alpine

# Run the server (tables & demo users are auto-created on first startup)
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install packages
npm install

# Start the Vite dev server (proxies API calls to localhost:8000)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## ⚙️ Configuration

GradeOps uses two levels of `.env` files:

1. **Root `.env`** — read by `docker-compose.yml` to inject variables into containers.
2. **`backend/.env`** — used when running the backend locally (outside Docker).

Copy the corresponding `.env.example` file to get started.

### Key Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OCR_BACKEND` | `groq` | OCR engine: `groq`, `gemini`, or `mock` |
| `LLM_PROVIDER` | `groq` | Grading LLM: `groq`, `gemini`, `openai`, `anthropic`, `together`, `mock` |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Model name for the chosen provider |
| `GROQ_API_KEY` | — | API key from [Groq Console](https://console.groq.com/keys) |
| `GEMINI_API_KEY` | — | API key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `DATABASE_URL` | `postgresql+asyncpg://gradeops:gradeops@localhost:5432/gradeops` | Async PostgreSQL connection string |
| `JWT_SECRET` | — | Random secret for signing JWT tokens |
| `PLAGIARISM_THRESHOLD` | `0.85` | Cosine similarity threshold for plagiarism flagging |
| `STORAGE_BACKEND` | `local` | `local` for filesystem, `s3` for AWS S3 |

> 💡 **Tip:** Use `mock` for both `OCR_BACKEND` and `LLM_PROVIDER` to test locally without any API keys.

---

## 🎯 Usage Workflow

### 1. Instructor — Upload Exam

- Log in as Instructor → Navigate to **Upload Exam**
- Upload a question paper PDF → AI auto-generates a rubric (or paste/edit your own JSON rubric)
- Upload student answer PDFs → Submit for grading

### 2. AI Pipeline (runs automatically in background)

- Crops individual questions from each student PDF using PyMuPDF
- Runs OCR on each cropped answer image (Groq or Gemini Vision)
- Evaluates each answer against the rubric criteria using an LLM
- Generates per-criterion scores and justifications
- Scans all answers for plagiarism via TF-IDF cosine similarity

### 3. TA — Review Grades

- Log in as TA → Open **Review Dashboard**
- View AI-proposed grades side-by-side with the original handwritten answer crop
- Press `A` to approve or `O` to override with a custom score & justification
- Use `↑`/`↓` arrow keys to navigate between submissions
- Bulk approve remaining grades with one click

### 4. Student — View Results

- Log in as Student → View **Student Dashboard**
- See all graded exams with total scores
- Drill into individual exam results to see per-question grades, AI feedback, and answer crops
- Submit regrade requests with explanatory notes

### 5. Instructor — Export

- View the **Exams List** with stats
- Download finalized grades as CSV for LMS integration

---

## 📮 API Reference

All endpoints are prefixed with `/api/v1`. Full interactive docs available at `/docs` (Swagger) or `/redoc`.

### Authentication (`/api/v1/auth/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | — | Login with email + password → JWT token |
| `POST` | `/auth/register` | — | Register a new user (defaults to TA role) |
| `GET` | `/auth/me` | ✅ | Get current user profile |

### Exams (`/api/v1/exams/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/exams` | Instructor | List all submitted exams |
| `POST` | `/exams` | Instructor | Submit exam PDFs + rubric for grading |
| `GET` | `/exams/{id}/dashboard` | TA+ | Load the TA review dashboard data |
| `GET` | `/exams/{id}/grades` | TA+ | List all grades for an exam |
| `GET` | `/exams/{id}/grades/export` | Instructor | Download CSV of finalized grades |
| `GET` | `/exams/{id}/plagiarism` | TA+ | Get flagged plagiarism pairs |

### Rubrics (`/api/v1/rubrics/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/rubrics/extract-text` | Instructor | Extract text from a question paper PDF (digital or scanned) |
| `POST` | `/rubrics/generate` | Instructor | AI-generate a structured rubric from extracted text |

### Grade Review (`/api/v1/grades/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/grades/review` | TA+ | Approve or override an individual AI grade |
| `POST` | `/grades/review/bulk` | TA+ | Bulk approve multiple grades at once |

### Student (`/api/v1/student/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/student/exams` | Student | List exams the student has grades for |
| `GET` | `/student/exams/{id}` | Student | Get detailed grades for a specific exam |
| `POST` | `/student/grades/{id}/regrade` | Student | Submit a regrade request |

### Utility

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/jobs/{id}` | TA+ | Poll background job status |
| `GET` | `/students/{id}/grades` | TA+ | Get all grades for a specific student |
| `GET` | `/health` | — | Health check |

---

## 📁 Folder Structure

```
gradeops/
├── .env.example              # Template for root environment variables
├── .gitignore
├── docker-compose.yml        # Full-stack orchestration (Postgres + Backend + Frontend)
├── LICENSE
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── .env.example          # Template for local backend environment variables
│   ├── requirements.txt      # Python dependencies
│   ├── main.py               # FastAPI app entry point + lifespan + CORS
│   ├── config.py             # Pydantic settings (reads .env)
│   ├── database.py           # SQLAlchemy async engine + UserORM + demo seeding
│   ├── auth.py               # JWT auth + RBAC (Instructor / TA / Student)
│   ├── api_routes.py         # All REST API endpoints
│   ├── models.py             # Pydantic request/response schemas + enums
│   ├── pipeline.py           # OCR → Grade → Plagiarism pipeline orchestrator
│   ├── ocr_pipeline.py       # OCR backends (Groq Vision / Gemini Vision)
│   ├── grading_agent.py      # LLM grading agent (LangChain)
│   ├── plagiarism_detector.py # TF-IDF cosine similarity detector
│   ├── background_tasks.py   # Thread-based async job queue
│   └── storage.py            # Local filesystem / AWS S3 storage backends
│
├── frontend/
│   ├── Dockerfile            # Multi-stage build (Node → Nginx)
│   ├── nginx.conf            # Production Nginx reverse proxy config
│   ├── package.json
│   ├── vite.config.js        # Vite config + API proxy to backend
│   ├── index.html
│   └── src/
│       ├── main.jsx          # React entry point
│       ├── App.jsx           # React Router setup (all routes)
│       ├── index.css          # Global styles (Tailwind CSS v4)
│       ├── api/
│       │   └── client.js     # Axios API wrapper with JWT interceptor
│       ├── context/
│       │   └── AuthContext.jsx # Auth state management
│       ├── components/
│       │   ├── Layout.jsx     # Sidebar navigation + role-based menu
│       │   └── ProtectedRoute.jsx  # Route guard by role
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── instructor/
│           │   ├── UploadExam.jsx   # Drag-drop upload + rubric editor
│           │   └── ExamsList.jsx    # Exam list + stats + CSV export
│           ├── ta/
│           │   ├── ReviewDashboard.jsx  # HITL split-screen review UI
│           │   └── PlagiarismView.jsx   # Plagiarism flags viewer
│           └── student/
│               ├── StudentDashboard.jsx  # Student exam list
│               └── StudentExamView.jsx   # Detailed grade view + regrade
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -m "feat: add my feature"`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---
