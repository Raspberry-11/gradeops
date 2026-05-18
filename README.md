# GradeOps 🎓

Welcome to **GradeOps**—a comprehensive, automated platform built to streamline the processing, transcription, and grading of scanned examination papers at scale. 

By unifying a powerful Optical Character Recognition (OCR) and Large Language Model (LLM) backend with a modern, user-friendly frontend interface, GradeOps empowers educators and teaching assistants to seamlessly review submissions, adjust grades, and distribute results.

---

## 🌟 Key Capabilities

- **Intelligent OCR Engine**  
  Effortlessly extracts handwritten and digital text from PDF submissions. Features support for lightweight local processing (PyMuPDF, Dev/Mock) as well as heavy-duty ML models like **Qwen-VL** and **Meta Nougat**.
- **AI-Driven Evaluation**  
  Leverages state-of-the-art language models to accurately assess student responses based on custom, instructor-defined rubrics.
- **Intuitive Instructor Dashboard**  
  Provides a unified interface for TAs and instructors to visually inspect OCR outputs side-by-side with student grades. Allows for manual overrides and detailed justifications on a per-question basis.
- **Automated Plagiarism Detection**  
  Proactively flags highly similar semantic structures across batch submissions to maintain academic integrity.
- **Comprehensive Grade Management**  
  Filter records, track student performance trends, and export finalized grades directly to CSV for Learning Management System (LMS) integration.
- **Flexible Infrastructure**  
  Engineered to run either entirely locally (utilizing local file storage and JSON) or on the cloud via AWS (integrating S3 for media and DynamoDB for records).

---

## 🛠️ Technology Stack

### Backend (`/scripts`)
- **Core:** Python 3.10+, FastAPI, Uvicorn
- **AI & NLP:** LangChain, HuggingFace Transformers, scikit-learn
- **Document Processing:** PyMuPDF

### Frontend (`/client`)
- **Framework:** React 18
- **Build & Routing:** Vite, React Router
- **Design:** Tailwind CSS v4

---

## 🚀 Getting Started (Local Environment)

Follow these instructions to deploy the GradeOps stack on your local machine.

### 1. Initialize the Backend Services

1. Move into the backend directory:
   ```bash
   cd scripts
   ```
2. Set up a virtual environment and activate it:
   ```bash
   python -m venv .venv
   
   # For MacOS/Linux:
   source .venv/bin/activate
   # For Windows:
   .\.venv\Scripts\Activate.ps1
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure your environment:
   - Duplicate the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Ensure your `.env` contains the local settings:
     ```properties
     OCR_BACKEND=mock
     LLM_PROVIDER=mock
     STORAGE_BACKEND=local
     ```
   *(Note: The `mock` setting will fall back to extracting digital text from PDFs if available, otherwise it generates synthetic data.)*
5. Launch the backend API:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Launch the Frontend Interface

1. In a separate terminal window, navigate to the client directory:
   ```bash
   cd client
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard by visiting `http://localhost:5173` in your web browser.

---

## 📖 Operational Workflow

1. **Submission Phase:** Navigate to the **Upload** page to input exam metadata, upload instructor rubrics (JSON format), and attach the student PDF submissions.
2. **Automated Processing:** The backend asynchronously segments documents, runs the OCR engine, evaluates responses, and cross-checks for plagiarism within the batch.
3. **Review & Moderation:** Open the **Review Dashboard** to inspect the processed exams. You can seamlessly approve the AI's grading or intervene with manual corrections and feedback.
4. **Finalization & Export:** Visit the **Grades** view to monitor overall completion, investigate plagiarism alerts, and download the final CSV report for your LMS.

---

## ⚙️ Advanced Configuration

GradeOps behavior can be customized by modifying your `.env` file:

- `LLM_PROVIDER`: Choose your preferred intelligence layer (`openai`, `anthropic`, `together`, or `mock`).
- `OCR_BACKEND`: Upgrade from `mock` to `qwen_vl` or `nougat` for production-grade handwriting recognition (GPU recommended).
- `STORAGE_BACKEND`: Transition to `s3` to scale your storage using AWS S3 and DynamoDB.
