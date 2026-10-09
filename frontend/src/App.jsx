import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/shell/AppShell.jsx'
import { StoreProvider } from './lib/storeContext.jsx'
import { VautoDataProvider } from './lib/vautoData.jsx'
import { ThemeProvider } from './lib/theme.jsx'
import AppraisalDetail from './pages/AppraisalDetail.jsx'
import Appraisals from './pages/Appraisals.jsx'
import Home from './pages/Home.jsx'
import Inventory from './pages/Inventory.jsx'
import InventoryDetail from './pages/InventoryDetail.jsx'
import Overview from './pages/Overview.jsx'
import PlatformDigest from './pages/PlatformDigest.jsx'

// The pages below still use the earlier light styling. Until they are rebuilt
// (next phases) they sit inside a light panel so they stay readable on the
// dark theme.
function LegacyPanel({ children }) {
  return (
    <div className="legacy-panel overflow-hidden rounded-3xl border border-line/10 bg-slate-50 text-slate-800 shadow-xl shadow-black/10">
      {children}
    </div>
  )
}

const legacy = (el) => <LegacyPanel>{el}</LegacyPanel>

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <StoreProvider>
            <VautoDataProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Home />} />
                  <Route path="platforms/vauto" element={<Overview />} />
                  <Route path="platforms/:platformId" element={legacy(<PlatformDigest />)} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="inventory/:id" element={legacy(<InventoryDetail />)} />
                  <Route path="appraisals" element={legacy(<Appraisals />)} />
                  <Route path="appraisals/:id" element={legacy(<AppraisalDetail />)} />
                  <Route path="aged-inventory" element={<Navigate to="/inventory?aged=1" replace />} />
                </Route>
              </Routes>
            </VautoDataProvider>
          </StoreProvider>
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  )
}
