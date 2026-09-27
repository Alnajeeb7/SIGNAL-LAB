import { useState, useRef } from 'react'
import { useApp } from '../store.jsx'
import { analyzeWAV, analyzeIQ, buildDemoFile, fmtBytes } from '../dsp'

const STEPS = [
  { id: 'read',        label: 'Reading signal data' },
  { id: 'validate',    label: 'Validating & preprocessing' },
  { id: 'fft',         label: 'Computing FFT spectrum' },
  { id: 'spectrogram', label: 'Generating spectrogram' },
  { id: 'params',      label: 'Extracting parameters' },
  { id: 'viz',         label: 'Rendering visualizations' },
]

const DEMOS = [
  { key: 'sine',    label: 'Pure Sine Wave',     sub: '1 kHz · 48 kHz SR',       tag: 'WAV' },
  { key: 'multi',   label: 'Multi-Frequency',    sub: '440 + 1k + 3.5 kHz',      tag: 'WAV' },
  { key: 'noisy',   label: 'Noisy Signal',       sub: '1 kHz + AWGN noise',      tag: 'WAV' },
  { key: 'chirp',   label: 'Linear Chirp',       sub: '200 Hz → 5 kHz sweep',    tag: 'WAV' },
  { key: 'iq_tone', label: 'IQ Complex Tone',    sub: '100 kHz IF · 1 MSPS',     tag: 'IQ'  },
  { key: 'iq_am',   label: 'IQ AM Signal',       sub: 'AM envelope · 500 kSPS',  tag: 'IQ'  },
]

