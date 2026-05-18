/**
 * src/App.jsx
 * Root component — sets up routing and global context providers.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import UploadExam from "./pages/UploadExam";
import ReviewDashboard from "./pages/ReviewDashboard";
import Grades from "./pages/Grades";
import JobStatus from "./pages/JobStatus";
import { ToastProvider } from "./context/ToastContext";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h2 className="font-display text-5xl font-bold text-slate-200 mb-2">404</h2>
      <p className="text-slate-500 text-sm">Page not found.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/"              element={<Home />}            />
            <Route path="/upload"        element={<UploadExam />}      />
            <Route path="/review"        element={<ReviewDashboard />} />
            <Route path="/grades"        element={<Grades />}          />
            <Route path="/jobs/:jobId"   element={<JobStatus />}       />
            <Route path="/jobs"          element={<JobStatus />}       />
            <Route path="*"             element={<NotFound />}        />
          </Routes>
        </Layout>
      </ToastProvider>
    </BrowserRouter>
  );
}