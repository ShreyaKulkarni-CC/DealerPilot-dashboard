import { Link } from 'react-router-dom'
import { PLATFORMS } from '../lib/platforms'
import { getHealth } from '../api/client'
import { useApiData } from '../hooks/useApiData'
import StatusPill from '../components/StatusPill'

export default function Home() {
  // Only the lightweight health check runs here, so this page still loads
  // even when a platform's data API is failing.
  const { error } = useApiData(getHealth, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800">DealerPilot</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        One place to see the platforms Bridgeland Auto Brokers and Candy Cars work with. Each platform
        has its own digest: its data in a simpler form, a short summary, and a link to the platform
        itself. Platforms run independently, so one being down does not affect the others.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          The DealerPilot backend is not reachable, so live status is unavailable. Is it running?
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Platforms</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((p) => (
          <Link
            key={p.id}
            to={`/platforms/${p.id}`}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-400"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-slate-800">{p.name}</span>
              <StatusPill status={p.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{p.blurb}</p>
            <p className="mt-2 text-xs text-slate-400">{p.note}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Start here</h2>
      <ul className="mt-3 space-y-1 text-sm">
        <li>
          <Link to="/platforms/vauto" className="text-blue-600 hover:underline">
            vAuto digest
          </Link>
          <span className="text-slate-500"> for a quick read on inventory and appraisals</span>
        </li>
        <li>
          <Link to="/inventory" className="text-blue-600 hover:underline">
            Inventory search
          </Link>
        </li>
        <li>
          <Link to="/aged-inventory" className="text-blue-600 hover:underline">
            Aged inventory
          </Link>
        </li>
      </ul>
    </div>
  )
}
