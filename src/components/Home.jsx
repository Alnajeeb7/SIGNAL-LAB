import { useEffect, useRef } from 'react'
import { useApp } from '../store.jsx'

const DEMOS = [
  { key: 'sine',     label: 'Pure Sine',        sub: '1 kHz · 48 kHz SR',           tag: 'WAV' },
  { key: 'multi',    label: 'Multi-Frequency',   sub: '440 + 1k + 3.5 kHz',          tag: 'WAV' },
  { key: 'noisy',    label: 'Noisy Signal',      sub: '1 kHz + AWGN',                tag: 'WAV' },
  { key: 'chirp',    label: 'Linear Chirp',      sub: '200 Hz → 5 kHz sweep',        tag: 'WAV' },
  { key: 'iq_tone',  label: 'IQ Complex Tone',   sub: '100 kHz IF · 1 MSPS',         tag: 'IQ'  },
  { key: 'iq_am',    label: 'IQ AM Signal',      sub: 'AM envelope · 500 kSPS',      tag: 'IQ'  },
]

export default function Home() {
  const { navigate } = useApp()
  const svgRef = useRef(null)

  // Draw animated preview waveform
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const W = svg.clientWidth || 800, H = 80
    let frame = 0
    let raf

    const draw = () => {
      const pts = []
      for (let i = 0; i <= 200; i++) {
        const x = (i / 200) * W
        const t = i / 200 + frame * 0.003
        const y = H / 2 - (H * 0.38) * (
          0.5 * Math.sin(2 * Math.PI * 3 * t) +
          0.3 * Math.sin(2 * Math.PI * 7 * t + 1) +
          0.2 * Math.sin(2 * Math.PI * 13 * t + 2)
        )
        pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      }
      svg.querySelector('#wavePath').setAttribute('d', pts.join(' '))
      frame++
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-5">
      {/* ── HERO ── */}
      <section className="pt-20 pb-16 border-b border-border">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-accent tracking-widest uppercase mb-6 px-2.5 py-1 rounded bg-accent/8 border border-accent/20">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            SIH26147 · NTRO · Signal Analysis
          </div>

          <h1 className="text-4xl font-bold tracking-tight leading-[1.1] text-white mb-5">
            Automated Signal<br />Analysis Platform
          </h1>

          <p className="text-muted text-[15px] leading-relaxed mb-8 max-w-xl">
            Upload .IQ and .wav files, extract signal parameters, and inspect frequency and time-frequency characteristics — all from a single workspace.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('upload')}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded hover:bg-accent-dim transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v8M3.5 4l3-3 3 3M1 11h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Analyze Signal
            </button>
            <button
              onClick={() => navigate('upload')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted border border-border rounded hover:border-faint hover:text-text transition-colors"
            >
              View Demos
            </button>
          </div>
        </div>

        {/* Workflow */}
        <div className="flex items-center gap-3 mt-12 text-[11px] font-medium text-muted tracking-widest uppercase">
          {['Upload', 'Analyze', 'Extract', 'Report'].map((s, i, a) => (
            <span key={s} className="flex items-center gap-3">
              <span className={i === 1 || i === 2 ? 'text-text/60' : ''}>{s}</span>
              {i < a.length - 1 && <span className="text-border">→</span>}
            </span>
          ))}
        </div>
      </section>

      {/* ── LIVE PREVIEW ── */}
      <section className="py-12 border-b border-border">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] text-muted font-medium uppercase tracking-widest">Live waveform preview</p>
          <div className="flex gap-4 text-[11px] font-mono text-muted">
            <span>48 kHz</span><span>·</span><span>16-bit</span><span>·</span><span>Mono</span>
          </div>
        </div>
        <div className="rounded border border-border bg-surface overflow-hidden">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[11px] text-muted font-mono">time-domain waveform</span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-border" />
              <span className="w-2 h-2 rounded-full bg-border" />
              <span className="w-2 h-2 rounded-full bg-border" />
            </div>
          </div>
          <div className="px-4 pt-3 pb-4">
            <svg ref={svgRef} width="100%" height="80" viewBox="0 0 800 80" preserveAspectRatio="none">
              <path id="wavePath" d="" stroke="#3b82f6" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke"/>
            </svg>
          </div>
          <div className="grid grid-cols-4 border-t border-border divide-x divide-border">
            {[['Sample Rate','48,000','Hz'],['Duration','2.000','s'],['RMS','0.5774','—'],['Dom. Freq','1,000','Hz']].map(([l, v, u]) => (
              <div key={l} className="px-4 py-3">
                <div className="text-[10px] text-muted uppercase tracking-widest mb-1">{l}</div>
                <div className="text-white font-semibold font-mono text-base tracking-tight">{v}</div>
                <div className="text-[10px] text-muted mt-0.5">{u}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO SIGNALS ── */}
      <section className="py-12">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[11px] text-muted font-medium uppercase tracking-widest">Synthetic demo signals</p>
          <span className="text-[11px] text-muted border border-border rounded px-2 py-0.5">For testing only · not real-world data</span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-border rounded overflow-hidden">
          {DEMOS.map(d => (
            <button
              key={d.key}
              onClick={() => navigate('upload')}
              className="bg-surface hover:bg-border/40 transition-colors text-left px-4 py-4 group"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${d.tag === 'WAV' ? 'text-blue-400 bg-blue-400/10' : 'text-purple-400 bg-purple-400/10'}`}>
                  .{d.tag.toLowerCase()}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted group-hover:text-text transition-colors mt-0.5">
                  <path d="M2 10L10 2M10 2H4M10 2v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-sm font-medium text-text mb-0.5">{d.label}</div>
              <div className="text-[12px] text-muted">{d.sub}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
