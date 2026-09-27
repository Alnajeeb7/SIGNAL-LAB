import { useState } from 'react'
import { useApp } from '../store.jsx'
import { fmtFreq } from '../dsp'
import { jsPDF } from 'jspdf'
import Plotly from 'plotly.js-dist'

export default function Report() {
  const { currentAnalysis, navigate } = useApp()
  const [downloading, setDownloading] = useState(false)

  if (!currentAnalysis) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-20 text-center">
        <p className="text-muted text-sm">No analysis loaded.</p>
        <button onClick={() => navigate('upload')} className="mt-4 px-4 py-2 text-sm text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors">Upload a file</button>
      </div>
    )
  }

  const r  = currentAnalysis
  const fi = r.fileInfo
  const st = r.stats
  const fr = r.frequency

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, H = 297
      const ml = 20, mr = 20, cw = W - ml - mr
      let y = 0

      // ── Colour palette (light theme — readable on white paper) ──────────
      const C = {
        navy:      [15,  30,  80 ],
        accent:    [37,  99,  235],
        accentDim: [219, 234, 254],
        black:     [10,  10,  10 ],
        label:     [80,  80,  100],
        muted:     [140, 140, 160],
        white:     [255, 255, 255],
        pageBg:    [250, 251, 253],
        sectionBg: [240, 244, 255],
        rowAlt:    [247, 249, 255],
        border:    [210, 218, 235],
      }

      const setFill   = (rgb) => doc.setFillColor(...rgb)
      const setStroke = (rgb) => doc.setDrawColor(...rgb)
      const setColor  = (rgb) => doc.setTextColor(...rgb)
      const setFont   = (style, size) => { doc.setFont('helvetica', style); if (size) doc.setFontSize(size) }

      // ── New page helper ─────────────────────────────────────────────────
      const newPage = () => {
        doc.addPage()
        setFill(C.pageBg); doc.rect(0, 0, W, H, 'F')
        setFill(C.navy);   doc.rect(0, 0, 5, H, 'F')
        y = 20
      }

      const checkPage = (need = 30) => { if (y + need > H - 18) newPage() }

      // ── Page 1 background ───────────────────────────────────────────────
      setFill(C.pageBg); doc.rect(0, 0, W, H, 'F')
      setFill(C.navy);   doc.rect(0, 0, 5, H, 'F')

      // ── Header band ─────────────────────────────────────────────────────
      setFill(C.navy); doc.rect(0, 0, W, 44, 'F')

      // logo mark
      setFill(C.accent); doc.roundedRect(8, 8, 7, 7, 1, 1, 'F')
      setFill(C.white)
      doc.rect(9.5,  11,   1.3, 3,   'F')
      doc.rect(11.6, 9.8,  1.3, 4.2, 'F')
      doc.rect(13.7, 11.5, 1.3, 2.5, 'F')

      setColor(C.white); setFont('bold', 17)
      doc.text('Signal Analysis Report', 19, 17)

      setColor([180, 195, 230]); setFont('normal', 8)
      doc.text('SignalLab  ·  Automated Parameter Extraction  ·  SIH26147', 19, 25)

      // timestamp pill
      setFill([30, 50, 110]); doc.roundedRect(W - mr - 56, 10, 58, 11, 2, 2, 'F')
      setColor([180, 200, 255]); setFont('normal', 7)
      doc.text(new Date(r.timestamp).toLocaleString(), W - mr - 27, 17, { align: 'center' })

      // status badge
      setFill([20, 83, 45]); doc.roundedRect(19, 30, 30, 8, 2, 2, 'F')
      setColor([134, 239, 172]); setFont('bold', 6.5)
      doc.text('● ANALYSIS COMPLETE', 34, 35, { align: 'center' })

      // file name
      setColor([200, 215, 255]); setFont('normal', 8)
      doc.text(fi.name, W - mr, 38, { align: 'right' })

      y = 54

      // ── Summary cards ───────────────────────────────────────────────────
      const srLabel = fi.sampleRate >= 1000 ? (fi.sampleRate / 1000).toFixed(1) + 'k' : String(fi.sampleRate)
      const cards = [
        { label: 'Sample Rate',  value: srLabel,                  unit: 'Hz'   },
        { label: 'Duration',     value: fi.duration.toFixed(3),   unit: 's'    },
        { label: 'RMS',          value: st.rms.toFixed(4),        unit: 'norm' },
        { label: 'Peak',         value: st.peak.toFixed(4),       unit: 'norm' },
        { label: 'Dom. Freq',    value: fmtFreq(fr.dominantFreq), unit: ''     },
        { label: 'FFT Size',     value: (fr.fftSize / 1024).toFixed(0) + 'k', unit: 'pts' },
      ]
      const cardW = cw / 6
      cards.forEach((c, i) => {
        const cx = ml + i * cardW
        setFill(C.white); setStroke(C.border); doc.setLineWidth(0.3)
        doc.roundedRect(cx, y, cardW - 1.5, 22, 2, 2, 'FD')
        setColor(C.accent); setFont('bold', 13)
        doc.text(c.value, cx + (cardW - 1.5) / 2, y + 10, { align: 'center' })
        setColor(C.muted); setFont('normal', 6)
        doc.text(c.unit,  cx + (cardW - 1.5) / 2, y + 15.5, { align: 'center' })
        doc.text(c.label, cx + (cardW - 1.5) / 2, y + 19.5, { align: 'center' })
      })
      y += 28

      // ── Section + row helpers ───────────────────────────────────────────
      const sectionHeader = (title) => {
        checkPage(16)
        setFill(C.sectionBg); doc.rect(ml, y, cw, 9, 'F')
        setFill(C.accent);    doc.rect(ml, y, 3, 9, 'F')
        setColor(C.navy); setFont('bold', 8)
        doc.text(title, ml + 7, y + 6.2)
        y += 13
      }

      let rowIdx = 0
      const startTable = () => { rowIdx = 0 }

      const tableRow = (label, value, unit = '') => {
        checkPage(7)
        if (rowIdx % 2 === 1) {
          setFill(C.rowAlt); doc.rect(ml, y - 0.5, cw, 6.8, 'F')
        }
        setColor(C.label); setFont('normal', 8.5)
        doc.text(String(label), ml + 4, y + 4.5)
        setColor(C.black); setFont('bold', 8.5)
        doc.text(String(value), W - mr - (unit ? 20 : 4), y + 4.5, { align: 'right' })
        if (unit) {
          setColor(C.muted); setFont('normal', 7.5)
          doc.text(unit, W - mr - 3, y + 4.5, { align: 'right' })
        }
        setStroke(C.border); doc.setLineWidth(0.15)
        doc.line(ml, y + 6.3, ml + cw, y + 6.3)
        y += 6.8
        rowIdx++
      }

      // ── File Information ────────────────────────────────────────────────
      sectionHeader('FILE INFORMATION')
      startTable()
      tableRow('File Name',     fi.name)
      tableRow('Format',        fi.type)
      tableRow('File Size',     fi.size)
      tableRow('Sample Rate',   fi.sampleRate.toLocaleString(), 'Hz')
      tableRow('Duration',      fi.duration.toFixed(6),         's')
      tableRow('Total Samples', fi.totalSamples.toLocaleString(), 'samples')
      if (fi.bitsPerSample) tableRow('Bit Depth',    fi.bitsPerSample, 'bits')
      if (fi.dataType)      tableRow('IQ Data Type', fi.dataType)
      y += 6

      // ── Signal Parameters ───────────────────────────────────────────────
      checkPage(70)
      sectionHeader('SIGNAL PARAMETERS')
      startTable()
      tableRow('Mean',           st.mean.toFixed(8))
      tableRow('Std Deviation',  st.std.toFixed(8))
      tableRow('RMS',            st.rms.toFixed(8))
      tableRow('Minimum',        st.min.toFixed(8))
      tableRow('Maximum',        st.max.toFixed(8))
      tableRow('Peak Amplitude', st.peak.toFixed(8))
      tableRow('Peak-to-Peak',   st.peakToPeak.toFixed(8))
      if (r.zcr) tableRow('Zero-Crossing Rate', r.zcr.toFixed(4), 'Hz')
      y += 6

      // ── Frequency Parameters ────────────────────────────────────────────
      checkPage(50)
      sectionHeader('FREQUENCY PARAMETERS')
      startTable()
      tableRow('Dominant Frequency',   fmtFreq(fr.dominantFreq))
      tableRow('Frequency Resolution', fmtFreq(fr.freqResolution))
      tableRow('3 dB Bandwidth',       fr.bandwidth ? fmtFreq(fr.bandwidth) : 'N/A')
      tableRow('FFT Size',             fr.fftSize.toLocaleString(), 'points')
      y += 6

      // ── IQ Parameters (if applicable) ───────────────────────────────────
      if (fi.isIQ && r.statsI) {
        checkPage(60)
        sectionHeader('IQ PARAMETERS')
        startTable()
        tableRow('I Component RMS',  r.statsI.rms.toFixed(8))
        tableRow('Q Component RMS',  r.statsQ.rms.toFixed(8))
        tableRow('Magnitude Mean',   r.statsMag.mean.toFixed(8))
        tableRow('Magnitude RMS',    r.statsMag.rms.toFixed(8))
        tableRow('Phase Mean',       r.statsPhase.mean.toFixed(4), '°')
        tableRow('Phase Std Dev',    r.statsPhase.std.toFixed(4),  '°')
        y += 6
      }

      // ── Processing Notes ────────────────────────────────────────────────
      checkPage(50)
      sectionHeader('PROCESSING NOTES')
      startTable()
      tableRow('FFT Window',            'Hann (von Hann)')
      tableRow('Spectrogram Window',    '256-pt Hann, overlapping frames')
      tableRow('Waveform Downsampling', 'Peak-envelope, max 8 000 pts')
      tableRow('Analysis Engine',       'SignalLab DSP (browser-native)')
      if (fi.isIQ) tableRow('IQ Convention', 'Interleaved I/Q, configurable dtype')
      y += 8

      // ── Charts ──────────────────────────────────────────────────────────
      const addChart = async (divId, title, h = 62) => {
        checkPage(h + 20)
        sectionHeader(title)
        try {
          const img = await Plotly.toImage(divId, { format: 'png', width: 900, height: 320, scale: 2 })
          setFill(C.white); setStroke(C.border); doc.setLineWidth(0.3)
          doc.roundedRect(ml, y, cw, h + 4, 2, 2, 'FD')
          doc.addImage(img, 'PNG', ml + 2, y + 2, cw - 4, h)
          y += h + 10
        } catch {
          setColor(C.muted); setFont('normal', 8)
          doc.text('Chart captured from live analysis view', ml + 4, y + 8)
          y += 14
        }
      }

      await addChart('chartWaveform', 'WAVEFORM')
      await addChart('chartSpectrum', 'FREQUENCY SPECTRUM (FFT)')
      if (r.viz.spectrogram) await addChart('chartSpectrogram', 'SPECTROGRAM', 70)
      if (fi.isIQ) await addChart('chartIQ', 'I-Q CONSTELLATION', 75)

      // ── Footer on every page ────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)
        setFill(C.navy); doc.rect(0, H - 12, W, 12, 'F')
        setColor([160, 180, 220]); setFont('normal', 6.5)
        doc.text('SignalLab  ·  SIH26147  ·  For research and evaluation use only', ml, H - 4.5)
        doc.text(`Page ${p} of ${totalPages}  ·  Generated ${new Date().toLocaleString()}`, W - mr, H - 4.5, { align: 'right' })
      }

      doc.save(`SignalLab_${fi.name.replace(/[^a-z0-9]/gi, '_')}.pdf`)
    } catch (e) {
      alert('PDF generation failed: ' + e.message)
    }
    setDownloading(false)
  }

  const Row = ({ label, value, unit }) => (
    <tr className="border-b border-border/40 hover:bg-border/10 transition-colors">
      <td className="py-2 text-muted text-[13px]">{label}</td>
      <td className="py-2 text-text font-mono text-[12px] font-medium text-right">
        {value}{unit ? <span className="text-muted text-[11px] ml-1">{unit}</span> : ''}
      </td>
    </tr>
  )

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('analysis')} className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Analysis
        </button>
        <button onClick={downloadPDF} disabled={downloading}
          className="flex items-center gap-2 px-4 py-1.5 bg-accent text-white text-xs font-medium rounded hover:bg-accent-dim transition-colors disabled:opacity-50">
          {downloading ? (
            <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 9h8M6 1v6M3.5 5l2.5 2.5L8.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>Download PDF</>
          )}
        </button>
      </div>

      <div className="border border-border rounded bg-surface overflow-hidden">
        <div className="border-b border-border px-6 py-5 flex items-start justify-between">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Signal Analysis Report</h1>
            <p className="text-xs text-muted mt-0.5">Automated parameter extraction · SIH26147</p>
          </div>
          <div className="text-right text-xs text-muted space-y-0.5">
            <div>{new Date(r.timestamp).toLocaleString()}</div>
            <div>SignalLab v1.0</div>
            <div className="text-[10px] text-muted/50">For research & evaluation use only</div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">File Information</p>
            <table className="w-full"><tbody>
              <Row label="File Name"     value={fi.name} />
              <Row label="Format"        value={fi.type} />
              <Row label="File Size"     value={fi.size} />
              <Row label="Sample Rate"   value={fi.sampleRate.toLocaleString()} unit="Hz" />
              <Row label="Duration"      value={fi.duration.toFixed(6)}         unit="s" />
              <Row label="Total Samples" value={fi.totalSamples.toLocaleString()} unit="samples" />
              {fi.bitsPerSample && <Row label="Bit Depth"    value={fi.bitsPerSample} unit="bits" />}
              {fi.dataType      && <Row label="IQ Data Type" value={fi.dataType} />}
            </tbody></table>
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">Signal Parameters</p>
            <table className="w-full"><tbody>
              <Row label="Mean"               value={st.mean.toFixed(8)} />
              <Row label="Standard Deviation" value={st.std.toFixed(8)} />
              <Row label="RMS"                value={st.rms.toFixed(8)} />
              <Row label="Minimum"            value={st.min.toFixed(8)} />
              <Row label="Maximum"            value={st.max.toFixed(8)} />
              <Row label="Peak Amplitude"     value={st.peak.toFixed(8)} />
              <Row label="Peak-to-Peak"       value={st.peakToPeak.toFixed(8)} />
              {r.zcr && <Row label="Zero-Crossing Rate" value={r.zcr.toFixed(4)} unit="Hz" />}
            </tbody></table>
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">Frequency Parameters</p>
            <table className="w-full"><tbody>
              <Row label="Dominant Frequency"   value={fmtFreq(fr.dominantFreq)} />
              <Row label="Frequency Resolution" value={fmtFreq(fr.freqResolution)} />
              <Row label="3 dB Bandwidth"       value={fr.bandwidth ? fmtFreq(fr.bandwidth) : 'N/A'} />
              <Row label="FFT Size"             value={fr.fftSize.toLocaleString()} unit="points" />
            </tbody></table>
          </div>

          {fi.isIQ && r.statsI && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">IQ Parameters</p>
              <table className="w-full"><tbody>
                <Row label="I Component RMS" value={r.statsI.rms.toFixed(8)} />
                <Row label="Q Component RMS" value={r.statsQ.rms.toFixed(8)} />
                <Row label="Magnitude Mean"  value={r.statsMag.mean.toFixed(8)} />
                <Row label="Magnitude RMS"   value={r.statsMag.rms.toFixed(8)} />
                <Row label="Phase Mean"      value={r.statsPhase.mean.toFixed(4)} unit="°" />
                <Row label="Phase Std Dev"   value={r.statsPhase.std.toFixed(4)}  unit="°" />
              </tbody></table>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">Processing Notes</p>
            <table className="w-full"><tbody>
              <Row label="FFT Window"            value="Hann (von Hann)" />
              <Row label="Spectrogram Window"    value="256-pt Hann, overlapping frames" />
              <Row label="Waveform Downsampling" value="Peak-envelope, max 8000 display pts" />
              {fi.isIQ && <Row label="IQ Convention" value="Interleaved I/Q, configurable dtype" />}
              <Row label="Analysis Engine"       value="SignalLab DSP (browser-native)" />
            </tbody></table>
          </div>
        </div>

        <div className="border-t border-border px-6 py-3 flex justify-between text-[10px] text-muted">
          <span>SignalLab · SIH Problem Statement SIH26147</span>
          <span>Generated {new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
