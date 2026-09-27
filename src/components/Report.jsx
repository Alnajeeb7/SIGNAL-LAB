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
        <button onClick={() => navigate('upload')} className="mt-4 px-4 py-2 text-sm text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors">
          Upload a file
        </button>
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
      const ml = 18, mr = 18, cw = W - ml - mr
      let y = 0

      // ── Palette ──────────────────────────────────────────────────────────
      const C = {
        navy:      [12,  25,  70 ],
        navyLight: [22,  45,  110],
        accent:    [37,  99,  235],
        accentBg:  [239, 246, 255],
        black:     [15,  15,  20 ],
        label:     [75,  85,  105],
        muted:     [148, 155, 175],
        white:     [255, 255, 255],
        pageBg:    [248, 250, 253],
        sectionBg: [237, 243, 255],
        rowEven:   [255, 255, 255],
        rowOdd:    [246, 249, 255],
        border:    [208, 218, 238],
        green:     [21,  128, 61 ],
        greenBg:   [18,  70,  38 ],
        greenText: [134, 239, 172],
      }

      const rgb   = (c) => c
      const fill  = (c) => doc.setFillColor(...rgb(c))
      const stroke= (c) => doc.setDrawColor(...rgb(c))
      const color = (c) => doc.setTextColor(...rgb(c))
      const font  = (style, size) => { doc.setFont('helvetica', style); if (size !== undefined) doc.setFontSize(size) }
      const lw    = (w) => doc.setLineWidth(w)

      // ── Page setup helper ────────────────────────────────────────────────
      const setupPage = () => {
        fill(C.pageBg); doc.rect(0, 0, W, H, 'F')
        // left accent bar
        fill(C.accent); doc.rect(0, 0, 4, H, 'F')
        // subtle top rule under header area (set later)
      }

      const newPage = () => {
        doc.addPage()
        setupPage()
        // mini header on continuation pages
        fill(C.navy); doc.rect(0, 0, W, 14, 'F')
        color(C.white); font('bold', 8)
        doc.text('SignalLab  ·  Signal Analysis Report', 9, 9.5)
        color([160, 185, 230]); font('normal', 7)
        doc.text(fi.name, W - mr, 9.5, { align: 'right' })
        y = 22
      }

      const checkPage = (need = 30) => { if (y + need > H - 16) newPage() }

      // ── PAGE 1 ───────────────────────────────────────────────────────────
      setupPage()

      // Header band
      fill(C.navy); doc.rect(0, 0, W, 50, 'F')

      // Accent gradient strip across top of header
      fill(C.accent); doc.rect(0, 0, W, 3, 'F')

      // Logo mark
      fill([255, 255, 255]); doc.roundedRect(8, 10, 9, 9, 1.5, 1.5, 'F')
      fill(C.accent)
      doc.rect(9.5,  14,   1.5, 3.5, 'F')
      doc.rect(11.8, 12.5, 1.5, 5,   'F')
      doc.rect(14.1, 15,   1.5, 2.5, 'F')

      color(C.white); font('bold', 18)
      doc.text('Signal Analysis Report', 21, 19)

      color([170, 190, 235]); font('normal', 8.5)
      doc.text('SignalLab  ·  Automated Parameter Extraction  ·  SIH26147', 21, 27)

      // Timestamp pill (top right)
      fill(C.navyLight); doc.roundedRect(W - mr - 62, 11, 64, 10, 2, 2, 'F')
      color([190, 210, 255]); font('normal', 7)
      doc.text(new Date(r.timestamp).toLocaleString(), W - mr - 30, 17.5, { align: 'center' })

      // Status badge
      fill(C.greenBg); doc.roundedRect(21, 32, 34, 8, 2, 2, 'F')
      color(C.greenText); font('bold', 6.5)
      doc.text('●  ANALYSIS COMPLETE', 38, 37.2, { align: 'center' })

      // File name chip (top right, below timestamp)
      color([200, 218, 255]); font('normal', 7.5)
      doc.text(fi.name, W - mr, 36, { align: 'right' })

      // Version
      color([100, 130, 190]); font('normal', 6.5)
      doc.text('SignalLab v1.0  ·  For research and evaluation use only', W - mr, 44, { align: 'right' })

      y = 60

      // ── Summary metric cards ─────────────────────────────────────────────
      const srLabel = fi.sampleRate >= 1e6
        ? (fi.sampleRate / 1e6).toFixed(2) + ' M'
        : fi.sampleRate >= 1000
          ? (fi.sampleRate / 1000).toFixed(1) + ' k'
          : String(fi.sampleRate)

      const domFreqLabel = fr.dominantFreq >= 1e6
        ? (fr.dominantFreq / 1e6).toFixed(3) + ' M'
        : fr.dominantFreq >= 1000
          ? (fr.dominantFreq / 1000).toFixed(2) + ' k'
          : fr.dominantFreq.toFixed(1)

      const cards = [
        { label: 'Sample Rate',  value: srLabel,                   unit: 'Hz'   },
        { label: 'Duration',     value: fi.duration.toFixed(3),    unit: 's'    },
        { label: 'Total Samples',value: fi.totalSamples >= 1e6 ? (fi.totalSamples/1e6).toFixed(2)+'M' : fi.totalSamples.toLocaleString(), unit: '' },
        { label: 'RMS',          value: st.rms.toFixed(4),         unit: 'norm' },
        { label: 'Peak',         value: st.peak.toFixed(4),        unit: 'norm' },
        { label: 'Dom. Freq',    value: domFreqLabel,              unit: 'Hz'   },
      ]

      const cardW  = cw / 3
      const cardH  = 24
      const cardGap = 1.5

      // Row 1: 3 cards
      ;[0, 1, 2].forEach(i => {
        const cx = ml + i * (cardW + cardGap / 2)
        fill(C.white); stroke(C.border); lw(0.25)
        doc.roundedRect(cx, y, cardW - cardGap / 2, cardH, 2.5, 2.5, 'FD')
        // top accent line
        fill(C.accent); doc.rect(cx, y, cardW - cardGap / 2, 2, 'F')
        color(C.accent); font('bold', 15)
        doc.text(cards[i].value, cx + (cardW - cardGap / 2) / 2, y + 13, { align: 'center' })
        color(C.muted); font('normal', 6)
        doc.text(cards[i].unit,  cx + (cardW - cardGap / 2) / 2, y + 18, { align: 'center' })
        doc.text(cards[i].label, cx + (cardW - cardGap / 2) / 2, y + 21.5, { align: 'center' })
      })

      // Row 2: 3 cards
      y += cardH + 3
      ;[3, 4, 5].forEach(i => {
        const cx = ml + (i - 3) * (cardW + cardGap / 2)
        fill(C.white); stroke(C.border); lw(0.25)
        doc.roundedRect(cx, y, cardW - cardGap / 2, cardH, 2.5, 2.5, 'FD')
        fill(C.accentBg); doc.rect(cx, y, cardW - cardGap / 2, 2, 'F')
        color(C.navy); font('bold', 15)
        doc.text(cards[i].value, cx + (cardW - cardGap / 2) / 2, y + 13, { align: 'center' })
        color(C.muted); font('normal', 6)
        doc.text(cards[i].unit,  cx + (cardW - cardGap / 2) / 2, y + 18, { align: 'center' })
        doc.text(cards[i].label, cx + (cardW - cardGap / 2) / 2, y + 21.5, { align: 'center' })
      })

      y += cardH + 10

      // ── Section / table helpers ──────────────────────────────────────────
      const sectionHeader = (title, subtitle = '') => {
        checkPage(18)
        // background band
        fill(C.sectionBg); doc.rect(ml, y, cw, 10, 'F')
        // left accent bar
        fill(C.accent); doc.rect(ml, y, 3, 10, 'F')
        // bottom border
        stroke(C.border); lw(0.3); doc.line(ml, y + 10, ml + cw, y + 10)
        color(C.navy); font('bold', 8.5)
        doc.text(title, ml + 7, y + 7)
        if (subtitle) {
          color(C.muted); font('normal', 7)
          doc.text(subtitle, W - mr, y + 7, { align: 'right' })
        }
        y += 14
      }

      let rowIdx = 0
      const startTable = () => { rowIdx = 0 }

      const tableRow = (label, value, unit = '') => {
        checkPage(8)
        const rowH = 7.5
        fill(rowIdx % 2 === 0 ? C.rowEven : C.rowOdd)
        doc.rect(ml, y, cw, rowH, 'F')
        // subtle row border
        stroke(C.border); lw(0.1)
        doc.line(ml, y + rowH, ml + cw, y + rowH)
        // label
        color(C.label); font('normal', 8)
        doc.text(String(label), ml + 4, y + 5.2)
        // value
        color(C.black); font('bold', 8)
        const valStr = String(value)
        doc.text(valStr, W - mr - (unit ? 22 : 4), y + 5.2, { align: 'right' })
        // unit
        if (unit) {
          color(C.muted); font('normal', 7)
          doc.text(unit, W - mr - 3, y + 5.2, { align: 'right' })
        }
        y += rowH
        rowIdx++
      }

      // ── Chart helper ─────────────────────────────────────────────────────
      const addChart = async (divId, title, subtitle = '', chartH = 68) => {
        checkPage(chartH + 24)
        sectionHeader(title, subtitle)
        try {
          const imgData = await Plotly.toImage(document.getElementById(divId), {
            format: 'png', width: 1000, height: 380, scale: 2,
          })
          // card shadow effect
          fill([220, 228, 245]); doc.roundedRect(ml + 0.8, y + 0.8, cw, chartH + 4, 2, 2, 'F')
          // chart card
          fill(C.white); stroke(C.border); lw(0.3)
          doc.roundedRect(ml, y, cw, chartH + 4, 2, 2, 'FD')
          doc.addImage(imgData, 'PNG', ml + 2, y + 2, cw - 4, chartH)
          y += chartH + 12
        } catch {
          fill(C.rowOdd); doc.rect(ml, y, cw, 14, 'F')
          color(C.muted); font('normal', 8)
          doc.text('⚠  Chart not available — open the Analysis view to capture live graphs.', ml + 4, y + 9)
          y += 18
        }
      }

      // ── FILE INFORMATION ─────────────────────────────────────────────────
      sectionHeader('FILE INFORMATION')
      startTable()
      tableRow('File Name',     fi.name)
      tableRow('Format',        fi.type)
      tableRow('File Size',     fi.size)
      tableRow('Sample Rate',   fi.sampleRate.toLocaleString(), 'Hz')
      tableRow('Duration',      fi.duration.toFixed(6),         's')
      tableRow('Total Samples', fi.totalSamples.toLocaleString(), 'samples')
      if (fi.bitsPerSample) tableRow('Bit Depth',    fi.bitsPerSample, 'bits')
      if (fi.numChannels)   tableRow('Channels',     fi.numChannels)
      if (fi.audioFormat)   tableRow('Audio Format', fi.audioFormat)
      if (fi.dataType)      tableRow('IQ Data Type', fi.dataType)
      y += 8

      // ── SIGNAL PARAMETERS ────────────────────────────────────────────────
      checkPage(80)
      sectionHeader('SIGNAL PARAMETERS')
      startTable()
      tableRow('Mean',               st.mean.toFixed(8))
      tableRow('Standard Deviation', st.std.toFixed(8))
      tableRow('RMS',                st.rms.toFixed(8))
      tableRow('Minimum',            st.min.toFixed(8))
      tableRow('Maximum',            st.max.toFixed(8))
      tableRow('Peak Amplitude',     st.peak.toFixed(8))
      tableRow('Peak-to-Peak',       st.peakToPeak.toFixed(8))
      if (r.zcr) tableRow('Zero-Crossing Rate', r.zcr.toFixed(4), 'Hz')
      y += 8

      // ── FREQUENCY PARAMETERS ─────────────────────────────────────────────
      checkPage(50)
      sectionHeader('FREQUENCY PARAMETERS')
      startTable()
      tableRow('Dominant Frequency',   fmtFreq(fr.dominantFreq))
      tableRow('Frequency Resolution', fmtFreq(fr.freqResolution))
      tableRow('3 dB Bandwidth',       fr.bandwidth ? fmtFreq(fr.bandwidth) : 'N/A')
      tableRow('FFT Size',             fr.fftSize.toLocaleString(), 'points')
      y += 8

      // ── IQ PARAMETERS ────────────────────────────────────────────────────
      if (fi.isIQ && r.statsI) {
        checkPage(65)
        sectionHeader('IQ PARAMETERS')
        startTable()
        tableRow('I Component RMS',  r.statsI.rms.toFixed(8))
        tableRow('Q Component RMS',  r.statsQ.rms.toFixed(8))
        tableRow('Magnitude Mean',   r.statsMag.mean.toFixed(8))
        tableRow('Magnitude RMS',    r.statsMag.rms.toFixed(8))
        tableRow('Phase Mean',       r.statsPhase.mean.toFixed(4), '°')
        tableRow('Phase Std Dev',    r.statsPhase.std.toFixed(4),  '°')
        y += 8
      }

      // ── PROCESSING NOTES ─────────────────────────────────────────────────
      checkPage(55)
      sectionHeader('PROCESSING NOTES')
      startTable()
      tableRow('FFT Window',            'Hann (von Hann)')
      tableRow('Spectrogram Window',    '256-pt Hann, overlapping frames')
      tableRow('Waveform Downsampling', 'Peak-envelope, max 8 000 pts')
      tableRow('Analysis Engine',       'SignalLab DSP (browser-native)')
      if (fi.isIQ) tableRow('IQ Convention', 'Interleaved I/Q, configurable dtype')
      y += 10

      // ── GRAPHS ───────────────────────────────────────────────────────────
      await addChart(
        'chartWaveform',
        'TIME-DOMAIN WAVEFORM',
        `${fi.totalSamples.toLocaleString()} samples  ·  ${fi.sampleRate.toLocaleString()} Hz`,
        68
      )

      await addChart(
        'chartSpectrum',
        'FREQUENCY SPECTRUM (FFT)',
        `FFT ${fr.fftSize} pts  ·  Δf = ${fmtFreq(fr.freqResolution)}`,
        68
      )

      if (r.viz && r.viz.spectrogram) {
        await addChart(
          'chartSpectrogram',
          'SPECTROGRAM (TIME-FREQUENCY)',
          'Hann window  ·  256-pt FFT',
          72
        )
      }

      if (fi.isIQ && r.viz && r.viz.iqI) {
        await addChart('chartI',   'IQ — I COMPONENT',   'In-phase',      58)
        await addChart('chartQ',   'IQ — Q COMPONENT',   'Quadrature',    58)
        await addChart('chartMag', 'IQ — MAGNITUDE',     '|I + jQ|',      58)
        await addChart('chartIQ',  'IQ — CONSTELLATION', 'I vs Q scatter', 72)
      }

      // ── FOOTER on every page ─────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)
        // footer band
        fill(C.navy); doc.rect(0, H - 13, W, 13, 'F')
        fill(C.accent); doc.rect(0, H - 13, W, 1.5, 'F')
        color([155, 178, 225]); font('normal', 6.5)
        doc.text(
          'SignalLab  ·  SIH Problem Statement SIH26147  ·  For research and evaluation use only',
          9, H - 5.5
        )
        color([200, 215, 255]); font('bold', 6.5)
        doc.text(`Page ${p} / ${totalPages}`, W - mr, H - 5.5, { align: 'right' })
      }

      doc.save(`SignalLab_${fi.name.replace(/[^a-z0-9]/gi, '_')}.pdf`)
    } catch (e) {
      alert('PDF generation failed: ' + e.message)
    }
    setDownloading(false)
  }

  // ── Web UI ────────────────────────────────────────────────────────────────
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
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('analysis')}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Analysis
        </button>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-1.5 bg-accent text-white text-xs font-medium rounded hover:bg-accent-dim transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <>
              <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 9h8M6 1v6M3.5 5l2.5 2.5L8.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>

      {/* Report preview card */}
      <div className="border border-border rounded bg-surface overflow-hidden">
        {/* Doc header */}
        <div className="border-b border-border px-6 py-5 flex items-start justify-between">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Signal Analysis Report</h1>
            <p className="text-xs text-muted mt-0.5">Automated parameter extraction · SIH26147</p>
          </div>
          <div className="text-right text-xs text-muted space-y-0.5">
            <div>{new Date(r.timestamp).toLocaleString()}</div>
            <div>SignalLab v1.0</div>
            <div className="text-[10px] text-muted/50">For research &amp; evaluation use only</div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* File info */}
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

          {/* Signal params */}
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

          {/* Frequency */}
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">Frequency Parameters</p>
            <table className="w-full"><tbody>
              <Row label="Dominant Frequency"   value={fmtFreq(fr.dominantFreq)} />
              <Row label="Frequency Resolution" value={fmtFreq(fr.freqResolution)} />
              <Row label="3 dB Bandwidth"       value={fr.bandwidth ? fmtFreq(fr.bandwidth) : 'N/A'} />
              <Row label="FFT Size"             value={fr.fftSize.toLocaleString()} unit="points" />
            </tbody></table>
          </div>

          {/* IQ */}
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

          {/* Processing notes */}
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

          {/* Graphs note */}
          <div className="border border-accent/20 rounded bg-accent/5 px-4 py-3">
            <p className="text-xs text-accent font-medium mb-0.5">Graphs included in PDF</p>
            <p className="text-[11px] text-muted">
              The downloaded PDF will include live captures of the Time-Domain Waveform, FFT Spectrum
              {r.viz?.spectrogram ? ', Spectrogram' : ''}
              {fi.isIQ ? ', and IQ charts (I, Q, Magnitude, Constellation)' : ''} from your current analysis session.
            </p>
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
