import { getHealth, getInventory, getAppraisals, ApiError } from '../api/client'
import { daysInInventory, AGE_THRESHOLD_DAYS } from '../lib/vehicleAge'
import { useApiData } from '../hooks/useApiData'
import RefreshButton from '../components/RefreshButton'

function StatCard({ label, value, sublabel, tone = 'default' }) {
  const toneClass = {
    default: 'text-slate-800',
    warn: 'text-amber-600',
    good: 'text-emerald-600',
  }[tone]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${toneClass}`}>{value}</div>
      {sublabel && <div className="mt-1 text-xs text-slate-400">{sublabel}</div>}
    </div>
  )
}

function ConnectorBadge({ name, status }) {
  const ok = status === 'configured'
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{name}</span>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {ok ? 'Connected' : 'Not configured'}
      </span>
    </div>
  )
}

async function loadOverview() {
  const [health, inventory, appraisals] = await Promise.all([
    getHealth(),
    getInventory({ limit: '1,100' }),
    getAppraisals({ limit: '1,100' }),
  ])
  return { health, inventory, appraisals }
}

export default function Overview() {
  const { loading, error, data, reload } = useApiData(loadOverview, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Overview</h1>
        <RefreshButton onClick={reload} loading={loading} />
      </div>

      {loading && <p className="mt-4 text-slate-500">Loading live data from vAuto…</p>}

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof ApiError ? error.message : 'Something unexpected went wrong.'}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {(() => {
            const { health, inventory, appraisals } = data
            const inventoryItems = inventory.items || []
            const appraisalItems = appraisals.items || []

            const ages = inventoryItems
              .map((item) => daysInInventory(item.createdOn))
              .filter((d) => d !== null)
            const agedCount = ages.filter((d) => d >= AGE_THRESHOLD_DAYS).length
            const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null

            return (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  Environment: <span className="font-medium">{health.environment}</span>
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ConnectorBadge name="vAuto Appraisal API" status={health.connectors?.vauto_appraisal} />
                  <ConnectorBadge name="vAuto Inventory API" status={health.connectors?.vauto_inventory} />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Inventory vehicles" value={inventoryItems.length} />
                  <StatCard label="Appraisals" value={appraisalItems.length} />
                  <StatCard
                    label="Aged 60+ days"
                    value={agedCount}
                    tone={agedCount > 0 ? 'warn' : 'good'}
                    sublabel={`out of ${ages.length} with a known stock-in date`}
                  />
                  <StatCard label="Avg. days in inventory" value={avgAge ?? '—'} />
                </div>

                <p className="mt-6 text-xs text-slate-400">
                  Age is calculated from each vehicle's stock-in date (createdOn) returned by the vAuto
                  Inventory API. This is sandbox test data, not real Bridgeland/Candy Cars inventory.
                </p>
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}
