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

  const r = currentAnalysis
  const fi = r.fileInfo
  const st = r.stats
  const fr = r.frequency

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const ml = 18, mr = 18, W = 210, cw = W - ml - mr
      let y = 20

      // Header bar
      doc.setFillColor(8, 9, 13)
      doc.rect(0, 0, W, 28, 'F')
      doc.setTextColor(240, 242, 247)
      doc.setFontSize(13); doc.setFont('helvetica', 'bold')
      doc.text('Signal Analysis Report', ml, 13)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128)
      doc.text('SIH26147 · SignalLab', ml, 20)
      doc.text(new Date(r.timestamp).toLocaleString(), W - mr, 13, { align: 'right' })
      y = 36

      const section = (title) => {
        doc.setDrawColor(28, 31, 43); doc.line(ml, y, ml + cw, y); y += 2
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(107, 114, 128)
        doc.text(title.toUpperCase(), ml, y + 3); y += 8
        doc.setTextColor(240, 242, 247)
      }

      const row = (label, value) => {
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128)
        doc.text(String(label), ml, y)
        doc.setTextColor(240, 242, 247); doc.setFont('helvetica', 'bold')
        doc.text(String(value), ml + cw / 2, y); y += 5.5
      }

      const checkPage = (n = 30) => { if (y + n > 272) { doc.addPage(); doc.setFillColor(8,9,13); doc.rect(0,0,W,297,'F'); y = 20 } }

      // File info
      section('File Information')
      row('File Name', fi.name); row('Format', fi.type); row('File Size', fi.size)
      row('Sample Rate', fi.sampleRate.toLocaleString() + ' Hz'); row('Duration', fi.duration.toFixed(6) + ' s')
      row('Total Samples', fi.totalSamples.toLocaleString())
      if (fi.bitsPerSample) row('Bit Depth', fi.bitsPerSample + ' bits')
      if (fi.dataType) row('IQ Data Type', fi.dataType)
      y += 4

      checkPage()
      section('Signal Parameters')
      ;[['Mean', st.mean.toFixed(8)], ['Std Deviation', st.std.toFixed(8)], ['RMS', st.rms.toFixed(8)],
        ['Minimum', st.min.toFixed(8)], ['Maximum', st.max.toFixed(8)],
        ['Peak Amplitude', st.peak.toFixed(8)], ['Peak-to-Peak', st.peakToPeak.toFixed(8)],
        ...(r.zcr ? [['ZCR', r.zcr.toFixed(4) + ' Hz']] : [])
      ].forEach(([l, v]) => row(l, v))
      y += 4

      checkPage()
      section('Frequency Parameters')
      row('Dominant Frequency', fmtFreq(fr.dominantFreq))
      row('Frequency Resolution', fmtFreq(fr.freqResolution))
      row('3 dB Bandwidth', fr.bandwidth ? fmtFreq(fr.bandwidth) : 'N/A')
      row('FFT Size', fr.fftSize.toLocaleString() + ' points')
      y += 4

      if (fi.isIQ && r.statsI) {
        checkPage()
        section('IQ Parameters')
        ;[['I RMS', r.statsI.rms.toFixed(8)], ['Q RMS', r.statsQ.rms.toFixed(8)],
          ['Magnitude Mean', r.statsMag.mean.toFixed(8)], ['Magnitude RMS', r.statsMag.rms.toFixed(8)],
          ['Phase Mean', r.statsPhase.mean.toFixed(4) + ' °'], ['Phase Std', r.statsPhase.std.toFixed(4) + ' °']
        ].forEach(([l, v]) => row(l, v))
        y += 4
      }

      // Embed charts
      const addChart = async (divId, title, h = 55) => {
        checkPage(h + 12)
        section(title)
        try {
          const img = await Plotly.toImage(divId, { format: 'png', width: 800, height: 260, scale: 2 })
          doc.addImage(img, 'PNG', ml, y, cw, h); y += h + 4
        } catch (e) { row('Chart', 'Could not capture — view in application'); y += 2 }
      }

      await addChart('chartWaveform', 'Waveform')
      await addChart('chartSpectrum', 'Frequency Spectrum')
      if (r.viz.spectrogram) await addChart('chartSpectrogram', 'Spectrogram')
      if (fi.isIQ) await addChart('chartIQ', 'I-Q Constellation')

      // Footer
      checkPage(12)
      doc.setDrawColor(28, 31, 43); doc.line(ml, y, ml + cw, y); y += 5
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128)
      doc.text('SignalLab · SIH26147 · For research and evaluation use only', ml, y)
      doc.text('Generated: ' + new Date().toLocaleString(), W - mr, y, { align: 'right' })

      doc.save(`SignalLab_${fi.name.replace(/[^a-z0-9]/gi, '_')}.pdf`)
    } catch (e) {
      alert('PDF generation failed: ' + e.message)
    }
    setDownloading(false)
  }

  const Row = ({ label, value, unit }) => (
    <tr className="border-b border-border/40 hover:bg-border/10 transition-colors">
      <td className="py-2 text-muted text-[13px]">{label}</td>
      <td className="py-2 text-text font-mono text-[12px] font-medium text-right">{value}{unit ? <span className="text-muted text-[11px] ml-1">{unit}</span> : ''}</td>
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

      {/* Report document */}
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
            <div className="text-[10px] text-muted/50">For research & evaluation use only</div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* File info */}
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">File Information</p>
            <table className="w-full">
              <tbody>
                <Row label="File Name"    value={fi.name} />
                <Row label="Format"       value={fi.type} />
                <Row label="File Size"    value={fi.size} />
                <Row label="Sample Rate"  value={fi.sampleRate.toLocaleString()} unit="Hz" />
                <Row label="Duration"     value={fi.duration.toFixed(6)}         unit="s" />
                <Row label="Total Samples" value={fi.totalSamples.toLocaleString()} unit="samples" />
                {fi.bitsPerSample && <Row label="Bit Depth" value={fi.bitsPerSample} unit="bits" />}
                {fi.dataType && <Row label="IQ Data Type" value={fi.dataType} />}
              </tbody>
            </table>
          </div>

          {/* Signal params */}
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">Signal Parameters</p>
            <table className="w-full">
              <tbody>
                <Row label="Mean"            value={st.mean.toFixed(8)} />
                <Row label="Standard Deviation" value={st.std.toFixed(8)} />
                <Row label="RMS"             value={st.rms.toFixed(8)} />
                <Row label="Minimum"         value={st.min.toFixed(8)} />
                <Row label="Maximum"         value={st.max.toFixed(8)} />
                <Row label="Peak Amplitude"  value={st.peak.toFixed(8)} />
                <Row label="Peak-to-Peak"    value={st.peakToPeak.toFixed(8)} />
                {r.zcr && <Row label="Zero-Crossing Rate" value={r.zcr.toFixed(4)} unit="Hz" />}
              </tbody>
            </table>
          </div>

          {/* Frequency */}
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">Frequency Parameters</p>
            <table className="w-full">
              <tbody>
                <Row label="Dominant Frequency"  value={fmtFreq(fr.dominantFreq)} />
                <Row label="Frequency Resolution" value={fmtFreq(fr.freqResolution)} />
                <Row label="3 dB Bandwidth"       value={fr.bandwidth ? fmtFreq(fr.bandwidth) : 'N/A'} />
                <Row label="FFT Size"             value={fr.fftSize.toLocaleString()} unit="points" />
              </tbody>
            </table>
          </div>

          {/* IQ */}
          {fi.isIQ && r.statsI && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">IQ Parameters</p>
              <table className="w-full">
                <tbody>
                  <Row label="I Component RMS"  value={r.statsI.rms.toFixed(8)} />
                  <Row label="Q Component RMS"  value={r.statsQ.rms.toFixed(8)} />
                  <Row label="Magnitude Mean"   value={r.statsMag.mean.toFixed(8)} />
                  <Row label="Magnitude RMS"    value={r.statsMag.rms.toFixed(8)} />
                  <Row label="Phase Mean"       value={r.statsPhase.mean.toFixed(4)} unit="°" />
                  <Row label="Phase Std Dev"    value={r.statsPhase.std.toFixed(4)}  unit="°" />
                </tbody>
              </table>
            </div>
          )}

          {/* Processing notes */}
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 pb-1.5 border-b border-border">Processing Notes</p>
            <table className="w-full">
              <tbody>
                <Row label="FFT Window"             value="Hann (von Hann)" />
                <Row label="Spectrogram Window"     value="256-pt Hann, overlapping frames" />
                <Row label="Waveform Downsampling"  value="Peak-envelope, max 8000 display pts" />
                {fi.isIQ && <Row label="IQ Convention" value="Interleaved I/Q, configurable dtype" />}
                <Row label="Analysis Engine"        value="SignalLab DSP (browser-native)" />
              </tbody>
            </table>
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