export default function Upload() {
  const { navigate, setCurrentAnalysis, addHistory } = useApp()
  const [fileData, setFileData] = useState(null)
  const [steps, setSteps]       = useState({})
  const [processing, setProcessing] = useState(false)
  const [error, setError]       = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [iqCfg, setIqCfg]       = useState({ sampleRate: 1000000, dataType: 'float32', byteOrder: 'little' })
  const inputRef = useRef(null)

  const onStep = (id, state) => setSteps(s => ({ ...s, [id]: state }))

  const acceptFile = (file) => {
    setError(null)
    setSteps({})
    const ext = file.name.split('.').pop().toLowerCase()
    const isWav = ext === 'wav'
    const isIQ  = ['iq', 'raw', 'bin', 'dat'].includes(ext)
    if (!isWav && !isIQ) { setError(`".${ext}" is not supported. Upload a .wav or .iq file.`); return }
    if (file.size === 0)  { setError('File is empty.'); return }
    if (file.size > 200 * 1024 * 1024) { setError('File exceeds 200 MB limit.'); return }
    setFileData({ file, ext, isWav, isIQ })
  }

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f) }

  const runAnalysis = async () => {
    if (!fileData) return
    if (fileData.isIQ && (!iqCfg.sampleRate || iqCfg.sampleRate <= 0)) { setError('Specify a valid sample rate for IQ processing.'); return }
    setProcessing(true); setError(null)
    try {
      const result = fileData.isWav
        ? await analyzeWAV(fileData.file, onStep)
        : await analyzeIQ(fileData.file, iqCfg, onStep)
      setCurrentAnalysis(result)
      addHistory(result)
      navigate('analysis')
    } catch (e) {
      setError(e.message || 'Analysis failed.')
      setProcessing(false)
    }
  }

  const loadDemo = (key) => {
    const d = buildDemoFile(key)
    if (!d) return
    if (d.cfg) setIqCfg(d.cfg)
    acceptFile(d.file)
  }

  const stepState = (id) => steps[id] || 'pending'

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h2 className="text-xl font-bold tracking-tight text-white mb-1">Signal Analysis</h2>
        <p className="text-muted text-sm">Upload a .wav or .IQ file to begin automated analysis and parameter extraction.</p>
      </div>

      {/* ── DROP ZONE ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !processing && inputRef.current?.click()}
        className={`relative border rounded cursor-pointer transition-colors mb-4 ${
          dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-faint bg-surface'
        } ${processing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input ref={inputRef} type="file" accept=".wav,.iq,.raw,.bin,.dat" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) acceptFile(f); e.target.value = '' }} />
        <div className="flex flex-col items-center justify-center py-14 px-8 text-center">
          <div className="w-10 h-10 rounded-lg border border-border flex items-center justify-center mb-4 text-muted">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 6l4-4 4 4M2 14v2h14v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p className="text-sm font-medium text-text mb-1">Drop signal file here</p>
          <p className="text-xs text-muted mb-4">or click to browse</p>
          <div className="flex gap-2">
            {['.WAV', '.IQ', '.raw', '.bin'].map(f => (
              <span key={f} className="text-[10px] font-mono text-muted border border-border rounded px-2 py-0.5">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="flex items-start gap-3 p-3 rounded border border-red-900/50 bg-red-950/30 text-red-400 text-sm mb-4">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v4M7 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          {error}
        </div>
      )}

      {/* ── FILE INFO ── */}
      {fileData && !processing && (
        <div className="border border-border rounded bg-surface mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-mono font-medium text-text truncate">{fileData.file.name}</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-3 flex-shrink-0 ${fileData.isWav ? 'text-blue-400 bg-blue-400/10' : 'text-purple-400 bg-purple-400/10'}`}>
              {fileData.isWav ? 'WAV' : 'IQ'}
            </span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-border">
            {[['Size', fmtBytes(fileData.file.size)], ['Extension', fileData.ext.toUpperCase()], ['Type', fileData.isWav ? 'Audio / Signal' : 'Raw IQ Signal'], ['Status', 'Ready']].map(([l, v]) => (
              <div key={l} className="px-4 py-3">
                <div className="text-[10px] text-muted uppercase tracking-widest mb-1">{l}</div>
                <div className="text-sm font-medium text-text">{v}</div>
              </div>
            ))}
          </div>

          {/* IQ config */}
          {fileData.isIQ && (
            <div className="border-t border-border px-4 py-4">
              <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 3.5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                IQ File Configuration
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Sample Rate (Hz)', field: 'sampleRate', type: 'number', placeholder: 'e.g. 1000000' },
                ].map(({ label, field, type, placeholder }) => (
                  <div key={field}>
                    <label className="block text-[11px] text-muted mb-1.5">{label}</label>
                    <input type={type} placeholder={placeholder} value={iqCfg[field]}
                      onChange={e => setIqCfg(c => ({ ...c, [field]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))}
                      className="w-full bg-bg border border-border rounded px-2.5 py-1.5 text-sm text-text placeholder-muted/50 outline-none focus:border-accent transition-colors font-mono"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Data Type</label>
                  <select value={iqCfg.dataType} onChange={e => setIqCfg(c => ({ ...c, dataType: e.target.value }))}
                    className="w-full bg-bg border border-border rounded px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent transition-colors">
                    {['float32', 'float64', 'int16', 'int8', 'uint8'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Byte Order</label>
                  <select value={iqCfg.byteOrder} onChange={e => setIqCfg(c => ({ ...c, byteOrder: e.target.value }))}
                    className="w-full bg-bg border border-border rounded px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent transition-colors">
                    <option value="little">Little-endian</option>
                    <option value="big">Big-endian</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-border px-4 py-3 flex gap-2">
            <button onClick={runAnalysis} className="flex items-center gap-2 px-4 py-1.5 bg-accent text-white text-sm font-medium rounded hover:bg-accent-dim transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l6 4-6 4V2z" fill="currentColor"/></svg>
              Run Analysis
            </button>
            <button onClick={() => { setFileData(null); setSteps({}) }} className="px-3 py-1.5 text-sm text-muted border border-border rounded hover:border-faint hover:text-text transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {processing && (
        <div className="border border-border rounded bg-surface px-5 py-5 mb-4">
          <p className="text-xs font-medium text-muted uppercase tracking-widest mb-4">Processing Signal</p>
          <div className="space-y-2.5">
            {STEPS.map(s => {
              const st = stepState(s.id)
              return (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    st === 'done'    ? 'bg-green-500/10 text-green-400' :
                    st === 'running' ? 'bg-accent/10 border border-accent' : 'bg-border'
                  }`}>
                    {st === 'done' && (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                    {st === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                  </div>
                  <span className={st === 'done' ? 'text-muted line-through' : st === 'running' ? 'text-text' : 'text-muted/50'}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── DEMO SIGNALS ── */}
      <div className="pt-6 border-t border-border">
        <p className="text-[11px] text-muted font-medium uppercase tracking-widest mb-3">Synthetic Demo Signals</p>
        <div className="grid grid-cols-3 gap-px bg-border rounded overflow-hidden">
          {DEMOS.map(d => (
            <button key={d.key} onClick={() => loadDemo(d.key)}
              className="bg-surface hover:bg-border/40 transition-colors text-left px-4 py-3 group">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-semibold ${d.tag === 'WAV' ? 'text-blue-400' : 'text-purple-400'}`}>.{d.tag.toLowerCase()}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-border group-hover:text-muted transition-colors">
                  <path d="M1 9L9 1M9 1H3M9 1v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-[13px] font-medium text-text">{d.label}</div>
              <div className="text-[11px] text-muted mt-0.5">{d.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
