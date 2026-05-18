/**
 * src/api.js
 * Centralized Axios instance for GradeOps backend.
 * Base URL: http://localhost:8000/api/v1
 */

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  timeout: 30000,
});

// Response interceptor — normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      err.userMessage = "Cannot reach server. Is the backend running on port 8000?";
    } else if (err.response.status === 401 || err.response.status === 403) {
      err.userMessage = "Unauthorized. Please check your credentials.";
    } else {
      err.userMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        `Server error (${err.response.status})`;
    }
    return Promise.reject(err);
  }
);

// ── Health ──────────────────────────────────────────────────────────────────

export const checkHealth = () => api.get("/health").then((r) => r.data);

// ── Exams ───────────────────────────────────────────────────────────────────

export const getRecentExams = () =>
  api.get("/exams").then((r) => r.data);

export const deleteExam = (examId) =>
  api.delete(`/exams/${examId}`).then((r) => r.data);

/**
 * Upload exam with rubrics + PDFs.
 * @param {FormData} formData — must contain course_id, instructor_id, rubrics_json, pdfs
 */
export const uploadExam = (formData) =>
  api
    .post("/exams", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);

// ── Jobs ────────────────────────────────────────────────────────────────────

export const getJobStatus = (jobId) =>
  api.get(`/jobs/${jobId}`).then((r) => r.data);

// ── Review Dashboard ────────────────────────────────────────────────────────

export const getReviewDashboard = (examId) =>
  api.get(`/exams/${examId}/dashboard`).then((r) => r.data);

/**
 * Review a single grade.
 * @param {string} examId
 * @param {{ grade_id, ta_id, action, override_score?, override_note? }} payload
 */
export const reviewGrade = (examId, payload) =>
  api
    .post(`/grades/review?exam_id=${examId}`, payload)
    .then((r) => r.data);

/**
 * Bulk approve grades.
 * @param {string} examId
 * @param {{ grade_ids: string[], ta_id: string }} payload
 */
export const bulkReviewGrades = (examId, payload) =>
  api
    .post(`/grades/review/bulk?exam_id=${examId}`, payload)
    .then((r) => r.data);

// ── Grades ──────────────────────────────────────────────────────────────────

/**
 * Fetch grades for an exam with optional filters.
 * @param {string} examId
 * @param {{ student_id?: string, question_number?: number }} filters
 */
export const getGrades = (examId, filters = {}) => {
  const params = {};
  if (filters.student_id) params.student_id = filters.student_id;
  if (filters.question_number) params.question_number = filters.question_number;
  return api.get(`/exams/${examId}/grades`, { params }).then((r) => r.data);
};

export const getStudentGrades = (studentId, examId) =>
  api
    .get(`/students/${studentId}/grades`, { params: { exam_id: examId } })
    .then((r) => r.data);

// ── Plagiarism ───────────────────────────────────────────────────────────────

export const getPlagiarism = (examId, minScore) => {
  const params = {};
  if (minScore !== undefined) params.min_score = minScore;
  return api.get(`/exams/${examId}/plagiarism`, { params }).then((r) => r.data);
};

// ── Export ───────────────────────────────────────────────────────────────────

/**
 * Download grades CSV — triggers browser download.
 */
export const downloadGradesCSV = async (examId) => {
  const response = await api.get(`/exams/${examId}/grades/export`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `grades_${examId}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;