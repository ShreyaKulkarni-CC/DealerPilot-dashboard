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

// Each call is settled on its own, so inventory failing does not hide
// appraisals (and the other way round). Only /health is required.
async function settle(promise) {
  try {
    return { ok: true, value: await promise }
  } catch (error) {
    return { ok: false, error }
  }
}

async function loadOverview() {
  const health = await getHealth()
  const [inventory, appraisals] = await Promise.all([
    settle(getInventory({ limit: '1,100' })),
    settle(getAppraisals({ limit: '1,100' })),
  ])
  return { health, inventory, appraisals }
}

export default function Overview() {
  const { loading, error, data, reload } = useApiData(loadOverview, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">vAuto digest</h1>
        <RefreshButton onClick={reload} loading={loading} />
      </div>

      {loading && <p className="mt-4 text-slate-500">Loading live data from vAuto…</p>}

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof ApiError ? error.message : 'Something unexpected went wrong.'}
        </div>
      )}

      {!loading && !error && data && (() => {
        const { health, inventory, appraisals } = data
        const inventoryItems = inventory.ok ? inventory.value.items || [] : []
        const appraisalItems = appraisals.ok ? appraisals.value.items || [] : []

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

            {!inventory.ok && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Inventory could not be loaded. {inventory.error?.message}
              </div>
            )}
            {!appraisals.ok && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Appraisals could not be loaded. {appraisals.error?.message}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Inventory vehicles" value={inventory.ok ? inventoryItems.length : '—'} />
              <StatCard label="Appraisals" value={appraisals.ok ? appraisalItems.length : '—'} />
              <StatCard
                label="Aged 60+ days"
                value={inventory.ok ? agedCount : '—'}
                tone={inventory.ok && agedCount > 0 ? 'warn' : 'default'}
                sublabel={inventory.ok ? `out of ${ages.length} with a known stock-in date` : undefined}
              />
              <StatCard label="Avg. days in inventory" value={avgAge ?? '—'} />
            </div>

            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">Summary</div>
              <p className="mt-2 text-sm text-slate-400">
                AI summaries are not turned on yet.
              </p>
            </div>

            <p className="mt-6 text-xs text-slate-400">
              Age is calculated from each vehicle's stock-in date (createdOn) returned by the vAuto
              Inventory API.
              {health.environment === 'sandbox'
                ? ' The backend is in sandbox mode, so this is test data, not real Bridgeland or Candy Cars inventory.'
                : ''}
            </p>
          </>
        )
      })()}
    </div>
  )
}
