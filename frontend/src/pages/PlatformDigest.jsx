import { useParams, Link } from 'react-router-dom'
import { getPlatform, safeExternalUrl } from '../lib/platforms'
import StatusPill from '../components/StatusPill'

// Generic digest page for platforms that are not wired up yet. vAuto has its
// own digest (Overview.jsx) because it has real data.
export default function PlatformDigest() {
  const { platformId } = useParams()
  const platform = getPlatform(platformId)

  if (!platform) {
    return (
      <div className="p-6">
        <p className="text-slate-600">That platform does not exist.</p>
        <Link to="/" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  const link = safeExternalUrl(platform.externalUrl)

  return (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">{platform.name} digest</h1>
        <StatusPill status={platform.status} />
      </div>
      <p className="mt-1 text-sm text-slate-500">{platform.note}</p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Summary</div>
        <p className="mt-2 text-sm text-slate-400">
          AI summaries are not turned on yet. Once {platform.name} data is connected, a short written
          summary of it will show here.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Key numbers</div>
        <p className="mt-2 text-sm text-slate-400">No data connected yet.</p>
      </div>

      <div className="mt-4">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Open {platform.name}
          </a>
        ) : (
          <span className="text-sm text-slate-400">Link to {platform.name} not set yet.</span>
        )}
      </div>
    </div>
  )
}
