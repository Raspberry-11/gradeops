import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-center" style={{ height: '100vh' }}>
        <div className="spinner spinner-lg" />
        <span className="text-dim">Loading…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    let target = '/ta/review';
    if (user.role === 'instructor') target = '/instructor/exams';
    if (user.role === 'student') target = '/student/dashboard';
    return <Navigate to={target} replace />;
  }

  return children;
}
