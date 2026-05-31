import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ChevronRight, FileText, Calendar } from 'lucide-react';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchExams() {
      try {
        const data = await api.getStudentExams();
        setExams(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchExams();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 animate-pulse font-medium">Loading exams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Failed to load exams: {error}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Exams</h1>
        <p className="text-sm text-slate-500 mt-1">View your graded exams and request regrades.</p>
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No Exams Found</h3>
          <p className="text-sm text-slate-500 mt-1">You haven't participated in any graded exams yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const percentage = Math.round((exam.total_awarded / exam.total_possible) * 100) || 0;
            return (
              <div 
                key={exam.exam_id}
                onClick={() => navigate(`/student/exams/${exam.exam_id}`)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 line-clamp-1">{exam.course_id || 'Untitled Exam'}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{exam.exam_id.substring(0,8)}</span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    percentage >= 80 ? 'bg-emerald-50 text-emerald-700' :
                    percentage >= 60 ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {percentage}%
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-2xl font-bold text-slate-900">{exam.total_awarded}</span>
                  <span className="text-sm text-slate-500">/ {exam.total_possible} pts</span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 mb-4 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      percentage >= 80 ? 'bg-emerald-500' :
                      percentage >= 60 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-indigo-600 font-medium group-hover:text-indigo-700">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
