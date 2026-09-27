import { useApp } from '../store.jsx'
import Chart from './Chart'
import { fmtFreq, fmtBytes, fmtNum } from '../dsp'

function SumCell({ label, value, unit }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="text-[10px] text-muted uppercase tracking-widest mb-1.5">{label}</div>
      <div className="text-lg font-bold font-mono text-white tracking-tight leading-none">{value}</div>
      {unit && <div className="text-[10px] text-muted mt-1">{unit}</div>}
    </div>
  )
}

function Section({ title, meta, children }) {
  return (
    <div className="border border-border rounded bg-surface overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-text">{title}</span>
        {meta && <span className="text-[11px] text-muted font-mono">{meta}</span>}
      </div>
      <div>{children}</div>
    </div>
  )
}

const WAVEFORM_COLOR = '#3b82f6'
const SPEC_COLORSCALE = [[0,'#08090d'],[0.2,'#0d1b3e'],[0.5,'#1a4ed8'],[0.8,'#38bdf8'],[1,'#e0f2fe']]

export default function Analysis() {
  const { currentAnalysis, navigate } = useApp()
  if (!currentAnalysis) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-20 text-center">
        <p className="text-muted text-sm">No analysis loaded.</p>
        <button onClick={() => navigate('upload')} className="mt-4 px-4 py-2 text-sm text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors">Upload a file</button>
      </div>
    )
  }

  const r = currentAnalysis
  const fi = r.fileInfo
  const st = r.stats
  const fr = r.frequency
  const v  = r.viz

  const srFmt = fi.sampleRate >= 1e6 ? (fi.sampleRate/1e6).toFixed(2)+'M' : fi.sampleRate >= 1000 ? (fi.sampleRate/1000).toFixed(1)+'k' : fi.sampleRate
  const dfFmt = fr.dominantFreq >= 1e6 ? (fr.dominantFreq/1e6).toFixed(3)+' M' : fr.dominantFreq >= 1000 ? (fr.dominantFreq/1000).toFixed(2)+' k' : fr.dominantFreq.toFixed(1)
  const dfUnit = fr.dominantFreq >= 1e6 ? 'MHz' : fr.dominantFreq >= 1000 ? 'kHz' : 'Hz'

  // Chart traces
  const waveTrace = [{ x: v.waveformTime, y: v.waveformAmp, type: 'scatter', mode: 'lines', line: { color: WAVEFORM_COLOR, width: 1 } }]
  const specTrace = [{ x: v.freqBins, y: v.magnitudeDB, type: 'scatter', mode: 'lines', line: { color: WAVEFORM_COLOR, width: 1 }, fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.06)' }]
  const spectroTrace = v.spectrogram ? [{ z: v.spectrogram.z, x: v.spectrogram.timeAxis, y: v.spectrogram.freqAxis, type: 'heatmap', colorscale: SPEC_COLORSCALE, colorbar: { thickness: 10, tickfont: { size: 9, color: '#6b7280' }, title: { text: 'dB', font: { size: 9, color: '#6b7280' } } }, showscale: true }] : []

  // Params rows
  const paramGroups = [
    {
      label: 'File Parameters',
      rows: [
        ['File Name',      fi.name,                              '',         'Uploaded signal file'],
        ['Format',         fi.type,                             '',          'Detected signal type'],
        ['File Size',      fi.size,                             '',          'Total file size'],
        ['Sample Rate',    fi.sampleRate.toLocaleString(),       'Hz',       'Samples per second'],
        ['Duration',       fi.duration.toFixed(6),              's',         'Signal duration'],
        ['Total Samples',  fi.totalSamples.toLocaleString(),    'samples',   'Sample count'],
        ...(fi.bitsPerSample ? [['Bit Depth', fi.bitsPerSample, 'bits', 'Amplitude resolution']] : []),
        ...(fi.numChannels  ? [['Channels',   fi.numChannels,   '',     'Audio channels']] : []),
        ...(fi.audioFormat  ? [['Audio Format',fi.audioFormat,  '',     'PCM encoding']] : []),
        ...(fi.dataType     ? [['IQ Data Type',fi.dataType,     '',     'Numeric type per sample']] : []),
      ]
    },
    {
      label: 'Signal Parameters',
      rows: [
        ['Mean',            st.mean.toFixed(8),         '',    'DC component'],
        ['Std Deviation',   st.std.toFixed(8),          '',    'Signal variability'],
        ['RMS',             st.rms.toFixed(8),          '',    'Root mean square'],
        ['Minimum',         st.min.toFixed(8),          '',    'Minimum sample value'],
        ['Maximum',         st.max.toFixed(8),          '',    'Maximum sample value'],
        ['Peak Amplitude',  st.peak.toFixed(8),         '',    'Maximum absolute amplitude'],
        ['Peak-to-Peak',    st.peakToPeak.toFixed(8),   '',    'Full amplitude swing'],
        ['ZCR',             r.zcr ? r.zcr.toFixed(3) : 'N/A', r.zcr ? 'Hz' : '', 'Zero-crossing rate'],
      ]
    },
    {
      label: 'Frequency Parameters',
      rows: [
        ['Dominant Frequency', fmtFreq(fr.dominantFreq),               '',       'Peak spectral component'],
        ['Freq Resolution',    fmtFreq(fr.freqResolution),              '',       'FFT bin spacing'],
        ['3 dB Bandwidth',     fr.bandwidth ? fmtFreq(fr.bandwidth) : 'N/A', '', 'Half-power bandwidth'],
        ['FFT Size',           fr.fftSize.toLocaleString(),             'pts',    'DFT window length'],
      ]
    },
    ...(fi.isIQ && r.statsI ? [{
      label: 'IQ Parameters',
      rows: [
        ['I Mean',      r.statsI.mean.toFixed(8),   '',  'In-phase mean'],
        ['I RMS',       r.statsI.rms.toFixed(8),    '',  'In-phase RMS'],
        ['I Peak',      r.statsI.peak.toFixed(8),   '',  'In-phase peak'],
        ['Q Mean',      r.statsQ.mean.toFixed(8),   '',  'Quadrature mean'],
        ['Q RMS',       r.statsQ.rms.toFixed(8),    '',  'Quadrature RMS'],
        ['Q Peak',      r.statsQ.peak.toFixed(8),   '',  'Quadrature peak'],
        ['Mag Mean',    r.statsMag.mean.toFixed(8), '',  'Magnitude average'],
        ['Mag RMS',     r.statsMag.rms.toFixed(8),  '',  'Magnitude RMS'],
        ['Phase Mean',  r.statsPhase.mean.toFixed(4),'°','Average phase'],
        ['Phase Std',   r.statsPhase.std.toFixed(4), '°','Phase variability'],
      ]
    }] : []),
  ]

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-base font-mono font-semibold text-white truncate max-w-md">{fi.name}</h2>
            <span className="flex items-center gap-1.5 text-[11px] text-green-400 border border-green-900/50 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Complete
            </span>
          </div>
          <p className="text-xs text-muted">{fi.type} · {fi.isIQ ? 'IQ Signal' : 'Audio / Signal'} · {new Date(r.timestamp).toLocaleString()}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => navigate('upload')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted border border-border rounded hover:border-faint hover:text-text transition-colors">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v7M2.5 4l3-3 3 3M1 10h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            New Analysis
          </button>
          <button onClick={() => navigate('report')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text border border-border rounded hover:border-faint transition-colors">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 1h7l1 1v8H1V1h1zm0 0v2h6V1M3 5h5M3 7h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Generate Report
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-6 gap-px bg-border border border-border rounded overflow-hidden mb-4">
        <SumCell label="Sample Rate"   value={srFmt}                      unit="Hz" />
        <SumCell label="Duration"      value={fi.duration.toFixed(3)}     unit="s" />
        <SumCell label="Samples"       value={fi.totalSamples >= 1e6 ? (fi.totalSamples/1e6).toFixed(2)+'M' : fi.totalSamples.toLocaleString()} unit="count" />
        <SumCell label="RMS"           value={st.rms.toFixed(4)}          unit="norm." />
        <SumCell label="Peak"          value={st.peak.toFixed(4)}         unit="norm." />
        <SumCell label="Dom. Freq"     value={dfFmt}                      unit={dfUnit} />
      </div>

      {/* Waveform */}
      <Section title="Time-Domain Waveform" meta={`${fi.totalSamples.toLocaleString()} samples · ${fi.sampleRate.toLocaleString()} Hz`}>
        <Chart id="chartWaveform" traces={waveTrace} height={190}
          layout={{ xaxis: { title: { text: 'Time (s)', font: { size: 9 } } }, yaxis: { title: { text: 'Amplitude', font: { size: 9 } } } }}
        />
      </Section>

      {/* Spectrum */}
      <Section title="Frequency Spectrum (FFT)" meta={`FFT ${fr.fftSize} pts · Δf = ${fmtFreq(fr.freqResolution)}`}>
        <Chart id="chartSpectrum" traces={specTrace} height={190}
          layout={{ xaxis: { title: { text: 'Frequency (Hz)', font: { size: 9 } } }, yaxis: { title: { text: 'Magnitude (dB)', font: { size: 9 } } } }}
        />
      </Section>

      {/* Spectrogram */}
      {v.spectrogram && (
        <Section title="Spectrogram (Time-Frequency)" meta="Hann window · 256-pt FFT">
          <Chart id="chartSpectrogram" traces={spectroTrace} height={210}
            layout={{ margin: { l: 46, r: 56, t: 10, b: 34 }, xaxis: { title: { text: 'Time (s)', font: { size: 9 } } }, yaxis: { title: { text: 'Frequency (Hz)', font: { size: 9 } } } }}
          />
        </Section>
      )}

      {/* IQ section */}
      {fi.isIQ && v.iqI && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { id: 'chartI',     y: v.iqI,     label: 'I Component',  color: '#3b82f6', unit: 'In-phase' },
              { id: 'chartQ',     y: v.iqQ,     label: 'Q Component',  color: '#8b5cf6', unit: 'Quadrature' },
              { id: 'chartMag',   y: v.iqMag,   label: 'Magnitude',    color: '#0ea5e9', unit: '|I+jQ|' },
              { id: 'chartPhase', y: v.iqPhase, label: 'Phase',        color: '#f59e0b', unit: 'Degrees (°)' },
            ].map(c => (
              <Section key={c.id} title={c.label}>
                <Chart id={c.id} traces={[{ x: v.waveformTime, y: c.y, type: 'scatter', mode: 'lines', line: { color: c.color, width: 1 } }]} height={150}
                  layout={{ margin: { l: 40, r: 10, t: 8, b: 30 }, xaxis: { title: { text: 'Time (s)', font: { size: 9 } } }, yaxis: { title: { text: c.unit, font: { size: 9 } } } }}
                />
              </Section>
            ))}
          </div>
          <Section title="I-Q Constellation" meta="In-phase vs Quadrature scatter">
            <Chart id="chartIQ" traces={[{ x: v.scatterI, y: v.scatterQ, type: 'scatter', mode: 'markers', marker: { color: '#3b82f6', size: 2, opacity: 0.45 } }]} height={280}
              layout={{ xaxis: { title: { text: 'I (In-phase)', font: { size: 9 } }, scaleanchor: 'y' }, yaxis: { title: { text: 'Q (Quadrature)', font: { size: 9 } } } }}
            />
          </Section>
        </>
      )}

      {/* Parameters table */}
      <div className="border border-border rounded bg-surface overflow-hidden mb-8">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="text-xs font-semibold text-text">Extracted Parameters</span>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-bg">
              <th className="text-left px-4 py-2 text-[10px] text-muted uppercase tracking-widest font-medium border-b border-border w-[36%]">Parameter</th>
              <th className="text-left px-4 py-2 text-[10px] text-muted uppercase tracking-widest font-medium border-b border-border w-[28%]">Value</th>
              <th className="text-left px-4 py-2 text-[10px] text-muted uppercase tracking-widest font-medium border-b border-border w-[10%]">Unit</th>
              <th className="text-left px-4 py-2 text-[10px] text-muted uppercase tracking-widest font-medium border-b border-border">Description</th>
            </tr>
          </thead>
          <tbody>
            {paramGroups.map(g => (
              <>
                <tr key={g.label} className="bg-bg/40">
                  <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border">{g.label}</td>
                </tr>
                {g.rows.map(([name, val, unit, desc]) => (
                  <tr key={name} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                    <td className="px-4 py-2 text-muted text-[13px]">{name}</td>
                    <td className="px-4 py-2 text-text font-mono text-[12px] font-medium">{val === 'N/A' ? <span className="text-muted/50 italic text-[12px]">N/A</span> : val}</td>
                    <td className="px-4 py-2 text-muted text-[12px]">{unit}</td>
                    <td className="px-4 py-2 text-muted/60 text-[11px]">{desc}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
