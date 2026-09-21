export function LoadingState({ label = 'Loading…' }) {
  return <p className="mt-4 text-slate-500">{label}</p>
}

export function ErrorState({ error }) {
  const message = (error && error.message) || 'Something unexpected went wrong.'
  return (
    <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  )
}
