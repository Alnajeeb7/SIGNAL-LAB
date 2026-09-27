import { AppProvider, useApp } from './store.jsx'
import Nav from './components/Nav'
import Home from './components/Home'
import Upload from './components/Upload'
import Analysis from './components/Analysis'
import History from './components/History'
import Report from './components/Report'

function Pages() {
  const { page } = useApp()
  return (
    <>
      {page === 'home'     && <Home />}
      {page === 'upload'   && <Upload />}
      {page === 'analysis' && <Analysis />}
      {page === 'history'  && <History />}
      {page === 'report'   && <Report />}
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-bg text-text">
        <Nav />
        <Pages />
      </div>
    </AppProvider>
  )
}
