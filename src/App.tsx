import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { ModuleView } from './pages/ModuleView'
import { ExperimentsPage } from './pages/ExperimentsPage'

export default function App() {
  return (
    <BrowserRouter>
      <nav className="fixed bottom-4 right-4 z-50 flex gap-2">
        <Link
          to="/"
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-full transition-colors"
        >
          Dashboard
        </Link>
        <Link
          to="/experiments"
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-full transition-colors"
        >
          Experiments
        </Link>
      </nav>
      <Routes>
        <Route path="/"               element={<Dashboard />} />
        <Route path="/module/:id"     element={<ModuleView />} />
        <Route path="/experiments"    element={<ExperimentsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
