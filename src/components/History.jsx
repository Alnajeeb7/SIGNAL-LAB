import { useApp } from '../store.jsx'
import { fmtFreq } from '../dsp'

export default function History() {
  const { history, clearHistory, setCurrentAnalysis, navigate } = useApp()

  const open = (entry) => {
    if (!entry.result) return
    setCurrentAnalysis(entry.result)
    navigate('analysis')
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-1">Analysis History</h2>
          <p className="text-muted text-sm">Previously analyzed signal files — stored in-session.</p>
        </div>
        {history.length > 0 && (
          <button onClick={clearHistory} className="text-xs text-muted border border-border rounded px-3 py-1.5 hover:border-faint hover:text-text transition-colors">
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="border border-border rounded bg-surface px-6 py-16 text-center">
          <p className="text-sm font-medium text-text mb-1">No analyses yet</p>
          <p className="text-xs text-muted mb-4">Upload a .wav or .IQ file to begin analysis.</p>
          <button onClick={() => navigate('upload')} className="text-xs text-accent border border-accent/30 rounded px-3 py-1.5 hover:bg-accent/10 transition-colors">
            Analyze a Signal
          </button>
        </div>
      ) : (
        <div className="border border-border rounded bg-surface overflow-hidden">
          {history.map((entry, i) => (
            <div
              key={entry.id}
              onClick={() => open(entry)}
              className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-border/20 transition-colors ${i < history.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 ${entry.type === 'WAV' ? 'bg-blue-400/10 text-blue-400' : 'bg-purple-400/10 text-purple-400'}`}>
                {entry.type}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono font-medium text-text truncate">{entry.name}</div>
                <div className="text-[11px] text-muted mt-0.5">
                  {new Date(entry.timestamp).toLocaleString()} · {entry.sampleRate?.toLocaleString()} Hz · {entry.duration?.toFixed(2)}s
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
                <div className="text-right">
                  <div className="text-[10px] text-muted uppercase tracking-widest">RMS</div>
                  <div className="text-sm font-mono font-medium text-text">{entry.rms?.toFixed(4)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted uppercase tracking-widest">Dom. Freq</div>
                  <div className="text-sm font-mono font-medium text-text">{entry.dominantFreq ? fmtFreq(entry.dominantFreq) : '—'}</div>
                </div>
              </div>

              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted flex-shrink-0">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
