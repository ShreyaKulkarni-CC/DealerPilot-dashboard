import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Overview from './pages/Overview.jsx'
import PlatformDigest from './pages/PlatformDigest.jsx'
import Inventory from './pages/Inventory.jsx'
import Appraisals from './pages/Appraisals.jsx'
import AgedInventory from './pages/AgedInventory.jsx'
import InventoryDetail from './pages/InventoryDetail.jsx'
import AppraisalDetail from './pages/AppraisalDetail.jsx'
import { PLATFORMS } from './lib/platforms'

const STATUS_DOT = {
  credentials: 'bg-emerald-500',
  in_progress: 'bg-amber-400',
  planned: 'bg-slate-300',
}

function Layout({ children }) {
  const linkClass = ({ isActive }) =>
    `block rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  const subLinkClass = ({ isActive }) =>
    `block rounded-md py-1.5 pl-8 pr-3 text-sm ${
      isActive ? 'bg-slate-200 font-medium text-slate-900' : 'text-slate-500 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="min-h-screen w-56 shrink-0 border-r border-slate-200 bg-white p-4">
          <div className="mb-6 text-lg font-bold text-slate-800">DealerPilot</div>
          <nav className="space-y-1">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>

            <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Platforms
            </div>

            {PLATFORMS.map((p) => (
              <div key={p.id}>
                <NavLink to={`/platforms/${p.id}`} className={linkClass}>
                  <span className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[p.status] || STATUS_DOT.planned}`} />
                    {p.name}
                  </span>
                </NavLink>
                {p.id === 'vauto' && (
                  <div className="mt-1 space-y-0.5">
                    <NavLink to="/inventory" className={subLinkClass}>
                      Inventory
                    </NavLink>
                    <NavLink to="/appraisals" className={subLinkClass}>
                      Appraisals
                    </NavLink>
                    <NavLink to="/aged-inventory" className={subLinkClass}>
                      Aged Inventory
                    </NavLink>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/platforms/vauto" element={<Overview />} />
          <Route path="/platforms/:platformId" element={<PlatformDigest />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory/:id" element={<InventoryDetail />} />
          <Route path="/appraisals" element={<Appraisals />} />
          <Route path="/appraisals/:id" element={<AppraisalDetail />} />
          <Route path="/aged-inventory" element={<AgedInventory />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
