import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useState } from 'react'

// A "pick several" filter. options: [{ value, label, count }].
// Counts come from the rows that match every OTHER active filter, so they
// show what you would get by ticking that option.
export default function FacetFilter({ label, options, selected, onChange }) {
  const [query, setQuery] = useState('')
  const chosen = new Set(selected)

  // Keep ticked options visible even if nothing matches them right now.
  const known = new Set(options.map((o) => o.value))
  const all = [...options, ...selected.filter((v) => !known.has(v)).map((v) => ({ value: v, label: v, count: 0 }))]
  const shown = query ? all.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())) : all

  function toggle(value) {
    onChange(chosen.has(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  return (
    <Popover.Root onOpenChange={(open) => !open && setQuery('')}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium backdrop-blur-xl transition-colors ${
            selected.length
              ? 'border-accent/40 bg-accent/10 text-ink'
              : 'border-line/10 bg-surface/60 text-ink-2 hover:text-ink'
          }`}
        >
          {label}
          {selected.length > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
              {selected.length}
            </span>
          )}
          <ChevronDown size={14} className="text-ink-3" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          aria-label={`${label} filter`}
          sideOffset={8}
          className="z-50 w-72 rounded-2xl border border-line/15 bg-surface p-2 shadow-2xl outline-none"
        >
          {all.length > 8 && (
            <div className="relative mb-2">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 40))}
                placeholder={`Find ${label.toLowerCase()}`}
                aria-label={`Find ${label.toLowerCase()}`}
                className="h-9 w-full rounded-lg border border-line/10 bg-transparent pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
              />
            </div>
          )}

          <div role="group" aria-label={label} className="max-h-64 overflow-y-auto">
            {shown.length === 0 && <p className="px-3 py-2 text-sm text-ink-3">Nothing matches.</p>}
            {shown.map((o) => {
              const on = chosen.has(o.value)
              return (
                <button
                  key={o.value}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border ${
                      on ? 'border-accent bg-accent text-white' : 'border-line/25'
                    }`}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  <span className="text-xs tabular-nums text-ink-3">{o.count.toLocaleString('en-US')}</span>
                </button>
              )
            })}
          </div>

          {selected.length > 0 && (
            <div className="mt-2 border-t border-line/10 pt-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-ink-3 transition-colors hover:text-ink"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
