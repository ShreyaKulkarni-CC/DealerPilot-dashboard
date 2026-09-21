import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Overview from './pages/Overview.jsx'
import Inventory from './pages/Inventory.jsx'
import Appraisals from './pages/Appraisals.jsx'
import AgedInventory from './pages/AgedInventory.jsx'
import InventoryDetail from './pages/InventoryDetail.jsx'
import AppraisalDetail from './pages/AppraisalDetail.jsx'

function Layout({ children }) {
  const linkClass = ({ isActive }) =>
    `block rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
          <div className="mb-6 text-lg font-bold text-slate-800">DealerPilot</div>
          <nav className="space-y-1">
            <NavLink to="/" end className={linkClass}>
              Overview
            </NavLink>
            <NavLink to="/inventory" className={linkClass}>
              Inventory
            </NavLink>
            <NavLink to="/appraisals" className={linkClass}>
              Appraisals
            </NavLink>
            <NavLink to="/aged-inventory" className={linkClass}>
              Aged Inventory
            </NavLink>
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
          <Route path="/" element={<Overview />} />
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
