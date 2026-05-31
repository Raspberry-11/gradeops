import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Upload, FileText, Trash2, Loader2, CheckCircle2, XCircle, Activity, ChevronRight, Wand2 } from 'lucide-react';

const RUBRIC_TEMPLATE = JSON.stringify([
  {
    question_number: 1,
    total_points: 10,
    strict_mode: false,
    criteria: [
      {
        criterion_id: "c1_q1",
        description: "Correct algorithm / approach",
        max_points: 5,
        required_keywords: [],
        partial_credit: true
      },
      {
        criterion_id: "c2_q1",
        description: "Proper explanation / justification",
        max_points: 3,
        required_keywords: [],
        partial_credit: true
      },
      {
        criterion_id: "c3_q1",
        description: "Correct final answer",
        max_points: 2,
        required_keywords: [],
        partial_credit: false
      }
    ]
  }
], null, 2);

export default function UploadExam() {
  const { user } = useAuth();

  const [courseId,    setCourseId]    = useState('');
  const [rubricJson,  setRubricJson]  = useState(RUBRIC_TEMPLATE);
  const [pdfFiles,    setPdfFiles]    = useState([]);
  const [dragging,    setDragging]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [job,         setJob]         = useState(null);
  const [polling,     setPolling]     = useState(false);
  const [error,       setError]       = useState('');
  const [jsonError,   setJsonError]   = useState('');

  // Auto-generator state
  const [showGenerator, setShowGenerator] = useState(false);
  const [answerKeyFile, setAnswerKeyFile] = useState(null);
  const [extracting,    setExtracting]    = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [generating,    setGenerating]    = useState(false);
  const [generatorError, setGeneratorError] = useState('');

  const dropRef    = useRef();
  const pollTimer  = useRef(null);

  /* ── Drag-and-drop ── */
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    setPdfFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...files.filter(f => !existing.has(f.name))];
    });
  }, []);

  function onFileInput(e) {
    const files = Array.from(e.target.files);
    setPdfFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...files.filter(f => !existing.has(f.name))];
    });
  }

  function removeFile(name) {
    setPdfFiles(prev => prev.filter(f => f.name !== name));
  }

  /* ── JSON validation ── */
  function validateJson(val) {
    try { JSON.parse(val); setJsonError(''); return true; }
    catch (e) { setJsonError(e.message); return false; }
  }

  /* ── Poll job ── */
  function startPolling(jobId) {
    setPolling(true);
    pollTimer.current = setInterval(async () => {
      try {
        const j = await api.getJob(jobId);
        setJob(j);
        if (j.status === 'completed' || j.status === 'failed') {
          clearInterval(pollTimer.current);
          setPolling(false);
        }
      } catch { clearInterval(pollTimer.current); setPolling(false); }
    }, 2000);
  }

  /* ── Auto-Generate Rubric ── */
  async function handleExtractText() {
    if (!answerKeyFile) return;
    setExtracting(true);
    setGeneratorError('');
    try {
      const fd = new FormData();
      fd.append('pdf', answerKeyFile);
      const res = await api.extractAnswerKeyText(fd);
      setExtractedText(res.extracted_text);
    } catch (err) {
      setGeneratorError('Extraction failed: ' + err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerateRubric() {
    if (!extractedText.trim()) return;
    setGenerating(true);
    setGeneratorError('');
    try {
      const res = await api.generateRubric(extractedText);
      setRubricJson(res.rubrics_json);
      validateJson(res.rubrics_json);
      setShowGenerator(false); // close generator on success
      setAnswerKeyFile(null);
      setExtractedText('');
    } catch (err) {
      setGeneratorError('Generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  /* ── Submit ── */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (pdfFiles.length === 0) { setError('Upload at least one student PDF.'); return; }
    if (!validateJson(rubricJson)) { setError('Fix the rubric JSON errors.'); return; }

    const fd = new FormData();
    fd.append('course_id',    courseId.trim() || 'COURSE-001');
    // instructor_id is resolved server-side from the auth token
    fd.append('rubrics_json',  rubricJson);
    pdfFiles.forEach(f => fd.append('pdfs', f));

    setSubmitting(true);
    try {
      const result = await api.submitExam(fd);
      setJob({ job_id: result.job_id, exam_id: result.exam_id, status: result.status });
      startPolling(result.job_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    clearInterval(pollTimer.current);
    setJob(null); setPdfFiles([]); setCourseId(''); setError(''); setPolling(false);
  }

  /* ── Render ── */
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Upload Exam</h1>
        <p className="text-slate-500 text-sm">Submit scanned student PDFs and a grading rubric for AI processing.</p>
      </div>

      {job ? (
        <JobStatus job={job} polling={polling} onReset={reset} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course ID */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Exam Details</h3>
            <div>
              <label className="label">Course ID</label>
              <input
                type="text"
                className="input max-w-sm"
                placeholder="e.g. CS301-2024-FALL"
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
              />
            </div>
          </div>

          {/* PDF upload */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Student PDFs</h3>
            <p className="text-sm text-slate-500 mb-4">
              Each filename is used as the student ID — name them <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono border border-slate-200">studentID.pdf</code>
            </p>

            <div
              ref={dropRef}
              className={`mt-2 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                dragging 
                  ? 'border-indigo-400 bg-indigo-50/50' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById('pdf-input').click()}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                dragging ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-indigo-500 border border-indigo-100 shadow-sm'
              }`}>
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Drop PDF files here or <span className="text-indigo-600">click to browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Multiple PDFs accepted</p>
              <input id="pdf-input" type="file" accept=".pdf" multiple hidden onChange={onFileInput} />
            </div>

            {pdfFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pdfFiles.map(f => (
                  <div key={f.name} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white shadow-sm group">
                    <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                      <p className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rubric JSON */}
          <div className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">Grading Rubric (JSON)</h3>
                <p className="text-sm text-slate-500">
                  Define criteria, max points, and required keywords per question.
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-xs px-3 py-1.5 shrink-0 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1.5"
                  onClick={() => setShowGenerator(!showGenerator)}>
                  <Wand2 className="w-3.5 h-3.5" /> Auto-Generate
                </button>
                <button type="button" className="btn-secondary text-xs px-3 py-1.5 shrink-0"
                  onClick={() => { setRubricJson(RUBRIC_TEMPLATE); setJsonError(''); }}>
                  Reset Template
                </button>
              </div>
            </div>

            {/* Rubric Generator UI */}
            {showGenerator && (
              <div className="mb-6 p-5 rounded-xl border border-indigo-100 bg-white shadow-sm flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-indigo-500" /> AI Rubric Generator
                  </h4>
                  <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setShowGenerator(false)}>
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                
                {generatorError && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-100 text-xs text-red-600 font-medium">
                    {generatorError}
                  </div>
                )}

                {!extractedText ? (
                  // Step 1: Upload & Extract
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-600">Step 1: Upload your Answer Key PDF. We will extract the text from it.</p>
                    <div className="flex items-center gap-3">
                      <input type="file" accept=".pdf" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        onChange={(e) => setAnswerKeyFile(e.target.files[0])} />
                      <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={!answerKeyFile || extracting} onClick={handleExtractText}>
                        {extracting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Extracting...</> : 'Extract Text'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Step 2: Edit Text & Generate
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-600">Step 2: Review and edit the extracted text. Once correct, generate the rubric.</p>
                    <textarea 
                      className="w-full rounded-md border border-slate-200 p-3 text-sm font-mono focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                      rows={8}
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                    />
                    <div className="flex items-center gap-3">
                      <button type="button" className="btn-secondary text-sm" onClick={() => { setExtractedText(''); setAnswerKeyFile(null); }}>
                        Start Over
                      </button>
                      <button type="button" className="btn-primary text-sm flex-1" disabled={generating} onClick={handleGenerateRubric}>
                        {generating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating JSON...</> : 'Generate Rubric JSON'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs font-mono text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
              style={{ minHeight: '320px' }}
              value={rubricJson}
              onChange={e => { setRubricJson(e.target.value); validateJson(e.target.value); }}
              spellCheck={false}
            />
            {jsonError && (
              <div className="p-3 mt-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span className="font-mono text-xs">{jsonError}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button type="submit" className="btn-primary px-8 h-12 text-[15px]" disabled={submitting}>
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
                : <> Submit for Grading ({pdfFiles.length} PDF{pdfFiles.length !== 1 ? 's' : ''})</>
              }
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function JobStatus({ job, polling, onReset }) {
  const isDone = job.status === 'completed';
  const isFailed = job.status === 'failed' || job.status === 'error';

  return (
    <div className="card p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4 mb-8">
        {isDone ? <CheckCircle2 className="w-12 h-12 text-emerald-500" /> : 
         isFailed ? <XCircle className="w-12 h-12 text-red-500" /> : 
         <Activity className="w-12 h-12 text-indigo-500 animate-pulse" />}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Processing Exam</h2>
          <p className="text-slate-500 text-sm flex items-center gap-2">
            Exam ID: <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{job.exam_id}</code>
          </p>
        </div>
        <div>
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${
            isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            isFailed ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            {job.status}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between relative mb-8">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -z-10" />
        {['queued', 'running', 'completed'].map((step) => {
          const statuses = ['queued', 'running', 'completed', 'failed', 'error'];
          const curIdx = statuses.indexOf(job.status);
          const stepIdx = statuses.indexOf(step);
          const done = curIdx > stepIdx;
          const active = curIdx === stepIdx;
          const failed = isFailed && step === 'completed';

          return (
            <div key={step} className="flex flex-col items-center gap-2 bg-white px-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                done ? 'bg-indigo-600 border-indigo-600 text-white' : 
                active && !failed ? 'border-indigo-500 text-indigo-600' :
                failed ? 'bg-red-500 border-red-500 text-white' :
                'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                {done ? '✓' : failed ? '✕' : stepIdx + 1}
              </div>
              <div className={`text-xs font-semibold uppercase tracking-wider ${
                done || active ? 'text-slate-800' : 'text-slate-400'
              }`}>{step}</div>
            </div>
          );
        })}
      </div>

      {polling && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700 font-medium">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />
          AI OCR + Grading pipeline running… polling every 2s
        </div>
      )}

      {isDone && job.result_summary && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Results Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(job.result_summary).map(([k, v]) => (
              <div key={k} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{k.replace(/_/g, ' ')}</span>
                <span className="font-mono text-sm font-medium text-slate-900">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isFailed && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
          Pipeline error: {job.error || 'Unknown error occurred'}
        </div>
      )}

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
        <button className="btn-secondary" onClick={onReset}>Upload Another Exam</button>
        {isDone && (
          <a href={`/ta/review?exam=${job.exam_id}`} className="btn-primary ml-auto">
            Review Grades <ChevronRight className="w-4 h-4 -mr-1" />
          </a>
        )}
      </div>
    </div>
  );
}
