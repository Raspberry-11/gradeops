# GradeOps 🎓

GradeOps is an automated system designed to process, transcribe, and grade scanned student exams at scale. It combines a robust backend architecture for OCR and automated evaluation with a sleek frontend dashboard for instructors and teaching assistants to review, override, and distribute grades.

## 🚀 Features

- **Automated Grading**: Uses advanced language models to automatically evaluate student answers against instructor-provided rubrics.
- **Intelligent OCR Pipeline**: Extracts text from scanned handwritten or digital PDF exams. Supports robust ML backends like **Qwen-VL** and **Meta Nougat**, as well as lightweight Dev/Mock and PyMuPDF pipelines for local testing.
- **Interactive Review Dashboard**: An intuitive UI to review student grades on a question-by-question basis. TAs can visually verify the OCR results and add manual overrides or justifications.
- **Grades Management**: Filter graded exams, view student progression, and export data directly to CSV.
- **Plagiarism Detection**: Submissions are automatically checked against each other for high semantic similarity.
- **Extensible Storage**: Can run fully locally (JSON + local file system) or seamlessly scale to AWS (S3 for PDFs/images + DynamoDB for semi-structured grade records).

## 🛠 Tech Stack

**Backend (`/scripts`)**
- Python 3.10+
- [FastAPI](https://fastapi.tiangolo.com/) & Uvicorn (REST API)
- [LangChain](https://python.langchain.com/) (LLM pipeline)
- PyMuPDF / HuggingFace Transformers (Handling PDFs and OCR)
- scikit-learn (Plagiarism / vector math)

**Frontend (`/client`)**
- React 18
- [Vite](https://vitejs.dev/) (Build tool)
- [Tailwind CSS v4](https://tailwindcss.com/) (Styling)
- React Router (Routing)

---

## 💻 Local Development Setup

Follow these steps to get the GradeOps stack running locally.

### 1. Start the Backend

1. Navigate to the backend directory:
   ```bash
   cd scripts
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\Activate.ps1
   # MacOS/Linux:
   source .venv/bin/activate
   ```
3. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your environment variables:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Make sure your `.env` is configured for local running:
     ```properties
     OCR_BACKEND=mock
     LLM_PROVIDER=mock
     STORAGE_BACKEND=local
     ```
   *(Note: The `mock` OCR backend will fallback to extracting embedded digital text from the PDFs if available, otherwise utilizing dummy data.)*
5. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Start the Frontend

1. Open a new terminal and navigate to the client directory:
   ```bash
   cd client
   ```
2. Install the necessary packages:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and go to `http://localhost:5173`.

---

## 🎯 Usage Workflow

1. **Upload Exam**: Use the Upload page on the frontend to supply basic exam details, instructor criteria/rubrics (in JSON format), and multiple student PDF submissions.
2. **Background Processing**: The backend schedules background tasks to extract pages, crop questions, run the OCR engine, and generate grading results. It also checks for plagiarism against other exams in the same batch.
3. **Review**: Head to the **Review Dashboard** to see recent exam batches. Click an exam to view the graded questions by student. Here you can accept the generated grade or manually override it and provide notes.
4. **Grades Overview**: The **Grades** page allows you to view all completed assessments, check for plagiarism flags, and download the grades in CSV format for importing into your LMS.

## ⚙️ Configuration Options

GradeOps is highly configurable via `.env`:
- `LLM_PROVIDER`: Switch between `openai`, `anthropic`, `together`, or `mock`.
- `OCR_BACKEND`: Switch from `mock` to `qwen_vl` or `nougat` for real handwriting extraction (requires a strong GPU).
- `STORAGE_BACKEND`: Switch to `s3` and configure your DynamoDB + S3 credentials for remote scalable storage.
