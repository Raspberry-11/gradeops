/**
 * src/pages/JobStatus.jsx
 * Poll job status every 2s with exponential backoff on failures.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Activity, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { Card, Button, Spinner, Tag } from "../components/shared";
import { getJobStatus } from "../api";
import { DEMO_JOB } from "../demoData";

const POLL_BASE_MS = 2000;
const MAX_BACKOFF_MS = 30000;
const TERMINAL = ["completed", "failed", "error"];

function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const color = pct === 100 ? "bg-emerald-500" : "bg-indigo-500";
  return (
    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${pct}%`}
      />
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === "completed") return <CheckCircle2 className="w-10 h-10 text-emerald-500" />;
  if (status === "failed" || status === "error") return <XCircle className="w-10 h-10 text-red-500" />;
  return <Activity className="w-10 h-10 text-indigo-500 animate-pulse-soft" />;
}

export default function JobStatus() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [failures, setFailures] = useState(0);
  const [manualId, setManualId] = useState(jobId ?? "");

  const activeJobId = useRef(jobId);
  const timerRef = useRef(null);

  const poll = useCallback(async (id, failCount) => {
    try {
      const data = await getJobStatus(id);
      setJob(data);
      setError(null);
      setFailures(0);

      if (TERMINAL.includes(data.status)) return; // Stop polling

      const delay = Math.min(POLL_BASE_MS, MAX_BACKOFF_MS);
      timerRef.current = setTimeout(() => poll(id, 0), delay);
    } catch (err) {
      const nextFail = failCount + 1;
      setFailures(nextFail);

      if (nextFail === 1) {
        // First failure — show demo data
        setJob(DEMO_JOB);
        setError("Cannot reach backend — showing demo data.");
      }

      if (nextFail < 8) {
        const backoff = Math.min(POLL_BASE_MS * Math.pow(2, nextFail - 1), MAX_BACKOFF_MS);
        timerRef.current = setTimeout(() => poll(id, nextFail), backoff);
      } else {
        setError("Polling stopped after repeated failures.");
      }
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = jobId ?? manualId;
    if (!id) { setLoading(false); return; }
    activeJobId.current = id;
    setJob(null);
    setError(null);
    setLoading(true);
    setFailures(0);
    poll(id, 0);

    return () => clearTimeout(timerRef.current);
  }, [jobId, poll]);

  const handleManualLoad = (e) => {
    e.preventDefault();
    const id = manualId.trim();
    if (!id) return;
    navigate(`/jobs/${id}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Job Status</h1>
        <p className="text-slate-500 text-sm">Real-time progress for your grading job.</p>
      </div>

      {/* Manual ID input when not from route */}
      {!jobId && (
        <Card className="p-4">
          <form onSubmit={handleManualLoad} className="flex gap-3">
            <div className="flex-1">
              <label className="label">Job ID</label>
              <input
                className="input"
                placeholder="e.g. JOB_abc123"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
              />
            </div>
            <div className="pt-6">
              <Button type="submit">Load</Button>
            </div>
          </form>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {job && (
        <Card className="p-6 space-y-5">
          {/* Status header */}
          <div className="flex items-center gap-4">
            <StatusIcon status={job.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-base font-bold text-slate-900 truncate">{job.job_id}</h2>
                <Tag
                  status={job.status === "completed" ? "approved" : job.status === "failed" ? "flagged" : "pending"}
                  label={job.status}
                />
              </div>
              {job.exam_id && (
                <p className="text-xs text-slate-400">Exam: <code className="font-mono">{job.exam_id}</code></p>
              )}
            </div>
          </div>

          {/* Progress */}
          {job.progress !== undefined && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Progress</span>
                <span className="font-semibold font-mono">{job.progress}%</span>
              </div>
              <ProgressBar value={job.progress} />
            </div>
          )}

          {/* Message */}
          {job.message && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
              {job.message}
            </p>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {job.created_at && (
              <div>
                <p className="label">Created</p>
                <p className="text-slate-700">{new Date(job.created_at).toLocaleString()}</p>
              </div>
            )}
            {job.updated_at && (
              <div>
                <p className="label">Last Updated</p>
                <p className="text-slate-700">{new Date(job.updated_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Logs */}
          {job.logs?.length > 0 && (
            <div>
              <p className="label mb-2">Logs</p>
              <div className="bg-slate-900 rounded-xl p-3 space-y-1 max-h-48 overflow-y-auto">
                {job.logs.map((log, i) => (
                  <p key={i} className="text-xs font-mono text-slate-300">
                    <span className="text-slate-500 mr-2">[{i + 1}]</span>
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          {job.status === "completed" && job.exam_id && (
            <div className="flex gap-3 pt-1">
              <Button onClick={() => navigate(`/review?exam_id=${job.exam_id}`)}>
                <CheckCircle2 className="w-4 h-4" /> Review Grades
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/grades?exam_id=${job.exam_id}`)}>
                Browse Grades
              </Button>
            </div>
          )}

          {/* Polling indicator */}
          {!TERMINAL.includes(job.status) && failures === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Polling every 2s…
            </div>
          )}
        </Card>
      )}
    </div>
  );
}