import { useApp } from '../store.jsx'

const links = [
  { id: 'home',     label: 'Home' },
  { id: 'upload',   label: 'Analyze' },
  { id: 'analysis', label: 'Results' },
  { id: 'history',  label: 'History' },
]

export default function Nav() {
  const { page, navigate, currentAnalysis } = useApp()

  const go = (id) => {
    if (id === 'analysis' && !currentAnalysis) { navigate('upload'); return }
    navigate(id)
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-5 h-12 flex items-center justify-between">
        {/* Brand */}
        <button onClick={() => navigate('home')} className="flex items-center gap-2.5 text-text hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="9" width="2.5" height="7" rx="1.25" fill="#3b82f6"/>
            <rect x="5" y="6" width="2.5" height="10" rx="1.25" fill="#3b82f6"/>
            <rect x="9" y="2" width="2.5" height="14" rx="1.25" fill="#3b82f6"/>
            <rect x="13" y="6" width="2.5" height="10" rx="1.25" fill="#3b82f6" opacity="0.5"/>
            <rect x="17" y="9" width="2.5" height="7" rx="1.25" fill="#3b82f6" opacity="0.25"/>
          </svg>
          <span className="text-sm font-semibold tracking-tight">SignalLab</span>
        </button>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map(l => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                page === l.id || (page === 'report' && l.id === 'analysis')
                  ? 'text-accent bg-accent/10'
                  : 'text-muted hover:text-text hover:bg-border/60'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
