<![CDATA[# ⚡ GradeOps — AI-Powered Exam Grading Pipeline

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

1. **Upload** scanned PDF answer sheets and a grading rubric.
2. **AI Pipeline** crops individual questions, runs OCR to transcribe handwriting, and evaluates answers against the rubric using LLMs.
3. **Plagiarism Detection** flags semantically similar answers across students.
4. **Human Review** — TAs use a keyboard-driven dashboard to approve or override AI-proposed grades in seconds.
5. **Export** finalized grades as CSV for LMS integration.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Grading Pipeline** | OCR via Groq/Gemini Vision → LLM rubric evaluation via Groq/Gemini → structured JSON output |
| 📝 **Smart Rubric Generation** | Upload a question paper PDF and let the AI auto-generate a grading rubric |
| 👩‍🏫 **Instructor Portal** | Drag-and-drop exam uploads, rubric editor, stats dashboard, CSV export |
| 👨‍💻 **TA Review Dashboard** | Split-screen dark-mode UI with keyboard shortcuts (`A` approve, `O` override, `↑↓` navigate) |
| 🎓 **Student Portal** | Students can view their graded exams, scores, and AI-generated feedback |
| 🔍 **Plagiarism Detection** | Cosine similarity on TF-IDF vectors with configurable thresholds; visual similarity bars |
| 🔐 **Role-Based Access** | JWT authentication with Instructor, TA, and Student roles |
| 🐳 **One-Command Deploy** | Full stack runs via `docker compose up` |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)              │
│  Login │ Instructor Portal │ TA Dashboard │ Student Portal  │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API (JSON)
┌────────────────────────────▼────────────────────────────────┐
│                    Backend (FastAPI + Uvicorn)               │
│                                                             │
│  Auth (JWT/RBAC)  ─────  API Routes  ─────  Background Jobs │
│                              │                              │
│         ┌────────────────────▼──────────────────────┐       │
│         │           GradeOps Pipeline               │       │
│         │  1. PDF → Crop Questions (PyMuPDF)        │       │
│         │  2. Crop → OCR Text (Groq / Gemini)       │       │
│         │  3. Text → Grade + Justification (LLM)    │       │
│         │  4. Plagiarism Scan (TF-IDF + Cosine Sim) │       │
│         └───────────────────────────────────────────┘       │
│                              │                              │
│              Storage (Local FS / S3)    PostgreSQL (Async)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy (async), Uvicorn, Pydantic |
| **Frontend** | React 18, Vite, Tailwind CSS v4, React Router |
| **Database** | PostgreSQL 16 (via Docker) |
| **AI / ML** | Groq (Llama 3.3 70B), Google Gemini (Vision + Text), PyMuPDF, scikit-learn |
| **Infrastructure** | Docker Compose, Nginx (production frontend) |

---

## 🚀 Quick Start — Docker

> **Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/gradeops.git
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

### Demo Accounts (auto-seeded)

| Role | Email | Password |
|------|-------|----------|
| Instructor | `instructor@gradeops.dev` | `instructor123` |
| TA | `ta@gradeops.dev` | `ta123` |

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

# Run the server (tables & demo users are auto-created)
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

1. **Root `.env`** — read by `docker-compose.yml` to inject into containers.
2. **`backend/.env`** — used when running the backend locally (outside Docker).

### Key Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OCR_BACKEND` | `groq` | OCR engine: `groq`, `gemini`, or `mock` |
| `LLM_PROVIDER` | `groq` | Grading LLM: `groq`, `gemini`, `openai`, `anthropic`, `together`, `mock` |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Model name for the chosen provider |
| `GROQ_API_KEY` | — | API key from [Groq Console](https://console.groq.com/keys) |
| `GEMINI_API_KEY` | — | API key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async PostgreSQL connection string |
| `JWT_SECRET` | — | Random secret for signing JWT tokens |
| `PLAGIARISM_THRESHOLD` | `0.85` | Cosine similarity threshold for plagiarism flagging |
| `STORAGE_BACKEND` | `local` | `local` for filesystem, `s3` for AWS S3 |

> 💡 **Tip:** Use `mock` for both `OCR_BACKEND` and `LLM_PROVIDER` to test locally without any API keys.

---

## 🎯 Usage Workflow

1. **Instructor — Upload Exam**
   - Log in as instructor → Navigate to "Upload Exam"
   - Upload a question paper PDF → AI auto-generates a rubric (or paste your own JSON rubric)
   - Upload student answer PDFs → Submit for grading

2. **AI Pipeline (automatic)**
   - Crops individual questions from each PDF
   - Runs OCR on each cropped answer image
   - Evaluates each answer against the rubric using an LLM
   - Scans all answers for plagiarism

3. **TA — Review Grades**
   - Log in as TA → Open "Review Dashboard"
   - View AI-proposed grades side-by-side with the original handwritten answer
   - Press `A` to approve or `O` to override with a custom score & justification
   - Use `↑`/`↓` arrow keys to navigate between submissions

4. **Student — View Results**
   - Log in as student → View graded exams and detailed feedback

5. **Instructor — Export**
   - View the exam stats dashboard
   - Download finalized grades as CSV

---

## 📮 API Reference

All endpoints are prefixed with `/api/v1`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | — | Login → JWT token |
| `POST` | `/auth/register` | — | Register a new user |
| `GET` | `/auth/me` | ✅ | Get current user profile |

### Exams

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/exams` | ✅ | List all exams |
| `POST` | `/exams` | Instructor | Submit exam PDFs + rubric for grading |
| `GET` | `/exams/{id}/dashboard` | TA+ | Load the review dashboard data |
| `GET` | `/exams/{id}/grades/export` | Instructor | Download CSV of finalized grades |

### Grading

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/grades/review` | TA+ | Approve or override a single grade |
| `POST` | `/grades/review/bulk` | TA+ | Bulk approve all pending AI grades |

### Rubrics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/rubrics/extract-text` | Instructor | Extract text from an uploaded PDF |
| `POST` | `/rubrics/generate` | Instructor | AI-generate a rubric from extracted text |

### Jobs & Plagiarism

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/jobs/{id}` | TA+ | Poll background job status |
| `GET` | `/exams/{id}/plagiarism` | TA+ | Get flagged plagiarism pairs |

> 📄 Full interactive docs available at `/docs` (Swagger UI) or `/redoc` when the server is running.

---

## 📁 Folder Structure

```
gradeops/
├── .env.example              # Template for root environment variables
├── .gitignore
├── docker-compose.yml        # Full-stack orchestration
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── .env.example          # Template for backend environment variables
│   ├── requirements.txt      # Python dependencies
│   ├── main.py               # FastAPI app entry point
│   ├── config.py             # Pydantic settings (reads .env)
│   ├── database.py           # SQLAlchemy async engine + ORM models
│   ├── auth.py               # JWT authentication + RBAC
│   ├── api_routes.py         # REST API endpoints
│   ├── models.py             # Pydantic request/response schemas
│   ├── pipeline.py           # OCR → Grade → Plagiarism orchestrator
│   ├── ocr_pipeline.py       # OCR backends (Groq / Gemini Vision)
│   ├── grading_agent.py      # LLM grading agent
│   ├── plagiarism_detector.py # TF-IDF cosine similarity detection
│   ├── background_tasks.py   # Thread-based async job queue
│   └── storage.py            # Local filesystem / AWS S3 backends
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf            # Production Nginx config
│   ├── package.json
│   ├── vite.config.js        # Vite config + API proxy
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # React Router setup
│       ├── index.css          # Global styles (Tailwind v4)
│       ├── api/
│       │   └── client.js     # Axios API wrapper
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── Layout.jsx     # Sidebar navigation
│       │   └── ProtectedRoute.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── instructor/
│           │   ├── UploadExam.jsx
│           │   └── ExamsList.jsx
│           ├── ta/
│           │   ├── ReviewDashboard.jsx
│           │   └── PlagiarismView.jsx
│           └── student/
│               ├── StudentDashboard.jsx
│               └── StudentExamView.jsx
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

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using FastAPI, React, and AI
</p>
]]>
