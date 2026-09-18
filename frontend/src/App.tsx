import { Navigate, Route, Routes } from 'react-router-dom'
import AssistantPage from './pages/AssistantPage'
import ScriptsPage from './pages/ScriptsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ScriptsPage />} />
      <Route path="/scripts/:id" element={<ScriptsPage />} />
      <Route path="/assistant" element={<AssistantPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
