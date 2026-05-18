export default function Button({
  children,
  className = "",
  ...props
}) {
  return (
    <button
      className={`px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition text-white font-medium shadow-sm disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}