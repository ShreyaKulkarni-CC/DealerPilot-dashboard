export default function RefreshButton({ onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={loading ? 'inline-block animate-spin' : 'inline-block'}>⟳</span>
      {loading ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}
