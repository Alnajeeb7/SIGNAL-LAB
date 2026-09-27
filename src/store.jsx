import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [page, setPage] = useState('home')
  const [currentAnalysis, setCurrentAnalysis] = useState(null)
  const [history, setHistory] = useState([])

  const navigate = useCallback((p) => {
    setPage(p)
    window.scrollTo(0, 0)
  }, [])

  const addHistory = useCallback((result) => {
    setHistory(prev => [
      { id: Date.now().toString(), name: result.fileInfo.name, type: result.fileInfo.type, timestamp: result.timestamp, sampleRate: result.fileInfo.sampleRate, duration: result.fileInfo.duration, rms: result.stats.rms, dominantFreq: result.frequency.dominantFreq, result },
      ...prev.slice(0, 49),
    ])
  }, [])

  const clearHistory = useCallback(() => setHistory([]), [])

  return (
    <AppContext.Provider value={{ page, navigate, currentAnalysis, setCurrentAnalysis, history, addHistory, clearHistory }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
