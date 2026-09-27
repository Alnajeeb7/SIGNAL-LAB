import { useEffect, useRef } from 'react'

const DARK_LAYOUT = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { family: "'Inter', sans-serif", size: 10, color: '#6b7280' },
  xaxis: { gridcolor: '#1c1f2b', linecolor: '#1c1f2b', zerolinecolor: '#1c1f2b', tickfont: { size: 9, color: '#6b7280' } },
  yaxis: { gridcolor: '#1c1f2b', linecolor: '#1c1f2b', zerolinecolor: '#1c1f2b', tickfont: { size: 9, color: '#6b7280' } },
  margin: { l: 46, r: 14, t: 10, b: 34 },
  showlegend: false,
}

const CONFIG = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
  toImageButtonOptions: { format: 'png', scale: 2 },
}

export default function Chart({ id, traces, layout = {}, height = 180 }) {
  const ref = useRef(null)
  const ready = useRef(false)

  useEffect(() => {
    let cancelled = false
    import('plotly.js-dist').then(Plotly => {
      if (cancelled) return
      const el = document.getElementById(id)
      if (!el) return
      const merged = { ...DARK_LAYOUT, ...layout,
        xaxis: { ...DARK_LAYOUT.xaxis, ...(layout.xaxis || {}) },
        yaxis: { ...DARK_LAYOUT.yaxis, ...(layout.yaxis || {}) },
        margin: { ...DARK_LAYOUT.margin, ...(layout.margin || {}) },
      }
      if (ready.current) {
        Plotly.react(el, traces, merged, CONFIG)
      } else {
        Plotly.newPlot(el, traces, merged, CONFIG)
        ready.current = true
      }
    })
    return () => { cancelled = true }
  }, [id, traces, layout])

  return <div id={id} style={{ height, width: '100%' }} />
}
