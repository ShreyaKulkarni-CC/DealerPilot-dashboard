// The list of platforms shown in the DealerPilot hub. This is the one place
// to edit when a platform's status changes or when you have its real link.
//
// status:
//   'credentials'  - backend has credentials for it (data access may still be pending)
//   'in_progress'  - being built separately, not wired into DealerPilot yet
//   'planned'      - nothing connected yet
//
// externalUrl: the platform's own website, opened from its digest page.
// Left null on purpose until the real link is confirmed. Must be https://.
//
// note: one short line of honest status shown on the card.

export const PLATFORMS = [
  {
    id: 'vauto',
    name: 'vAuto',
    blurb: 'Inventory and appraisals.',
    status: 'credentials',
    externalUrl: null,
    note: 'Inventory and appraisals for both stores in one view.',
  },
  {
    id: 'rapidrecon',
    name: 'RapidRecon',
    blurb: 'RapidRecon data in a simpler view.',
    status: 'in_progress',
    externalUrl: null,
    note: 'Dashboard is being built separately, will be added here.',
  },
  {
    id: 'drivecentric',
    name: 'DriveCentric',
    blurb: 'Not connected yet.',
    status: 'planned',
    externalUrl: null,
    note: 'API access not confirmed yet.',
  },
  {
    id: 'dealertrack',
    name: 'Dealertrack',
    blurb: 'Not connected yet.',
    status: 'planned',
    externalUrl: null,
    note: 'API access not confirmed yet.',
  },
  {
    id: 'xtime',
    name: 'Xtime',
    blurb: 'Not connected yet.',
    status: 'planned',
    externalUrl: null,
    note: 'API access not confirmed yet.',
  },
]

export const STATUS_LABELS = {
  credentials: 'Credentials set',
  in_progress: 'In progress',
  planned: 'Coming soon',
}

export const STATUS_STYLES = {
  credentials: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-amber-100 text-amber-700',
  planned: 'bg-slate-100 text-slate-500',
}

export function getPlatform(id) {
  return PLATFORMS.find((p) => p.id === id) || null
}

// Only allow real https links to be opened from the app.
export function safeExternalUrl(url) {
  if (typeof url !== 'string') return null
  return url.startsWith('https://') ? url : null
}
