import { Car, ClipboardList, Gauge, Handshake, Home, Hourglass, Radar, Users, Wrench } from 'lucide-react'

export const HOME_LINK = { to: '/', label: 'Home', icon: Home, end: true }

// Pages under the vAuto platform.
export const VAUTO_LINKS = [
  { to: '/inventory', label: 'Inventory', icon: Car },
  { to: '/appraisals', label: 'Appraisals', icon: ClipboardList },
  { to: '/inventory?aged=1', label: 'Aged inventory', icon: Hourglass },
]

export const PLATFORM_ICONS = {
  vauto: Gauge,
  rapidrecon: Radar,
  drivecentric: Users,
  dealertrack: Handshake,
  xtime: Wrench,
}

const TITLES = [
  ['/platforms/vauto', 'vAuto digest'],
  ['/platforms/', 'Platform digest'],
  ['/inventory', 'Inventory'],
  ['/appraisals', 'Appraisals'],
  ['/aged-inventory', 'Aged inventory'],
]

export function titleFor(pathname) {
  if (pathname === '/') return 'Home'
  const hit = TITLES.find(([prefix]) => pathname.startsWith(prefix))
  return hit ? hit[1] : 'DealerPilot'
}
