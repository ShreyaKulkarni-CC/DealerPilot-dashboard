import { motion } from 'framer-motion'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import ChartCard from '../components/charts/ChartCard'
import StoreBars from '../components/charts/StoreBars'
import WeeklyLines from '../components/charts/WeeklyLines'
import CountUp from '../components/ui/CountUp'
import Reveal from '../components/ui/Reveal'
import { Link } from 'react-router-dom'
import Skeleton from '../components/ui/Skeleton'
import {
  AGED_OVER_DAYS,
  WEEKS_SHOWN,
  flattenAppraisal,
  flattenInventory,
  fmt,
  storeColor,
  summarizeAppraisals,
  summarizeInventory,
} from '../lib/digest'
import { useStores } from '../lib/storeContext'
import { useVautoData } from '../lib/vautoData'

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (Number.isNaN(s)) return null
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  return `${Math.floor(s / 3600)} h ago`
}

function Panel({ className = '', children }) {
  return <div className={`rounded-3xl border border-line/10 bg-surface p-6 ${className}`}>{children}</div>
}

function Tile({ label, children, note, className = '' }) {
  return (
    <Panel className={className}>
      <div className="text-sm font-medium text-ink-3">{label}</div>
      <div className="mt-2 font-display text-4xl font-semibold text-ink">{children}</div>
      {note && <div className="mt-2 text-xs leading-relaxed text-ink-3">{note}</div>}
    </Panel>
  )
}

function ErrorPanel({ title, message }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-800 dark:text-red-200">
      <TriangleAlert size={18} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-1 break-words opacity-90">{message}</div>
      </div>
    </div>
  )
}

