import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ReaderPage from './pages/ReaderPage'
import ConfigPage from './pages/ConfigPage'
import Layout from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reader" element={<ReaderPage />} />
        <Route path="/config" element={<ConfigPage />} />
      </Routes>
    </Layout>
  )
}

export default App

