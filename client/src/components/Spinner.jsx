export default function Spinner({ size = 20 }) {
  return (
    <svg className="animate-spin text-indigo-600" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"></circle>
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></path>
    </svg>
  );
}