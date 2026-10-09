import { motion } from 'framer-motion'
import { ArrowUpRight, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import Reveal from '../components/ui/Reveal'
import SpotlightCard from '../components/ui/SpotlightCard'
import StatusBadge from '../components/ui/StatusBadge'
import { PLATFORM_ICONS, VAUTO_LINKS } from '../lib/nav'
import { PLATFORMS } from '../lib/platforms'
import { useStores } from '../lib/storeContext'

export default function Home() {
  // Only the store list loads here, so Home still works when a platform's
  // data API is failing.
  const { error, environment, stores } = useStores()
  const [vauto, ...others] = PLATFORMS
  const VautoIcon = PLATFORM_ICONS[vauto.id]

  return (
    <div className="mx-auto max-w-6xl">
      <section className="pb-10 pt-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-accent"
        >
          Bridgeland Auto Brokers · Candy Cars
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl"
        >
          All your platforms.
          <br />
          <span className="text-gradient">One cockpit.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-5 max-w-2xl text-base leading-relaxed text-ink-2"
        >
          Each platform gets its own digest: its data in a simpler form, a short summary, and a link to the
          platform itself. Platforms run on their own, so one being down never affects the others.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex flex-wrap gap-2"
        >
          {VAUTO_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="inline-flex items-center gap-2 rounded-full border border-line/10 bg-surface/60 px-4 py-2 text-sm font-medium text-ink-2 backdrop-blur-xl transition-colors hover:border-accent/40 hover:text-ink"
            >
              <l.icon size={16} className="text-accent" /> {l.label}
            </Link>
          ))}
        </motion.div>
      </section>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"
        >
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <span>The DealerPilot backend is not reachable, so live status is unavailable. Is it running?</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <Reveal className="md:col-span-6 lg:col-span-4">
          <SpotlightCard to={`/platforms/${vauto.id}`} className="h-full">
            <div className="flex h-full min-h-[240px] flex-col p-7">
              <div className="flex items-start justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
                  <VautoIcon size={24} />
                </span>
                <StatusBadge status={vauto.status} />
              </div>
              <h2 className="mt-6 font-display text-3xl font-semibold text-ink">{vauto.name}</h2>
              <p className="mt-2 max-w-md text-ink-2">{vauto.blurb}</p>
              <p className="mt-auto pt-6 text-sm text-ink-3">{vauto.note}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Open digest
                <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </div>
          </SpotlightCard>
        </Reveal>

        <Reveal delay={0.08} className="md:col-span-6 lg:col-span-2">
          <SpotlightCard className="h-full">
            <div className="flex h-full min-h-[240px] flex-col justify-between p-7">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Connected stores</div>
              <div>
                <div className="font-display text-6xl font-semibold text-ink">{stores.length || '–'}</div>
                <p className="mt-2 text-sm text-ink-2">
                  {stores.length > 0 ? stores.map((s) => s.name).join(' and ') : 'Waiting for the backend'}
                </p>
              </div>
              {environment && (
                <p className="text-xs text-ink-3">
                  {environment === 'production' ? 'Showing real store data.' : 'Sandbox: shared test data, not your stores.'}
                </p>
              )}
            </div>
          </SpotlightCard>
        </Reveal>

        {others.map((p, i) => {
          const Icon = PLATFORM_ICONS[p.id]
          return (
            <Reveal key={p.id} delay={0.05 * i} className="md:col-span-3 lg:col-span-2">
              <SpotlightCard to={`/platforms/${p.id}`} className="h-full">
                <div className="flex h-full min-h-[190px] flex-col p-6">
                  <div className="flex items-start justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink/5 text-ink-2 ring-1 ring-line/10">
                      <Icon size={20} />
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-ink">{p.name}</h3>
                  <p className="mt-1 text-sm text-ink-2">{p.blurb}</p>
                  <p className="mt-auto pt-4 text-xs text-ink-3">{p.note}</p>
                </div>
              </SpotlightCard>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