function StoreSplit({ stores, counts, total }) {
  if (stores.length < 2 || total === 0) return null
  return (
    <div className="mt-6">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {stores.map((s) => (
          <motion.div
            key={s.id}
            initial={{ width: 0 }}
            animate={{ width: `${(counts[s.id] / total) * 100}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ background: storeColor(stores, s.id) }}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {stores.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: storeColor(stores, s.id) }} />
            <span className="text-ink-2">{s.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">{fmt(counts[s.id])}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading vAuto data">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-64 md:col-span-2 lg:row-span-2 lg:h-auto" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-80 lg:col-span-7" />
        <Skeleton className="h-80 lg:col-span-5" />
      </div>
    </div>
  )
}

export default function Overview() {
  const { status, inventory, appraisals, reload, cooling } = useVautoData()
  const { stores: allStores, selectedStores, environment } = useStores()

  const storeIds = useMemo(() => selectedStores.map((s) => s.id), [selectedStores])
  const stores = selectedStores

  const inv = useMemo(() => {
    if (!inventory?.ok) return null
    return summarizeInventory((inventory.value.items || []).map(flattenInventory), storeIds)
  }, [inventory, storeIds])

  const apr = useMemo(() => {
    if (!appraisals?.ok) return null
    return summarizeAppraisals((appraisals.value.items || []).map(flattenAppraisal), storeIds)
  }, [appraisals, storeIds])

  const busy = status === 'loading' || status === 'refreshing'
  const firstLoad = status === 'idle' || status === 'loading'

  const storeIssues = [
    ...(inventory?.ok ? inventory.value.stores : []).filter((s) => !s.ok).map((s) => ({ ...s, kind: 'Inventory' })),
    ...(appraisals?.ok ? appraisals.value.stores : []).filter((s) => !s.ok).map((s) => ({ ...s, kind: 'Appraisals' })),
  ].filter((s) => storeIds.includes(s.id))

  const truncated = [inventory, appraisals].some((r) => r?.ok && r.value.stores.some((s) => s.truncated))
  const refreshErrors = [inventory?.refreshError, appraisals?.refreshError].filter(Boolean)

  const fetchedAt = inventory?.ok
    ? inventory.value.stores.map((s) => s.fetchedAt).filter(Boolean).sort().pop()
    : null
  const cached = inventory?.ok && inventory.value.stores.some((s) => s.cached)

  const agedPct = inv && inv.knownAges ? Math.round((inv.aged / inv.knownAges) * 100) : null

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">vAuto</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Inventory and appraisals at a glance</h1>
          <p className="mt-1 text-sm text-ink-3">
            {fetchedAt ? `Updated ${ago(fetchedAt)}${cached ? ' (saved copy, refreshes every few minutes)' : ''}` : 'Loading live data'}
            {environment === 'sandbox' && ' · Sandbox test data'}
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={busy || cooling}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line/10 bg-surface/60 px-4 text-sm font-medium text-ink-2 backdrop-blur-xl transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {refreshErrors.length > 0 && (
        <p role="status" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
          The last refresh did not work, so this is the previous data. {refreshErrors[0]}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {firstLoad && <LoadingGrid />}

        {!firstLoad && storeIds.length === 0 && (
          <ErrorPanel title="No stores to show" message="The backend has no stores set up. Check VAUTO_STORES in backend/.env." />
        )}

        {!firstLoad && storeIds.length > 0 && (
          <>
            {storeIssues.length > 0 && (
              <div className="space-y-2">
                {storeIssues.map((s) => (
                  <ErrorPanel key={`${s.kind}-${s.id}`} title={`${s.kind} for ${s.name} could not be loaded`} message={s.error} />
                ))}
              </div>
            )}

            {/* ---------- Headline numbers ---------- */}
            {inventory && !inventory.ok && <ErrorPanel title="Inventory could not be loaded" message={inventory.error?.message} />}
            {appraisals && !appraisals.ok && <ErrorPanel title="Appraisals could not be loaded" message={appraisals.error?.message} />}

            {(inv || apr) && (
              <Reveal>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {inv && (
                    <Panel className="md:col-span-2 lg:row-span-2">
                      <div className="text-sm font-medium text-ink-3">Vehicles in inventory</div>
                      <div className="mt-3 font-display text-7xl font-semibold leading-none tracking-tight text-ink">
                        <CountUp value={inv.total} />
                      </div>
                      <p className="mt-3 text-sm text-ink-3">
                        {stores.length > 1 ? 'Across the selected stores.' : `At ${stores[0]?.name}.`}
                        {inv.hiddenDeleted > 0 && (
                          <>
                            {' '}
                            {fmt(inv.hiddenDeleted)} deleted {inv.hiddenDeleted === 1 ? 'record is' : 'records are'} not counted.
                          </>
                        )}
                      </p>
                      <StoreSplit stores={stores} counts={inv.perStore} total={inv.total} />
                    </Panel>
                  )}

                  {apr && (
                    <Tile label="Appraisals" note={`${fmt(apr.completed)} completed`}>
                      <CountUp value={apr.total} />
                    </Tile>
                  )}

                  {inv && (
                    <Tile
                      label={`Over ${AGED_OVER_DAYS} days on the lot`}
                      note={agedPct === null ? 'No stock-in dates yet.' : `${agedPct}% of vehicles with a stock-in date`}
                    >
                      <CountUp value={inv.aged} />
                      {agedPct !== null && (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${agedPct}%` }}
                            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full"
                            style={{ background: '#fab219' }}
                          />
                        </div>
                      )}
                    </Tile>
                  )}

                  {inv && (
                    <Tile label="Average days on the lot" note={inv.unknownAges ? `${fmt(inv.unknownAges)} vehicles have no date` : undefined}>
                      <CountUp value={inv.avgAge} />
                    </Tile>
                  )}

                  {apr && (
                    <Tile label="Appraisals not completed" note="Still open in vAuto">
                      <CountUp value={apr.open} />
                    </Tile>
                  )}
                </div>
              </Reveal>
            )}

            {/* ---------- Inventory charts ---------- */}
            {inv && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <Reveal className="lg:col-span-7 [&>*]:h-full">
                  <ChartCard
                    title="How long vehicles have been on the lot"
                    subtitle="Days since each vehicle was added, in four age bands"
                    rows={inv.bands}
                    stores={stores}
                    labelHeader="Age band"
                    footer={inv.unknownAges ? `${fmt(inv.unknownAges)} vehicles have no date and are not counted here.` : undefined}
                  >
                    <StoreBars rows={inv.bands} stores={stores} layout="columns" ariaLabel="Vehicles per age band, by store" />
                  </ChartCard>
                </Reveal>
                <Reveal delay={0.08} className="lg:col-span-5 [&>*]:h-full">
                  <ChartCard
                    title="Inventory by status"
                    subtitle="Biggest groups first"
                    rows={inv.statuses}
                    stores={stores}
                    labelHeader="Status"
                  >
                    <StoreBars rows={inv.statuses} stores={stores} layout="rows" ariaLabel="Vehicles per status, by store" />
                  </ChartCard>
                </Reveal>
              </div>
            )}

            {/* ---------- Appraisal charts ---------- */}
            {apr && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <Reveal className="lg:col-span-7 [&>*]:h-full">
                  <ChartCard
                    title="Appraisals per week"
                    subtitle={`Last ${WEEKS_SHOWN} weeks, by the date each appraisal was created`}
                    rows={apr.weeks}
                    stores={stores}
                    labelHeader="Week starting"
                    footer={
                      `The latest week is still in progress.` +
                      (apr.olderThanWindow ? ` ${fmt(apr.olderThanWindow)} older appraisals are not shown.` : '') +
                      (apr.undated ? ` ${fmt(apr.undated)} have no date.` : '')
                    }
                  >
                    <WeeklyLines rows={apr.weeks} stores={stores} ariaLabel="Appraisals per week, by store" />
                  </ChartCard>
                </Reveal>
                <Reveal delay={0.08} className="lg:col-span-5 [&>*]:h-full">
                  <ChartCard title="Appraisals by status" subtitle="Biggest groups first" rows={apr.statuses} stores={stores} labelHeader="Status">
                    <StoreBars rows={apr.statuses} stores={stores} layout="rows" unit="appraisals" ariaLabel="Appraisals per status, by store" />
                  </ChartCard>
                </Reveal>
              </div>
            )}

            {/* ---------- Needs attention ---------- */}
            {inv && inv.oldest.length > 0 && (
              <Reveal>
                <Panel>
                  <h2 className="font-display text-lg font-semibold text-ink">Longest on the lot</h2>
                  <p className="mt-0.5 text-sm text-ink-3">The {inv.oldest.length} oldest vehicles right now. See the full list on the <Link to="/inventory" className="font-medium text-accent underline-offset-2 hover:underline">Inventory page</Link>.</p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-line/10 text-xs text-ink-3">
                          <th className="py-2 pr-4 font-medium">Vehicle</th>
                          <th className="px-3 py-2 font-medium">Stock #</th>
                          <th className="px-3 py-2 font-medium">Store</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="py-2 pl-3 text-right font-medium">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.oldest.map((v) => (
                          <tr key={`${v.storeId}-${v.id}`} className="border-b border-line/5 last:border-0">
                            <td className="py-2.5 pr-4 text-ink">
                              {[v.year, v.make, v.model].filter(Boolean).join(' ') || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-ink-2">{v.stockNumber || '—'}</td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center gap-2 text-ink-2">
                                <span className="h-2 w-2 rounded-[2px]" style={{ background: storeColor(allStores, v.storeId) }} />
                                {v.storeName}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-ink-2">{v.status}</td>
                            <td className="py-2.5 pl-3 text-right font-semibold tabular-nums text-ink">{fmt(v.age)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </Reveal>
            )}

            {/* ---------- Summary placeholder ---------- */}
            <Reveal>
              <Panel>
                <div className="text-sm font-medium text-ink-3">Summary</div>
                <p className="mt-2 text-sm text-ink-3">AI summaries are not turned on yet.</p>
              </Panel>
            </Reveal>

            <p className="pb-4 text-xs leading-relaxed text-ink-3">
              Age is counted from each vehicle's createdOn date in vAuto, which we are treating as the stock-in date. We still
              need to confirm that against real vehicles.
              {truncated && ' One list was too long to load completely, so some totals are partial.'}
              {environment === 'sandbox' ? ' The backend is in sandbox mode, so this is shared test data, not your real stores.' : ''}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
